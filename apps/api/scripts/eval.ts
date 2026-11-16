import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { sql } from "../src/db.js";
import { pgmqQueue } from "../src/lib/queue.js";
import { getProvider } from "../src/modules/ai/index.js";
import { makeIngestProcessor } from "../src/modules/ai/ingest.js";
import { askQuestion } from "../src/modules/ai/service.js";
import { runOnce } from "../src/modules/ai/worker-loop.js";

interface EvalCase {
  id: string;
  askAs: "alice" | "bob";
  question: string;
  expect:
    | { kind: "answer"; memoryTitles: string[]; mustInclude: string[] }
    | { kind: "unknown" }
    | { kind: "noLeak"; forbiddenTitles: string[] };
}

const provider = getProvider();

// drain the queue so all seed memories have embeddings
let handled = 1;
while (handled > 0) {
  handled = await runOnce({ queue: pgmqQueue, processor: makeIngestProcessor(provider) });
}

// resolve user ids and space
const [aliceProfile] = await sql`
  select u.id as user_id, sm.space_id
  from auth.users u
  join space_memberships sm on sm.user_id = u.id and sm.role = 'owner'
  where u.email = 'alice@test.local'
  limit 1
`;
const [bobProfile] = await sql`
  select u.id as user_id from auth.users u where u.email = 'bob@test.local' limit 1
`;

if (!aliceProfile || !bobProfile) {
  console.error("Seed users not found. Run: pnpm db:reset");
  process.exit(1);
}

const spaceId = aliceProfile.spaceId as string;
const userIds = {
  alice: aliceProfile.userId as string,
  bob: bobProfile.userId as string,
};

const questions: EvalCase[] = JSON.parse(
  readFileSync(new URL("../eval/questions.json", import.meta.url), "utf8"),
);

type ResultRow = {
  id: string;
  question: string;
  pass: boolean;
  reason: string;
  found: boolean;
  sources: string[];
};

const results: ResultRow[] = [];

for (const q of questions) {
  const userId = userIds[q.askAs];
  const response = await askQuestion(provider, userId!, spaceId, q.question);
  const sourceTitles = response.sources.map((s) => s.title);

  let pass = false;
  let reason = "";

  if (q.expect.kind === "answer") {
    const titlesOk =
      q.expect.memoryTitles.length === 0 ||
      q.expect.memoryTitles.some((t) => sourceTitles.some((st) => st.includes(t)));
    const mustOk = q.expect.mustInclude.every((m) =>
      response.answer.toLowerCase().includes(m.toLowerCase()),
    );
    pass = response.found && titlesOk && mustOk;
    reason = pass ? "ok" : `found=${response.found} titlesOk=${titlesOk} mustOk=${mustOk}`;
  } else if (q.expect.kind === "unknown") {
    pass = !response.found;
    reason = pass ? "ok" : `expected found=false, got found=true`;
  } else if (q.expect.kind === "noLeak") {
    const leaked = q.expect.forbiddenTitles.filter((t) =>
      sourceTitles.some((st) => st.includes(t)),
    );
    pass = leaked.length === 0;
    reason = pass ? "ok" : `leaked: ${leaked.join(", ")}`;
  }

  results.push({ id: q.id, question: q.question, pass, reason, found: response.found, sources: sourceTitles });
}

console.table(results.map((r) => ({ id: r.id, pass: r.pass ? "✓" : "✗", reason: r.reason })));

const passed = results.filter((r) => r.pass).length;
const total = results.length;
const pct = Math.round((passed / total) * 100);
console.log(`\nScore: ${passed}/${total} (${pct}%)`);

mkdirSync(new URL("../eval/results", import.meta.url), { recursive: true });
writeFileSync(
  new URL(`../eval/results/${new Date().toISOString().slice(0, 10)}.json`, import.meta.url),
  JSON.stringify({ score: `${passed}/${total}`, pct, results }, null, 2),
);

await sql.end();

if (pct < 90) {
  console.error("Score below 90% threshold");
  process.exit(1);
}

import { logger } from "../../logger.js";
import { AppError } from "../../lib/errors.js";
import type { ChatResponse } from "@rm/shared";
import { requireMembership } from "../relationship/service.js";
import { answerSchema } from "./answer.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import type { LLMProvider } from "./provider.js";
import { retrieveVisibleChunks } from "./retrieval.js";

export async function askQuestion(
  provider: LLMProvider,
  userId: string,
  spaceId: string,
  question: string,
): Promise<ChatResponse> {
  await requireMembership(userId, spaceId);

  const [queryVector] = await provider.embed([question]);
  const chunks = await retrieveVisibleChunks(userId, spaceId, queryVector!);

  if (chunks.length === 0) {
    return { answer: "Mình không tìm thấy memory nào về điều này.", found: false, sources: [] };
  }

  const start = Date.now();
  const raw = await provider.generate(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(question, chunks) },
    ],
    { json: true },
  );

  let parsed: { answer: string; found: boolean; sourceIds: string[] };
  try {
    parsed = answerSchema.parse(JSON.parse(raw));
  } catch {
    throw new AppError(502, "AI_BAD_RESPONSE", "AI returned invalid response");
  }

  const chunkMemoryIds = new Set(chunks.map((c) => c.memoryId));
  const sourceMap = new Map(chunks.map((c) => [c.memoryId, c]));
  const sources = [...new Set(parsed.sourceIds.filter((id) => chunkMemoryIds.has(id)))].map(
    (id) => {
      const c = sourceMap.get(id)!;
      return { memoryId: id, title: c.title, eventDate: c.eventDate };
    },
  );

  if (parsed.found && sources.length === 0) {
    logger.warn({ spaceId, question: "[redacted]" }, "AI returned found=true but no valid sources");
  }

  logger.info({
    spaceId,
    chunksFound: chunks.length,
    found: parsed.found,
    durationMs: Date.now() - start,
  }, "AI chat completed");

  return { answer: parsed.answer, found: parsed.found, sources };
}

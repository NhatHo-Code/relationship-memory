import { createClient } from "@supabase/supabase-js";
import { config } from "../src/config.js";
import { sql } from "../src/db.js";

const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function createUser(email: string, displayName: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

async function main() {
  // Clean up existing test users
  const existing = await admin.auth.admin.listUsers();
  for (const u of existing.data.users) {
    if (u.email?.endsWith("@test.local")) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }

  const alice = await createUser("alice@test.local", "Alice");
  const bob = await createUser("bob@test.local", "Bob");
  const carol = await createUser("carol@test.local", "Carol");

  await sql.begin(async (tx) => {
    // Space for Alice & Bob
    const [space] = await tx`
      insert into relationship_spaces (name, created_by)
      values ('Alice & Bob', ${alice})
      returning id
    `;
    const spaceId = space.id as string;

    await tx`
      insert into space_memberships (space_id, user_id, role) values
      (${spaceId}, ${alice}, 'owner'),
      (${spaceId}, ${bob}, 'partner')
    `;

    // Space for Carol
    const [carolSpace] = await tx`
      insert into relationship_spaces (name, created_by)
      values ('Carol''s space', ${carol})
      returning id
    `;
    await tx`
      insert into space_memberships (space_id, user_id, role)
      values (${carolSpace.id}, ${carol}, 'owner')
    `;

    // Memories
    const memories = [
      // Alice – shared
      { space_id: spaceId, creator_id: alice, title: 'First date at Phở Hòa', body: 'Bob ordered phở tái, spilled the hoisin sauce and laughed it off.', event_date: '2023-02-14', visibility: 'shared' },
      { space_id: spaceId, creator_id: alice, title: 'Trip to Đà Lạt', body: 'We rented a motorbike and got lost near Datanla falls. Best detour ever.', event_date: '2023-04-20', visibility: 'shared' },
      { space_id: spaceId, creator_id: alice, title: 'Bob\'s birthday dinner', body: 'Surprised Bob with his favourite bún bò Huế at the place on Lý Tự Trọng.', event_date: '2023-07-08', visibility: 'shared' },
      // Alice – private
      { space_id: spaceId, creator_id: alice, title: 'Alice journal – first fight', body: 'We argued about the Đà Lạt trip planning. I was too controlling.', event_date: '2023-04-18', visibility: 'private' },
      { space_id: spaceId, creator_id: alice, title: 'Alice journal – ring shopping', body: 'Saw a ring at Tiffany\'s that felt right. Too early to say anything.', event_date: '2023-09-01', visibility: 'private' },
      // Bob – shared
      { space_id: spaceId, creator_id: bob, title: 'Movie night – Everything Everywhere', body: 'Alice cried twice. We talked about parallel universes until 2am.', event_date: '2023-03-05', visibility: 'shared' },
      { space_id: spaceId, creator_id: bob, title: 'Cooking class together', body: 'Alice discovered she hates kneading dough. Bob burned the garlic bread.', event_date: '2023-06-11', visibility: 'shared' },
      // Bob – private
      { space_id: spaceId, creator_id: bob, title: 'Bob journal – proposal idea', body: 'Thinking of proposing at the Đà Lạt cabin we stayed at. Need to plan.', event_date: '2023-09-10', visibility: 'private' },
      // Carol – shared (different space)
      { space_id: carolSpace.id as string, creator_id: carol, title: 'Carol solo hike Fansipan', body: 'Made it to the summit alone. Cold, foggy, worth every step.', event_date: '2023-08-15', visibility: 'shared' },
    ];

    await tx`insert into memories ${tx(memories)}`;
  });

  console.log("Seed complete:", { alice, bob, carol });
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

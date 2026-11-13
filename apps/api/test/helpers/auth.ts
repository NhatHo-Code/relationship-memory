import { createClient } from "@supabase/supabase-js";
import { config } from "../../src/config.js";

const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const anonClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export async function createTestUser(name = "User") {
  const email = `${name.toLowerCase()}-${crypto.randomUUID()}@test.local`;
  const password = "password123";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !session.session) throw signInError ?? new Error("signIn failed");

  return {
    id: data.user.id,
    email,
    token: session.session.access_token,
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

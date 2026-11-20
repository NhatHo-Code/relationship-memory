# Deploy: Supabase cloud + Railway + Vercel

Order matters: Supabase first (database), then Railway (API and worker), then Vercel (web), then go back and fill in the Vercel domain.

Never put production values in `.env` files or commits. Set them in each dashboard, or on the command line for one-off commands.

## 1. Supabase cloud

1. supabase.com → New project, region **Southeast Asia (Singapore)**. Save the database password in your password manager.
2. Push migrations:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

3. Dashboard checks: all tables exist, extensions `vector` and `pgmq` are enabled, queue `memory_ingest` exists (Integrations → Queues may need enabling first).
4. **Connect** → **Session pooler** URL (IPv4). This is `DATABASE_URL`. The Transaction pooler (port 6543) would also need `prepare: false` in `src/db.ts`.
5. Seed demo data once, with values only on the command line and a new demo password:

   ```bash
   cd apps/api
   NODE_ENV=production \
   DATABASE_URL='<session pooler url>' \
   SUPABASE_URL='https://<project-ref>.supabase.co' \
   SUPABASE_SERVICE_ROLE_KEY='<service role key>' \
   SEED_PASSWORD='<new demo password>' \
   pnpm seed
   ```

   The seed also enqueues one embedding job per memory, so the worker embeds them once it runs.

6. Authentication → URL Configuration: fill Site URL and Redirect URLs after step 3 (Vercel domain).

## 2. Railway: API and worker

Pricing as of 2026-11-20 (railway.com/pricing): Free Trial with a $5 one-time credit for 30 days; Free plan includes $1/month but services sleep after 5–10 minutes without outbound traffic, which stops the worker; Hobby is $5/month with $5 of usage included. The pricing page does not list regions, so check that the region picker offers Singapore. If it does not, pick the closest region, or use Render or Fly.io with Singapore.

1. New Project → Deploy from GitHub repo → `relationship-memory`.
2. Service **api**
   - Settings → Build: Dockerfile path `apps/api/Dockerfile` (build context is the repo root).
   - Deploy: healthcheck path `/health`, region Singapore if available.
   - Networking → Generate Domain.
3. Variables for **api**:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Session pooler URL from Supabase |
   | `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `LLM_PROVIDER` | `gemini` |
   | `LLM_API_KEY` | Gemini API key |
   | `WEB_ORIGIN` | Vercel domain, e.g. `https://<app>.vercel.app` (update after step 3) |
   | `LOG_LEVEL` | `info` |

   Railway sets `PORT`; the API reads it. The API does not need `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

4. Service **worker**: add a second service from the same repo and Dockerfile, Custom Start Command `node dist/worker.js`, **no public domain**, same variables except `WEB_ORIGIN`. Restart policy: always (the worker exits on a lost database connection).
5. Check:

   ```bash
   curl https://<api-domain>/health   # {"status":"ok"}
   curl https://<api-domain>/ready    # {"status":"ready"}
   ```

   The worker logs should show the seed jobs being processed (`result: "done"`).

## 3. Vercel: web

1. Add New Project → import the repo → Root Directory `apps/web`, framework Next.js.
2. Environment variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon (publishable) key |
   | `NEXT_PUBLIC_API_URL` | `https://<api-domain>` |

   These are embedded in the browser bundle. Never add the service role key here.

3. Deploy, copy the Vercel domain, then:
   - Railway **api** → `WEB_ORIGIN` = the Vercel domain (redeploys the API).
   - Supabase → Authentication → URL Configuration → Site URL and Redirect URLs = the Vercel domain.

## 4. Production smoke test

With two accounts (Alice in a normal window, Bob in a private window):

- [ ] Sign in → spaces → timeline loads
- [ ] Create a memory → AI status goes from "Đang xử lý AI…" to ready after a reload
- [ ] Ask the AI about it → answer with a source chip
- [ ] A private memory of one person is not visible to the other, in the timeline or in AI answers
- [ ] `/ready` returns ready; the worker has no repeated failures in its logs

Then fill in the Live demo links in the README.

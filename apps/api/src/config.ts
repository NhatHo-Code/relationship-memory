import { z } from "zod";

if (process.env.NODE_ENV !== "production") {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file: use real env vars
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.issues);
  process.exit(1);
}

export const config = parsed.data;

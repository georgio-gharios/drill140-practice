import { z } from "zod";

// Server-only. Never import this from a "use client" file.
const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_AGENT_ID: z.string().min(1),
  TOOL_SECRET: z.string().min(16),
  OPENROUTER_API_KEY: z.string().min(1),
  SUPERVISOR_PIN: z.string().regex(/^\d{4,8}$/),
});

export type Env = z.infer<typeof EnvSchema>;
export const ENV_NAMES = Object.keys(EnvSchema.shape) as (keyof Env)[];

let cached: Env | null = null;

/** Validates all env vars once; throws listing missing/invalid NAMES (never values). */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    throw new Error(`Missing or invalid env vars: ${names.join(", ")}`);
  }
  cached = parsed.data;
  return cached;
}

/** Names of env vars that are missing or invalid (for /api/health). */
export function envProblems(): string[] {
  const parsed = EnvSchema.safeParse(process.env);
  return parsed.success ? [] : [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
}

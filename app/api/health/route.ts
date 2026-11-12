import { envProblems } from "@/lib/env";

export function GET() {
  const missing = envProblems(); // names only, never values
  return Response.json(
    { ok: true, service: "drill140-practice", env_ok: missing.length === 0, missing, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

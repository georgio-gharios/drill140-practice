import { getEnv } from "@/lib/env";

export const maxDuration = 10;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  let env;
  try {
    env = getEnv();
  } catch {
    return Response.json({ error: "server_not_configured" }, { status: 500, headers: NO_STORE });
  }
  const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(env.ELEVENLABS_AGENT_ID)}`;
  const r = await fetch(url, { headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, cache: "no-store" });
  if (!r.ok) return Response.json({ error: "token_failed" }, { status: 502, headers: NO_STORE });
  const { token } = (await r.json()) as { token?: string };
  if (!token) return Response.json({ error: "token_failed" }, { status: 502, headers: NO_STORE });
  return Response.json({ token }, { headers: NO_STORE });
}

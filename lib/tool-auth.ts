import { timingSafeEqual } from "node:crypto";

/** Returns a 401 Response unless x-tool-secret matches TOOL_SECRET; null when allowed. */
export function requireToolSecret(req: Request): Response | null {
  const got = Buffer.from(req.headers.get("x-tool-secret") ?? "");
  const want = Buffer.from(process.env.TOOL_SECRET ?? "");
  if (!want.length || got.length !== want.length || !timingSafeEqual(got, want)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}

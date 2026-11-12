import { z } from "zod";
import { getDb } from "@/lib/supabase-server";
import { logEvent } from "@/lib/events";

export const maxDuration = 10;

const Input = z.object({ conversation_id: z.string().min(1).max(200) });

/** Called by /call right after the voice session connects. Idempotent per conversation. */
export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  const { conversation_id } = parsed.data;

  const db = getDb();
  const { data: existing } = await db
    .from("drills").select("id, started_at").eq("conversation_id", conversation_id).maybeSingle();
  if (existing) return Response.json({ ok: true, drill_id: existing.id, started_at: existing.started_at });

  const { data, error } = await db
    .from("drills").insert({ conversation_id }).select("id, started_at").single();
  if (error || !data) return Response.json({ ok: false, error: "db_error" }, { status: 500 });

  await logEvent({ drill_id: data.id, conversation_id, kind: "drill_started", summary: "Drill started", seconds_since_start: 0 });
  return Response.json({ ok: true, drill_id: data.id, started_at: data.started_at });
}

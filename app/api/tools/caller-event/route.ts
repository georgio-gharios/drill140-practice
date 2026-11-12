import { z } from "zod";
import { requireToolSecret } from "@/lib/tool-auth";
import { getDb } from "@/lib/supabase-server";
import { CALLER_EVENTS, logEvent, type CallerEvent } from "@/lib/events";

export const maxDuration = 10;

const Input = z.object({
  conversation_id: z.string().min(1).max(200),
  event: z.enum(CALLER_EVENTS),
});

const LABEL: Record<CallerEvent, string> = {
  address_given: "Caller gave the address",
  callback_given: "Caller gave a callback number",
  patient_flat: "Patient laid flat",
  compressions_started: "Compressions started",
};

/** Webhook tool `caller_event`: the agent reports a milestone; we log it with seconds since drill start. */
export async function POST(req: Request) {
  const denied = requireToolSecret(req);
  if (denied) return denied;
  const t0 = Date.now();

  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({
      ok: false,
      error: "invalid_input",
      allowed_events: CALLER_EVENTS,
      say: "Keep playing the caller; this milestone was not recorded.",
    });
  }
  const { conversation_id, event } = parsed.data;

  const { data: drill } = await getDb()
    .from("drills").select("id, started_at").eq("conversation_id", conversation_id).maybeSingle();
  const seconds = drill ? Math.max(0, Math.round((Date.now() - new Date(drill.started_at).getTime()) / 1000)) : null;

  await logEvent({
    drill_id: drill?.id ?? null,
    conversation_id,
    kind: event,
    summary: seconds === null ? `${LABEL[event]} (drill not found)` : `${LABEL[event]} at ${seconds}s`,
    seconds_since_start: seconds,
    input: { event }, // no free text: events are world-readable
    ms: Date.now() - t0,
  });

  return Response.json({ ok: true, event, seconds_since_start: seconds });
}

import { getDb } from "@/lib/supabase-server";

export const CALLER_EVENTS = [
  "address_given",
  "callback_given",
  "patient_flat",
  "compressions_started",
] as const;
export type CallerEvent = (typeof CALLER_EVENTS)[number];

export type EventKind = "drill_started" | CallerEvent | "drill_ended" | "error";

export type EventRow = {
  drill_id?: string | null;
  conversation_id?: string | null;
  kind: EventKind;
  summary: string;
  seconds_since_start?: number | null;
  input?: unknown;
  ms?: number | null;
};

/** Inserts into events. Never throws: logging must not fail a tool. Rows are world-readable, so no PII. */
export async function logEvent(row: EventRow): Promise<boolean> {
  try {
    const { error } = await getDb().from("events").insert(row);
    if (error) {
      console.error("logEvent failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("logEvent threw", e instanceof Error ? e.message : e);
    return false;
  }
}

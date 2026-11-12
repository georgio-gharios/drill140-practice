import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub the DB inside this test file only.
const inserted: unknown[] = [];
let drill: { id: string; started_at: string } | null = null;

vi.mock("@/lib/supabase-server", () => ({
  getDb: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: table === "drills" ? drill : null, error: null }) }),
      }),
      insert: async (row: unknown) => {
        inserted.push({ table, row });
        return { error: null };
      },
    }),
  }),
}));

const { POST } = await import("@/app/api/tools/caller-event/route");

const SECRET = "test-secret-0123456789abcdef";
const URL_ = "http://localhost/api/tools/caller-event";

function req(body: unknown, secret?: string, raw = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret !== undefined) headers["x-tool-secret"] = secret;
  return new Request(URL_, { method: "POST", headers, body: raw ? (body as string) : JSON.stringify(body) });
}

describe("POST /api/tools/caller-event", () => {
  beforeEach(() => {
    process.env.TOOL_SECRET = SECRET;
    inserted.length = 0;
    drill = null;
  });

  it("returns 401 without the secret header", async () => {
    const res = await POST(req({ conversation_id: "c1", event: "address_given" }));
    expect(res.status).toBe(401);
    expect(inserted).toHaveLength(0);
  });

  it("returns 401 with a wrong secret", async () => {
    const res = await POST(req({ conversation_id: "c1", event: "address_given" }, "wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when TOOL_SECRET is not configured", async () => {
    delete process.env.TOOL_SECRET;
    const res = await POST(req({ conversation_id: "c1", event: "address_given" }, ""));
    expect(res.status).toBe(401);
  });

  it("handles an unknown event as invalid_input without logging", async () => {
    const res = await POST(req({ conversation_id: "c1", event: "patient_dead" }, SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "invalid_input" });
    expect(inserted).toHaveLength(0);
  });

  it("handles a missing conversation_id and malformed JSON", async () => {
    const a = await (await POST(req({ event: "address_given" }, SECRET))).json();
    const b = await (await POST(req("{not json", SECRET, true))).json();
    expect(a.error).toBe("invalid_input");
    expect(b.error).toBe("invalid_input");
    expect(inserted).toHaveLength(0);
  });

  it("logs a valid event with seconds since drill start", async () => {
    drill = { id: "d1", started_at: new Date(Date.now() - 42_000).toISOString() };
    const res = await POST(req({ conversation_id: "c1", event: "compressions_started" }, SECRET));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.seconds_since_start).toBeGreaterThanOrEqual(42);
    expect(body.seconds_since_start).toBeLessThan(45);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ table: "events", row: { kind: "compressions_started", drill_id: "d1" } });
  });
});

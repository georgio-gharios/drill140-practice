"use client";

import { useEffect, useState } from "react";
import { getBrowserDb } from "@/lib/supabase-browser";

type Row = {
  id: string;
  created_at: string;
  kind: string;
  summary: string | null;
  seconds_since_start: number | null;
  ms: number | null;
};

const COLOUR: Record<string, string> = {
  drill_started: "bg-blue-100 text-blue-900",
  address_given: "bg-green-100 text-green-900",
  callback_given: "bg-green-100 text-green-900",
  patient_flat: "bg-amber-100 text-amber-900",
  compressions_started: "bg-red-100 text-red-900",
  error: "bg-zinc-800 text-white",
};

export default function Board() {
  const [rows, setRows] = useState<Row[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let db: ReturnType<typeof getBrowserDb>;
    try {
      db = getBrowserDb();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Supabase not configured";
      queueMicrotask(() => setProblem(msg));
      return;
    }
    let alive = true;
    db.from("events")
      .select("id, created_at, kind, summary, seconds_since_start, ms")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setProblem(error.message);
        else setRows((prev) => dedupe([...prev, ...((data ?? []) as Row[])]));
      });
    const channel = db
      .channel("board")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" }, (p) =>
        setRows((prev) => dedupe([p.new as Row, ...prev])),
      )
      .subscribe();
    return () => {
      alive = false;
      void db.removeChannel(channel);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Drill 140 — live board</h1>
      {problem && <p className="mb-4 rounded bg-red-50 p-3 text-red-800">{problem}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Time</th>
            <th>Kind</th>
            <th>Summary</th>
            <th className="text-right">T+</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-mono">{new Date(r.created_at).toLocaleTimeString()}</td>
              <td>
                <span className={`rounded px-2 py-0.5 ${COLOUR[r.kind] ?? "bg-zinc-100 text-zinc-900"}`}>{r.kind}</span>
              </td>
              <td>{r.summary}</td>
              <td className="text-right font-mono">
                {r.seconds_since_start == null ? "—" : `${r.seconds_since_start}s`}
              </td>
            </tr>
          ))}
          {rows.length === 0 && !problem && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-zinc-500">
                No events yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

function dedupe(rows: Row[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

type Line = { id: number; who: "you" | "caller"; text: string };

export default function CallPage() {
  return (
    <ConversationProvider>
      <Call />
    </ConversationProvider>
  );
}

function Call() {
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const nextId = useRef(0);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      // Registers the drill so the board shows drill_started and tool events get T+ seconds.
      fetch("/api/drills/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      }).catch(() => setNote("Could not register the drill start."));
    },
    onMessage: ({ message, role }) =>
      setLines((prev) => [
        ...prev,
        { id: nextId.current++, who: role === "user" ? "you" : "caller", text: message },
      ]),
    onError: (message) => setNote(message),
  });
  const { status, endSession, startSession, sendUserMessage, isMuted, setMuted } = conversation;
  const live = status === "connected" || status === "connecting";

  const start = useCallback(async () => {
    setNote(null);
    setLines([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setNote("Microphone blocked. Allow it and try again.");
      return;
    }
    const r = await fetch("/api/call-token", { method: "POST", cache: "no-store" });
    if (!r.ok) {
      setNote("Could not get a call token.");
      return;
    }
    const { token } = (await r.json()) as { token: string };
    startSession({ conversationToken: token, connectionType: "webrtc" });
  }, [startSession]);

  // End the call (and stop billing) when the page is hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") endSession();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [endSession]);

  const send = () => {
    const t = text.trim();
    if (!t || status !== "connected") return;
    sendUserMessage(t);
    setText("");
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Drill 140 — incoming call</h1>
      <p className="text-sm text-zinc-500">Status: {status}</p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={start}
          disabled={live}
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Start
        </button>
        <button
          onClick={endSession}
          disabled={!live}
          className="rounded bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          End
        </button>
        <button
          onClick={() => setMuted(!isMuted)}
          disabled={status !== "connected"}
          className="rounded border px-4 py-2 font-semibold disabled:opacity-40"
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
      </div>

      {note && <p className="rounded bg-amber-50 p-3 text-amber-900">{note}</p>}

      <section aria-live="polite" className="flex min-h-64 flex-col gap-3 rounded border p-4 text-xl">
        {lines.length === 0 && <p className="text-base text-zinc-500">Transcript appears here.</p>}
        {lines.map((l) => (
          <p key={l.id} className={l.who === "you" ? "text-right text-blue-700 dark:text-blue-300" : ""}>
            <span className="mr-2 text-sm uppercase text-zinc-500">{l.who}</span>
            {l.text}
          </p>
        ))}
      </section>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type instead of speaking…"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" disabled={status !== "connected"} className="rounded border px-4 py-2 disabled:opacity-40">
          Send
        </button>
      </form>
    </main>
  );
}

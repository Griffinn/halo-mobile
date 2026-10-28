"use client";
import { useState } from "react";

type Msg = { role: "user" | "bot"; text: string; sources?: string[] };

export default function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "Ask me about Halo specs, warranty, returns or troubleshooting." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setMsgs((m) => [...m, { role: "bot", text: res.ok ? data.text : data.error, sources: data.sources }]);
    setBusy(false);
  }

  return (
    <main className="chat">
      {msgs.map((m, i) => (
        <div key={i} className={`msg ${m.role}`}>
          {m.text}
          {m.sources?.length ? <div className="src">Sources: {m.sources.join(", ")}</div> : null}
        </div>
      ))}
      {busy && <div className="msg bot">Searching the docs…</div>}
      <form className="composer" onSubmit={send}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="How long is the warranty?" aria-label="Your question" />
        <button className="btn" disabled={busy}>Ask</button>
      </form>
    </main>
  );
}

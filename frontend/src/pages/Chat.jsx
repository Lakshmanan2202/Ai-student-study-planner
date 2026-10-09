import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const SUGGESTIONS = [
  "Help me make a revision plan for my next exam.",
  "Explain a difficult topic step by step.",
  "How should I study effectively today?",
];

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const updated = [...messages, { role: "user", text }];
    setMessages(updated);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const result = await api("/ai/chat", {
        method: "POST",
        body: { messages: updated.slice(-20) },
      });
      setMessages([...updated, { role: "assistant", text: result.reply }]);
    } catch (err) {
      setMessages(messages);
      setInput(text);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-[calc(100vh-4rem)] min-h-[28rem] flex-col">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Study chat</h1>
        <p className="mt-1 text-sm text-muted">Ask Gemini for help with your subjects, study topics, and exam prep.</p>
      </header>

      <div className="panel flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto mt-8 max-w-lg text-center">
            <p className="mb-4 text-sm text-muted">Your study coach can use your subjects and today’s plan to give relevant advice.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} className="btn" onClick={() => setInput(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p className={`max-w-[85%] whitespace-pre-wrap rounded px-3 py-2 text-sm leading-relaxed ${
                message.role === "user" ? "bg-accent text-white" : "bg-page text-ink"
              }`}>
                {message.text}
              </p>
            </div>
          ))
        )}
        {busy && <p className="text-sm text-muted" role="status">Gemini is thinking…</p>}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <label className="sr-only" htmlFor="chat-message">Message your study coach</label>
        <textarea
          id="chat-message"
          className="input min-h-11 flex-1 resize-y"
          rows={2}
          maxLength={4000}
          placeholder="Ask a study question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
      <p className="mt-1 text-xs text-muted">Chat history stays in this browser session.</p>
    </section>
  );
}

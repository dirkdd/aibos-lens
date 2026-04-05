import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";

interface PiChatProps {
  onSend: (message: string) => void;
}

export default function PiChat({ onSend }: PiChatProps) {
  const isOpen = useAppStore((s) => s.piChatOpen);
  const messages = useAppStore((s) => s.piMessages);
  const toggleChat = useAppStore((s) => s.togglePiChat);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div
      data-testid="pi-chat-panel"
      className="flex flex-col border-t border-pi-border bg-pi-bg animate-slide-in"
      style={{ maxHeight: "50vh" }}
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-bold text-pi-accent uppercase tracking-wide">Pi Chat</span>
        <button onClick={toggleChat} className="text-zinc-500 hover:text-zinc-300 text-xs p-1" aria-label="Close chat">
          ▼
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2 min-h-[100px]">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm ${msg.role === "user" ? "text-zinc-300" : "text-zinc-100"}`}>
            <span className="text-xs font-semibold text-zinc-500 mr-1">
              {msg.role === "user" ? "You:" : "Pi:"}
            </span>
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t border-overlay-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Pi anything..."
          className="flex-1 bg-overlay-surface border border-overlay-border rounded px-2.5 py-1.5
                     text-sm text-zinc-200 placeholder-zinc-500 outline-none
                     focus:border-pi-accent/50"
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-medium rounded bg-pi-accent/20
                     text-pi-accent hover:bg-pi-accent/30 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

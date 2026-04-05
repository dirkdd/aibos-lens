import { useAppStore } from "../store";

export default function ContextCard() {
  const card = useAppStore((s) => s.contextCard);
  const clearCard = useAppStore((s) => s.clearContextCard);

  if (!card) return null;

  return (
    <div className="mx-2 mb-2 rounded-lg border border-pi-border bg-pi-bg animate-slide-in">
      <div className="flex items-start justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-pi-accent text-xs font-bold uppercase tracking-wide">Pi</span>
          <span className="text-sm font-semibold text-zinc-100">{card.entity}</span>
        </div>
        <button
          onClick={clearCard}
          aria-label="Dismiss"
          className="text-zinc-500 hover:text-zinc-300 text-xs leading-none p-1"
        >
          ✕
        </button>
      </div>
      <p className="px-3 text-sm text-zinc-300 leading-relaxed">{card.summary}</p>
      {card.suggestedQuestion && (
        <p className="px-3 pt-2 pb-2.5 text-sm text-pi-accent">
          <span className="text-zinc-500 mr-1">Ask:</span>
          &ldquo;{card.suggestedQuestion}&rdquo;
        </p>
      )}
      {!card.suggestedQuestion && <div className="pb-2.5" />}
    </div>
  );
}

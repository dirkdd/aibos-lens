import { useAppStore } from "../store";
import type { QuickAction } from "../types";

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: "default-action-item", label: "Action Item", action: "create_action_item", params: {} },
  { id: "default-note", label: "Note", action: "create_note", params: {} },
  { id: "default-soundbite", label: "Soundbite", action: "create_soundbite", params: {} },
];

interface QuickActionsProps {
  onAction: (action: QuickAction) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const meetingStatus = useAppStore((s) => s.meetingStatus);
  const piActions = useAppStore((s) => s.quickActions);

  if (meetingStatus !== "active") return null;

  const allActions = [...DEFAULT_ACTIONS, ...piActions];

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-overlay-border">
      {allActions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action)}
          className="px-2.5 py-1 text-xs font-medium rounded-full
                     bg-overlay-surface border border-overlay-border
                     text-zinc-300 hover:text-zinc-100 hover:border-zinc-600
                     transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

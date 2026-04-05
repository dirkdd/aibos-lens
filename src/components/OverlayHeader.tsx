import { useState, useEffect } from "react";
import { useAppStore } from "../store";

function formatTime(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function OverlayHeader() {
  const meetingStatus = useAppStore((s) => s.meetingStatus);
  const meeting = useAppStore((s) => s.meeting);
  const serviceStatuses = useAppStore((s) => s.serviceStatuses);
  const endMeeting = useAppStore((s) => s.endMeeting);

  const isLive = meetingStatus === "active";
  const title = meeting?.client ?? meeting?.title ?? "AI-BOS Lens";

  return (
    <div className="overlay-header">
      <span className={`status-dot ${isLive ? "live" : ""}`} />
      {isLive && (
        <span className="text-xs text-zinc-400 font-mono tabular-nums">
          <TimerDisplay startedAt={meeting!.startedAt} />
        </span>
      )}
      <span className="flex-1 text-sm font-medium truncate">{title}</span>
      <div className="flex gap-1.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {isLive && (
          <ServiceIndicators statuses={serviceStatuses} />
        )}
        {isLive && (
          <button
            onClick={endMeeting}
            className="text-zinc-500 hover:text-red-400 text-xs p-1 transition-colors"
            title="End meeting"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function TimerDisplay({ startedAt }: { startedAt: number }) {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <>{time}</>;
}

function ServiceIndicators({ statuses }: { statuses: Record<string, string> }) {
  const dotColor = (status: string) => {
    if (status === "connected") return "bg-emerald-400";
    if (status === "connecting") return "bg-yellow-400";
    if (status === "error") return "bg-red-400";
    return "bg-zinc-600";
  };

  return (
    <div className="flex gap-1 items-center">
      {Object.entries(statuses).map(([name, status]) => (
        <div
          key={name}
          className={`w-1.5 h-1.5 rounded-full ${dotColor(status)}`}
          title={`${name}: ${status}`}
        />
      ))}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import type { TranscriptEntry } from "../types";

const SPEAKER_COLORS: Record<number, string> = {
  0: "text-speaker-self",
  1: "text-speaker-other",
  2: "text-speaker-third",
};

function getSpeakerColor(speaker: string, speakers: string[]): string {
  const index = speakers.indexOf(speaker);
  return SPEAKER_COLORS[index] ?? "text-zinc-400";
}

interface SpeakerGroup {
  speaker: string;
  entries: TranscriptEntry[];
}

function groupBySpeaker(transcript: TranscriptEntry[]): SpeakerGroup[] {
  const groups: SpeakerGroup[] = [];
  for (const entry of transcript) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.entries.push(entry);
    } else {
      groups.push({ speaker: entry.speaker, entries: [entry] });
    }
  }
  return groups;
}

export default function TranscriptFeed() {
  const transcript = useAppStore((s) => s.transcript);
  const bottomRef = useRef<HTMLDivElement>(null);
  const speakers = [...new Set(transcript.map((e) => e.speaker))];
  const groups = groupBySpeaker(transcript);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length]);

  if (transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Waiting for audio...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {groups.map((group, i) => (
        <div key={`${group.speaker}-${i}`} className="animate-fade-in">
          <span className={`text-xs font-semibold ${getSpeakerColor(group.speaker, speakers)}`}>
            {group.speaker}
          </span>
          <p className="text-sm text-zinc-200 leading-relaxed mt-0.5">
            {group.entries.map((e) => e.text).join(" ")}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

"use client";

import { Button } from "./ui";

export interface TimelineEvent {
  id: string;
  eventType: string;
  matchClockSeconds: number;
  status: string;
  primaryPlayer: { displayName: string } | null;
  secondaryPlayer: { displayName: string } | null;
  team: { name: string } | null;
}

const EVENT_ICON: Record<string, string> = {
  GOAL: "⚽",
  OWN_GOAL: "⚽",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  SECOND_YELLOW: "🟥",
  SUBSTITUTION: "🔁",
  MATCH_STARTED: "🏁",
  MATCH_COMPLETED: "🏆",
  PERIOD_STARTED: "▶️",
};

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}'`.padStart(3, " ") + (s ? `${s}s` : "");
}

function describe(event: TimelineEvent): string {
  switch (event.eventType) {
    case "GOAL":
      return `Goal — ${event.primaryPlayer?.displayName ?? "Unknown"}${
        event.secondaryPlayer ? ` (assist: ${event.secondaryPlayer.displayName})` : ""
      }`;
    case "YELLOW_CARD":
      return `Yellow card — ${event.primaryPlayer?.displayName ?? "Unknown"}`;
    case "RED_CARD":
    case "SECOND_YELLOW":
      return `Red card — ${event.primaryPlayer?.displayName ?? "Unknown"}`;
    case "SUBSTITUTION":
      return `Substitution — ${event.primaryPlayer?.displayName ?? "?"} on, ${
        event.secondaryPlayer?.displayName ?? "?"
      } off`;
    case "MATCH_STARTED":
      return "Match started";
    case "MATCH_COMPLETED":
      return "Match completed";
    case "PERIOD_STARTED":
      return "Period started";
    default:
      return event.eventType.replaceAll("_", " ").toLowerCase();
  }
}

export function MatchTimeline({
  events,
  onRetract,
  canManage,
}: {
  events: TimelineEvent[];
  onRetract?: (eventId: string) => void;
  canManage?: boolean;
}) {
  if (events.length === 0) {
    return <p className="text-bodySmall text-text-secondary">No events recorded yet.</p>;
  }

  const ordered = [...events].reverse();

  return (
    <ul className="flex flex-col divide-y divide-border">
      {ordered.map((event) => (
        <li key={event.id} className="flex items-center justify-between gap-sm py-xs">
          <div className="flex items-center gap-sm">
            <span className="w-12 text-caption text-text-secondary">{formatClock(event.matchClockSeconds)}</span>
            <span>{EVENT_ICON[event.eventType] ?? "•"}</span>
            <span className="text-bodySmall text-text-primary">
              {describe(event)}
              {event.team && <span className="text-text-secondary"> · {event.team.name}</span>}
            </span>
          </div>
          {canManage && onRetract && ["GOAL", "YELLOW_CARD", "RED_CARD"].includes(event.eventType) && (
            <Button variant="ghost" className="min-h-0 py-0 text-caption" onClick={() => onRetract(event.id)}>
              Retract
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

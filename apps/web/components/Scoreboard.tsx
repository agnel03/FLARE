"use client";

import { Badge } from "./ui";

const STATUS_TONE: Record<string, "info" | "live" | "success" | "warning"> = {
  SCHEDULED: "info",
  LIVE: "live",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "warning",
  ABANDONED: "warning",
};

export function Scoreboard({
  homeName,
  awayName,
  homeScore,
  awayScore,
  status,
}: {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  status: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-gradient-to-b from-surface to-surface-muted p-lg text-center">
      <div className="flex justify-center">
        <Badge tone={STATUS_TONE[status] ?? "info"}>{status === "LIVE" ? "● LIVE" : status}</Badge>
      </div>
      <div className="mt-sm flex items-center justify-center gap-md">
        <TeamName name={homeName} />
        <div className="numeric flex items-baseline gap-xs text-numericLarge font-extrabold text-text-primary">
          <span>{homeScore}</span>
          <span className="text-text-secondary">–</span>
          <span>{awayScore}</span>
        </div>
        <TeamName name={awayName} />
      </div>
    </div>
  );
}

function TeamName({ name }: { name: string }) {
  return (
    <div className="flex w-28 flex-col items-center gap-xxs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted text-heading2 font-bold text-brand">
        {name.charAt(0)}
      </div>
      <p className="text-bodySmall font-semibold text-text-primary">{name}</p>
    </div>
  );
}

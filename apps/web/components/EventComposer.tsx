"use client";

import { useState } from "react";
import { DEFAULT_SHOT_OPTIONS, type ShotFoot } from "@flare/shared";
import { Button, Label } from "./ui";

export interface ComposerParticipant {
  playerId: string;
  teamId: string;
  displayName: string;
  isActive: boolean;
  role: "STARTER" | "SUBSTITUTE";
}

type Family = "GOAL" | "CARD" | "SUBSTITUTION";

export interface SubmitPayload {
  eventType: string;
  teamId?: string;
  primaryPlayerId?: string;
  secondaryPlayerId?: string;
  matchClockSeconds: number;
  metadata: Record<string, unknown>;
}

export function EventComposer({
  participants,
  homeTeamId,
  homeTeamName,
  awayTeamId,
  awayTeamName,
  onSubmit,
  disabled,
}: {
  participants: ComposerParticipant[];
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
  disabled?: boolean;
}) {
  const [family, setFamily] = useState<Family>("GOAL");
  const [teamId, setTeamId] = useState(homeTeamId);
  const [playerId, setPlayerId] = useState("");
  const [secondaryPlayerId, setSecondaryPlayerId] = useState("");
  const [shotOptionId, setShotOptionId] = useState<string>(DEFAULT_SHOT_OPTIONS[0].id);
  const [foot, setFoot] = useState<ShotFoot>("RIGHT");
  const [cardType, setCardType] = useState<"YELLOW_CARD" | "RED_CARD">("YELLOW_CARD");
  const [clock, setClock] = useState("00:00");
  const [submitting, setSubmitting] = useState(false);

  const activeOnTeam = participants.filter((p) => p.teamId === teamId && p.isActive);
  const benchOnTeam = participants.filter((p) => p.teamId === teamId && !p.isActive);

  const clockToSeconds = (value: string) => {
    const [m, s] = value.split(":").map((v) => Number(v) || 0);
    return m * 60 + s;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      if (family === "GOAL") {
        await onSubmit({
          eventType: "GOAL",
          teamId,
          primaryPlayerId: playerId,
          secondaryPlayerId: secondaryPlayerId || undefined,
          matchClockSeconds: clockToSeconds(clock),
          metadata: { shotOptionId, foot, ownGoal: false, penalty: false, setPiece: false },
        });
      } else if (family === "CARD") {
        await onSubmit({
          eventType: cardType,
          teamId,
          primaryPlayerId: playerId,
          matchClockSeconds: clockToSeconds(clock),
          metadata: {},
        });
      } else {
        await onSubmit({
          eventType: "SUBSTITUTION",
          teamId,
          primaryPlayerId: secondaryPlayerId, // incoming
          secondaryPlayerId: playerId, // outgoing
          matchClockSeconds: clockToSeconds(clock),
          metadata: { reason: "TACTICAL" },
        });
      }
      setPlayerId("");
      setSecondaryPlayerId("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-md">
      <div className="flex gap-xxs">
        {(["GOAL", "CARD", "SUBSTITUTION"] as Family[]).map((f) => (
          <button
            key={f}
            onClick={() => setFamily(f)}
            className={`min-h-[44px] flex-1 rounded-md text-bodySmall font-semibold ${
              family === f ? "bg-brand text-white" : "bg-surface-muted text-text-secondary"
            }`}
          >
            {f === "GOAL" ? "⚽ Goal" : f === "CARD" ? "🟨 Card" : "🔁 Sub"}
          </button>
        ))}
      </div>

      <div className="mt-sm grid grid-cols-2 gap-xs">
        <button
          onClick={() => {
            setTeamId(homeTeamId);
            setPlayerId("");
          }}
          className={`min-h-[44px] rounded-md text-bodySmall font-semibold ${
            teamId === homeTeamId ? "bg-brand-muted text-brand" : "bg-surface-muted text-text-secondary"
          }`}
        >
          {homeTeamName}
        </button>
        <button
          onClick={() => {
            setTeamId(awayTeamId);
            setPlayerId("");
          }}
          className={`min-h-[44px] rounded-md text-bodySmall font-semibold ${
            teamId === awayTeamId ? "bg-brand-muted text-brand" : "bg-surface-muted text-text-secondary"
          }`}
        >
          {awayTeamName}
        </button>
      </div>

      <div className="mt-sm">
        <Label>{family === "SUBSTITUTION" ? "Player going off" : "Player"}</Label>
        <select
          className="min-h-[44px] w-full rounded-md border border-border bg-background px-sm text-body text-text-primary"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        >
          <option value="">Select player…</option>
          {(family === "SUBSTITUTION" ? activeOnTeam : activeOnTeam).map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>

      {family === "GOAL" && (
        <div className="mt-sm">
          <Label>Assist (optional)</Label>
          <select
            className="min-h-[44px] w-full rounded-md border border-border bg-background px-sm text-body text-text-primary"
            value={secondaryPlayerId}
            onChange={(e) => setSecondaryPlayerId(e.target.value)}
          >
            <option value="">No assist</option>
            {activeOnTeam
              .filter((p) => p.playerId !== playerId)
              .map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.displayName}
                </option>
              ))}
          </select>
        </div>
      )}

      {family === "GOAL" && (
        <div className="mt-sm">
          <Label>Shot type</Label>
          <div className="grid grid-cols-2 gap-xxs">
            {DEFAULT_SHOT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setShotOptionId(opt.id)}
                className={`min-h-[44px] rounded-md px-xs text-caption font-semibold ${
                  shotOptionId === opt.id ? "bg-brand text-white" : "bg-surface-muted text-text-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-xs flex gap-xxs">
            {(["LEFT", "RIGHT", "HEAD", "OTHER"] as ShotFoot[]).map((f) => (
              <button
                key={f}
                onClick={() => setFoot(f)}
                className={`min-h-[44px] flex-1 rounded-md text-caption font-semibold ${
                  foot === f ? "bg-brand-muted text-brand" : "bg-surface-muted text-text-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {family === "CARD" && (
        <div className="mt-sm flex gap-xxs">
          <button
            onClick={() => setCardType("YELLOW_CARD")}
            className={`min-h-[44px] flex-1 rounded-md text-bodySmall font-semibold ${
              cardType === "YELLOW_CARD" ? "bg-warning text-black" : "bg-surface-muted text-text-secondary"
            }`}
          >
            Yellow
          </button>
          <button
            onClick={() => setCardType("RED_CARD")}
            className={`min-h-[44px] flex-1 rounded-md text-bodySmall font-semibold ${
              cardType === "RED_CARD" ? "bg-danger text-white" : "bg-surface-muted text-text-secondary"
            }`}
          >
            Red
          </button>
        </div>
      )}

      {family === "SUBSTITUTION" && (
        <div className="mt-sm">
          <Label>Player coming on</Label>
          <select
            className="min-h-[44px] w-full rounded-md border border-border bg-background px-sm text-body text-text-primary"
            value={secondaryPlayerId}
            onChange={(e) => setSecondaryPlayerId(e.target.value)}
          >
            <option value="">Select substitute…</option>
            {benchOnTeam.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-sm flex items-end gap-sm">
        <div className="flex-1">
          <Label>Match clock (mm:ss)</Label>
          <input
            className="min-h-[44px] w-full rounded-md border border-border bg-background px-sm text-body text-text-primary"
            value={clock}
            onChange={(e) => setClock(e.target.value)}
            placeholder="23:14"
          />
        </div>
        <Button
          onClick={submit}
          disabled={
            disabled ||
            submitting ||
            !playerId ||
            (family === "SUBSTITUTION" && !secondaryPlayerId)
          }
        >
          {submitting ? "Recording…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

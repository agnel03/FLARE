"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { Card, Button, Badge, ErrorText, Label, Input } from "@/components/ui";
import { Scoreboard } from "@/components/Scoreboard";
import { EventComposer, type ComposerParticipant, type SubmitPayload } from "@/components/EventComposer";
import { MatchTimeline, type TimelineEvent } from "@/components/MatchTimeline";

interface MatchParticipant {
  id: string;
  playerId: string;
  teamId: string;
  role: "STARTER" | "SUBSTITUTE";
  isActive: boolean;
  jerseyNumber: number | null;
  player: { displayName: string };
}

interface MatchDetail {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  participants: MatchParticipant[];
}

interface Stats {
  home: { shots: number; shotsOnTarget: number; yellowCards: number; redCards: number; corners: number };
  away: { shots: number; shotsOnTarget: number; yellowCards: number; redCards: number; corners: number };
}

export default function MatchCentrePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { me } = useAuth();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addPlayerId, setAddPlayerId] = useState("");
  const [addTeamId, setAddTeamId] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [m, ev, st] = await Promise.all([
        apiRequest<MatchDetail>(`/matches/${matchId}`, { auth: false }),
        apiRequest<TimelineEvent[]>(`/matches/${matchId}/timeline`, { auth: false }),
        apiRequest<Stats>(`/matches/${matchId}/stats`, { auth: false }),
      ]);
      setMatch(m);
      setEvents(ev);
      setStats(st);
      setAddTeamId((prev) => prev || m.homeTeam.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to load match.");
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const lifecycleAction = async (action: "start" | "pause" | "resume" | "complete") => {
    setActionError(null);
    try {
      await apiRequest(`/matches/${matchId}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Action failed.");
    }
  };

  const addParticipant = async () => {
    if (!addPlayerId) return;
    setActionError(null);
    try {
      await apiRequest(`/matches/${matchId}/participants`, {
        method: "POST",
        body: { playerId: addPlayerId, teamId: addTeamId, role: "STARTER" },
      });
      setAddPlayerId("");
      await load();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Could not add participant.");
    }
  };

  const submitEvent = async (payload: SubmitPayload) => {
    setActionError(null);
    try {
      await apiRequest(`/matches/${matchId}/events`, {
        method: "POST",
        body: { ...payload, clientEventId: `web-${Date.now()}-${Math.random().toString(36).slice(2)}` },
      });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Could not record event.");
      throw err;
    }
  };

  const retractEvent = async (eventId: string) => {
    setActionError(null);
    try {
      await apiRequest(`/matches/${matchId}/events/${eventId}/retract`, {
        method: "POST",
        body: { reason: "Corrected via Match Centre" },
      });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Could not retract event.");
    }
  };

  if (error) return <p className="text-danger">{error}</p>;
  if (!match) return <p className="text-text-secondary">Loading match…</p>;

  const composerParticipants: ComposerParticipant[] = match.participants.map((p) => ({
    playerId: p.playerId,
    teamId: p.teamId,
    displayName: p.player.displayName,
    isActive: p.isActive,
    role: p.role,
  }));

  const isAuthenticated = Boolean(me);

  return (
    <div className="flex flex-col gap-md">
      <Scoreboard
        homeName={match.homeTeam.name}
        awayName={match.awayTeam.name}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        status={match.status}
      />

      {stats && (
        <Card>
          <h2 className="text-heading2">Match stats</h2>
          <div className="mt-sm grid grid-cols-2 gap-md text-center">
            <StatColumn label={match.homeTeam.name} s={stats.home} />
            <StatColumn label={match.awayTeam.name} s={stats.away} />
          </div>
        </Card>
      )}

      {isAuthenticated && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <h2 className="text-heading2">Match control</h2>
            <Badge tone={match.status === "LIVE" ? "live" : "info"}>{match.status}</Badge>
          </div>
          <div className="mt-sm flex flex-wrap gap-sm">
            {match.status === "SCHEDULED" && <Button onClick={() => lifecycleAction("start")}>Start match</Button>}
            {match.status === "LIVE" && (
              <>
                <Button variant="secondary" onClick={() => lifecycleAction("pause")}>
                  Pause
                </Button>
                <Button variant="danger" onClick={() => lifecycleAction("complete")}>
                  Complete match
                </Button>
              </>
            )}
            {match.status === "PAUSED" && (
              <>
                <Button onClick={() => lifecycleAction("resume")}>Resume</Button>
                <Button variant="danger" onClick={() => lifecycleAction("complete")}>
                  Complete match
                </Button>
              </>
            )}
          </div>

          <div className="mt-md border-t border-border pt-sm">
            <h3 className="text-heading2">Add participant</h3>
            <p className="mt-xxs text-caption text-text-secondary">
              No player search yet in this slice — paste a Player ID (find it on a profile URL) or use your own,
              below.
            </p>
            <div className="mt-xs flex flex-wrap items-end gap-sm">
              <div>
                <Label>Team</Label>
                <select
                  className="min-h-[44px] rounded-md border border-border bg-background px-sm text-body text-text-primary"
                  value={addTeamId}
                  onChange={(e) => setAddTeamId(e.target.value)}
                >
                  <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                  <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                </select>
              </div>
              <div className="flex-1">
                <Label>Player ID</Label>
                <Input value={addPlayerId} onChange={(e) => setAddPlayerId(e.target.value)} />
              </div>
              {me?.player && (
                <Button variant="secondary" onClick={() => setAddPlayerId(me.player!.id)}>
                  Use my ID
                </Button>
              )}
              <Button onClick={addParticipant} disabled={!addPlayerId}>
                Add
              </Button>
            </div>
          </div>

          <ErrorText>{actionError}</ErrorText>
        </Card>
      )}

      {isAuthenticated && match.status === "LIVE" && (
        <Card>
          <h2 className="text-heading2">Record an event</h2>
          {composerParticipants.length === 0 ? (
            <p className="mt-xs text-bodySmall text-text-secondary">Add participants above before scoring.</p>
          ) : (
            <div className="mt-sm">
              <EventComposer
                participants={composerParticipants}
                homeTeamId={match.homeTeam.id}
                homeTeamName={match.homeTeam.name}
                awayTeamId={match.awayTeam.id}
                awayTeamName={match.awayTeam.name}
                onSubmit={submitEvent}
              />
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-heading2">Timeline</h2>
        <div className="mt-sm">
          <MatchTimeline events={events} onRetract={retractEvent} canManage={isAuthenticated} />
        </div>
      </Card>
    </div>
  );
}

function StatColumn({
  label,
  s,
}: {
  label: string;
  s: { shots: number; shotsOnTarget: number; yellowCards: number; redCards: number; corners: number };
}) {
  return (
    <div>
      <p className="text-bodySmall font-semibold text-text-primary">{label}</p>
      <dl className="mt-xs flex flex-col gap-[2px] text-caption text-text-secondary">
        <Row label="Shots" value={s.shots} />
        <Row label="On target" value={s.shotsOnTarget} />
        <Row label="Yellow cards" value={s.yellowCards} />
        <Row label="Red cards" value={s.redCards} />
        <Row label="Corners" value={s.corners} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="numeric text-text-primary">{value}</dd>
    </div>
  );
}

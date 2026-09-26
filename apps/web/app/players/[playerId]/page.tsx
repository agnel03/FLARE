"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { Card, Badge } from "@/components/ui";

interface PlayerProfile {
  id: string;
  displayName: string;
  primaryPosition: string;
  preferredFoot: string;
  status: string;
  memberships: { team: { id: string; name: string }; role: string }[];
}

interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<PlayerProfile>(`/players/${playerId}`, { auth: false }),
      apiRequest<PlayerStats>(`/players/${playerId}/stats`, { auth: false }),
    ])
      .then(([p, s]) => {
        setPlayer(p);
        setStats(s);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load profile."));
  }, [playerId]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!player) return <p className="text-text-secondary">Loading profile…</p>;

  return (
    <div className="flex flex-col gap-md">
      <Card className="flex items-center gap-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted text-heading1 font-bold text-brand">
          {player.displayName.charAt(0)}
        </div>
        <div>
          <h1 className="text-heading1">{player.displayName}</h1>
          <p className="text-bodySmall text-text-secondary">
            {player.primaryPosition} · Prefers {player.preferredFoot.toLowerCase()} foot
          </p>
          <Badge tone={player.status === "ACTIVE" ? "success" : "warning"}>{player.status}</Badge>
        </div>
      </Card>

      {stats && (
        <Card>
          <h2 className="text-heading2">Career at a glance</h2>
          <div className="mt-sm grid grid-cols-2 gap-sm sm:grid-cols-5">
            <Stat label="Apps" value={stats.appearances} />
            <Stat label="Goals" value={stats.goals} />
            <Stat label="Assists" value={stats.assists} />
            <Stat label="Yellow" value={stats.yellowCards} />
            <Stat label="Red" value={stats.redCards} />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-heading2">Teams</h2>
        {player.memberships.length === 0 ? (
          <p className="mt-xs text-bodySmall text-text-secondary">Not currently on a team roster.</p>
        ) : (
          <ul className="mt-xs flex flex-col gap-xxs">
            {player.memberships.map((m) => (
              <li key={m.team.id} className="text-bodySmall text-text-primary">
                {m.team.name} <span className="text-text-secondary">· {m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface-muted p-sm text-center">
      <p className="numeric text-numericMedium text-text-primary">{value}</p>
      <p className="text-caption text-text-secondary">{label}</p>
    </div>
  );
}

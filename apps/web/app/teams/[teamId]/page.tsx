"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { Card } from "@/components/ui";

interface Team {
  id: string;
  name: string;
  club: { id: string; name: string } | null;
}

interface Membership {
  role: string;
  player: { id: string; displayName: string };
}

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<Team>(`/teams/${teamId}`, { auth: false }),
      apiRequest<Membership[]>(`/teams/${teamId}/members`, { auth: false }),
    ])
      .then(([t, m]) => {
        setTeam(t);
        setMembers(m);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Failed to load team."));
  }, [teamId]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!team) return <p className="text-text-secondary">Loading team…</p>;

  return (
    <div className="flex flex-col gap-md">
      <Card>
        <h1 className="text-heading1">{team.name}</h1>
        {team.club && <p className="text-bodySmall text-text-secondary">{team.club.name}</p>}
      </Card>

      <Card>
        <h2 className="text-heading2">Roster</h2>
        {members.length === 0 ? (
          <p className="mt-xs text-bodySmall text-text-secondary">No players registered yet.</p>
        ) : (
          <ul className="mt-sm flex flex-col divide-y divide-border">
            {members.map((m) => (
              <li key={m.player.id} className="flex items-center justify-between py-xs">
                <Link href={`/players/${m.player.id}`} className="text-body text-text-primary hover:text-brand">
                  {m.player.displayName}
                </Link>
                <span className="text-caption uppercase text-text-secondary">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

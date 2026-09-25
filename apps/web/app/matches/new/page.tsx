"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { Card, Input, Label, Button, ErrorText } from "@/components/ui";

interface Team {
  id: string;
}
interface Match {
  id: string;
}

export default function NewMatchPage() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !me) {
    return (
      <Card>
        <p className="text-body text-text-secondary">
          You need an account to create a match.{" "}
          <a href="/login" className="text-brand">
            Log in
          </a>
          .
        </p>
      </Card>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const [home, away] = await Promise.all([
        apiRequest<Team>("/teams", { method: "POST", body: { name: homeTeamName } }),
        apiRequest<Team>("/teams", { method: "POST", body: { name: awayTeamName } }),
      ]);
      const match = await apiRequest<Match>("/matches", {
        method: "POST",
        body: {
          homeTeamId: home.id,
          awayTeamId: away.id,
          playersPerSide,
          durationMinutes,
        },
      });
      router.push(`/matches/${match.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create the match.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-heading1">Start a match</h1>
        <p className="mt-xxs text-bodySmall text-text-secondary">
          Name the two sides — FLARE creates the teams and the match together.
        </p>
        <form onSubmit={onSubmit} className="mt-md flex flex-col gap-sm">
          <div>
            <Label>Home team</Label>
            <Input required value={homeTeamName} onChange={(e) => setHomeTeamName(e.target.value)} />
          </div>
          <div>
            <Label>Away team</Label>
            <Input required value={awayTeamName} onChange={(e) => setAwayTeamName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <Label>Players per side</Label>
              <Input
                type="number"
                min={1}
                max={11}
                value={playersPerSide}
                onChange={(e) => setPlayersPerSide(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="mt-xs">
            {submitting ? "Creating…" : "Create match"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

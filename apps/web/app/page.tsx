"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, Button } from "@/components/ui";

export default function HomePage() {
  const { me, loading } = useAuth();

  return (
    <div className="flex flex-col gap-lg">
      <Card className="bg-gradient-to-br from-surface to-surface-muted">
        <p className="text-label text-brand">FOOTBALL LIVE ANALYTICS &amp; REAL-TIME EXPERIENCE</p>
        <h1 className="mt-xxs text-display text-text-primary">Score it. See it. Live.</h1>
        <p className="mt-sm max-w-lg text-body text-text-secondary">
          FLARE captures every football event once and turns it into live scores, match timelines and
          stats — built for the sideline, not a spreadsheet.
        </p>
        <div className="mt-md flex gap-sm">
          {!loading && !me && (
            <>
              <Link href="/register">
                <Button>Create account</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
            </>
          )}
          <Link href="/matches/new">
            <Button variant={!loading && !me ? "ghost" : "primary"}>Start a match</Button>
          </Link>
        </div>
      </Card>

      {!loading && me?.player && (
        <Card>
          <p className="text-bodySmall text-text-secondary">Signed in as</p>
          <p className="text-heading2 text-text-primary">{me.player.displayName}</p>
          <Link href={`/players/${me.player.id}`} className="text-bodySmall text-brand">
            View profile →
          </Link>
        </Card>
      )}
    </div>
  );
}

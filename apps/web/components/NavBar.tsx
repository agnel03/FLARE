"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { me, logout, loading } = useAuth();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-md py-sm">
        <Link href="/" className="flex items-center gap-xxs text-heading2 font-extrabold tracking-tight text-text-primary">
          <span className="text-brand">FLARE</span>
        </Link>
        <nav className="flex items-center gap-md text-bodySmall">
          <Link href="/matches/new" className="text-text-secondary hover:text-text-primary">
            New match
          </Link>
          {!loading && me?.player && (
            <Link href={`/players/${me.player.id}`} className="text-text-secondary hover:text-text-primary">
              My profile
            </Link>
          )}
          {!loading && me ? (
            <button onClick={logout} className="rounded-md border border-border px-sm py-xxs text-text-secondary hover:text-text-primary">
              Log out
            </button>
          ) : (
            !loading && (
              <Link href="/login" className="rounded-md bg-brand px-sm py-xxs font-semibold text-white">
                Log in
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}

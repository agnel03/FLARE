# FLARE — Football Live Analytics & Real-time Experience

A football-native platform for players, teams and clubs: player identity,
live match scoring, the canonical Football Event Engine, and a Match Centre
— built as a real, working product, not a mockup.

This repo implements **Phase 1 (Foundation) + Phase 2 (Core Football)** of
the platform described in the FLARE Master Product Specification (89
consolidated domain documents). It is the first vertical slice of a much
larger product — see [`docs/STATUS.md`](docs/STATUS.md) for exactly what's
implemented, what's deliberately deferred, and the assumptions made where
the spec left an implementation detail open.

## Stack

TypeScript everywhere, in a pnpm + Turborepo monorepo:

- **`apps/api`** — NestJS backend: auth, players, teams, matches, and the
  canonical Football Event Engine. PostgreSQL via Prisma.
- **`apps/web`** — Next.js (App Router) web app: auth, player profiles,
  teams, match creation, the Match Centre, and the Live Scoring Console.
- **`apps/mobile`** — Expo (React Native) app: the mobile-first Live
  Scoring Console — the flagship sideline experience.
- **`packages/db`** — Prisma schema + client, shared by the API.
- **`packages/shared`** — Shared TypeScript types, zod validation schemas,
  the canonical football event taxonomy, and the API contract (error
  codes, response envelope) — one definition, imported everywhere.
- **`packages/design-tokens`** — Color, typography and spacing tokens
  shared by the web (Tailwind) and mobile (React Native `StyleSheet`) apps.

## Prerequisites

- Node.js 20+
- pnpm 10+ (`corepack enable` or `npm i -g pnpm`)
- PostgreSQL 14+ running locally (or point `DATABASE_URL` at any Postgres)

## Setup

```bash
pnpm install

# Copy env and point it at your Postgres instance
cp .env.example .env
cp .env packages/db/.env

# Create the database, then run migrations + seed sample data
createdb flare_dev   # or: psql -c "CREATE DATABASE flare_dev"
pnpm db:migrate
pnpm db:seed
```

The seed script creates a club, two teams, 8 players (login with any of
`alex@example.com` … `drew@example.com`, password `password123`), and one
scheduled match.

## Running it

Build the two workspace packages the apps depend on at runtime, then start
each app in its own terminal:

```bash
# once, or after changing packages/db or packages/shared
pnpm --filter @flare/db build
pnpm --filter @flare/shared build

# terminal 1 — API on :4000
pnpm --filter @flare/api dev

# terminal 2 — web app on :3000
pnpm --filter @flare/web dev

# terminal 3 — mobile app (Expo dev server)
pnpm --filter @flare/mobile dev
```

Open http://localhost:3000. For the mobile app in Expo Go / a simulator,
set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (not `localhost`) before
running `pnpm --filter @flare/mobile dev`.

`pnpm dev` at the repo root runs everything in parallel via Turborepo.

## The core loop, end to end

1. Register / log in.
2. Create a match (creates the two teams too, if new).
3. Add participants (players) to each side.
4. Start the match.
5. Record a **GOAL** — pick the scorer, an optional assist, one of the
   eight default shot options, and the match clock.
6. Watch the score, match stats and timeline update from that one
   canonical event — nothing is written to two places independently.
7. Retract or correct an event and watch the score recalculate, with the
   original event preserved and versioned (never silently overwritten).
8. Complete the match.

## Documentation

- [`docs/STATUS.md`](docs/STATUS.md) — what's built, what isn't, and why,
  measured against the full 89-document specification.

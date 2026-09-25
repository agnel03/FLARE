# FLARE — Build Status

This measures the repo against the full FLARE Master Product Specification
(89 consolidated domain documents, now v2.0 — a build-oriented consolidation
aware of this existing repo, plus an 18-stage execution protocol). It covers
Phase 1 (Foundation), the start of Phase 2 (Core Football), and — as of this
update — v2 Stage 1 (Architectural Hardening) and part of Stage 2 (Design
System). Everything described below is real, working code — it was built,
migrated against a live Postgres database, and exercised end-to-end (curl +
a real browser via Playwright for the web app; a Metro bundle export for the
mobile app). None of it is a mock, a stub UI, or a hard-coded fake response.

See [`REQUIREMENTS_MATRIX.md`](REQUIREMENTS_MATRIX.md) for the row-by-row
coverage table the v2 spec asks for.

## 0. Stage 1 update (this session) — closing the authorization gap

The v1 status report flagged, in its own words: *"any authenticated user
can currently score any live match."* The v2 spec calls this out directly
and makes closing it the flagship Stage 1 requirement. It's closed:

- Added `createdByAccountId` to `Team` and `Match` (migration
  `20260925152633_add_ownership`).
- New `PermissionsService` (`apps/api/src/common/permissions.service.ts`):
  `assertCanManageTeam` / `assertCanOperateMatch` — a user may manage a
  team or operate a match only if they created it, or hold an **active
  CAPTAIN/MANAGER** membership on the relevant team(s). Server-side only,
  resource-scoped, never a frontend-only check.
- Wired into every previously-open endpoint: `teams.addMember`,
  `matches.create/addParticipant/start/pause/resume/complete`,
  `events.create/correct/retract`.
- Added `@nestjs/throttler`: global 100 req/60s per IP, tightened to
  10 req/60s on `/auth/login` and `/auth/register`.
- **Proven, not just written**: a curl adversarial test registered two
  independent accounts, had the owner create a team/match, then confirmed
  the second ("stranger") account gets `403 FORBIDDEN` attempting to start
  the match, add a team member, or record a goal — while the legitimate
  owner's identical actions succeed and the goal correctly updates the
  score. The rate limiter was confirmed by hammering `/auth/login` 12
  times and observing `429` from request #10 onward.
- **Known consequence, not a bug**: matches/teams created before this
  migration have `createdByAccountId = NULL` and no pre-existing
  CAPTAIN/MANAGER memberships, so they're now permanently un-operable by
  anyone. That's correct deny-by-default behavior for a security fix
  applied retroactively to dev/seed data — it would defeat the point of
  the fix to special-case old rows.
- **Still not done** (documented honestly, not silently dropped): this is
  team-level authorization, not the full RBAC the v2 spec ultimately
  wants — there's no platform-admin role, no organization role, and no
  competition-official role yet (a scorer/official who isn't a team
  captain/manager *is* now supported — see Stage 3 below). That's real
  remaining work, tracked as row 43 in the requirements matrix.

## 0.1 Stage 2 update (partial, this session) — elite-club visual identity

The v2 spec calls for an original "elite football club" palette — deep
red, near-black, white, restrained metallic gold — replacing the v1
orange palette, explicitly inspired by (not copied from) clubs like
Manchester United, with no club branding, crests, or proprietary assets.

- `packages/design-tokens/src/colors.ts` and `apps/web/app/globals.css`
  updated together (token *names* unchanged — `background`, `surface`,
  `brand`, etc. — so nothing downstream broke); added a new `gold`/
  `goldMuted` token pair, explicitly reserved for achievements/premium/
  trophies only, never general UI.
- Mobile picks up the same palette automatically (`apps/mobile/src/theme.ts`
  imports `darkColors` from the same package) — confirmed by rebuild.
- Verified visually via Playwright screenshot: home page and Match Centre
  both render the new red/black/white identity correctly, including the
  live scoreboard, LIVE badge, and timeline from the authorization test
  match (1-0, showing the real goal event end-to-end).
- Not done: the rest of Stage 2 (global app shell/nav polish, the full
  named component list from the v2 spec's Section 24, motion/elevation
  tokens) is still open.

## 0.2 Stage 3 update (this session) — match officials/operators

Closes requirements-matrix row 14, the one deliberately-deferred piece
from Stage 1's authorization fix: until now, "who can operate a match"
was hard-wired to team CAPTAIN/MANAGER or the match creator. Real
grassroots matches need a neutral scorer or referee who has no team
relationship at all.

- New `MatchOperator` model (migration `20260925153952_match_operators`):
  `matchId`, `accountId`, `role` (SCORER/OFFICIAL/ORGANIZER),
  `grantedByAccountId`.
- `PermissionsService.assertCanOperateMatch` now checks three paths in
  order: resource creator → active team CAPTAIN/MANAGER → explicit
  `MatchOperator` grant. `assertIsMatchCreator` is a narrower check used
  only for granting/revoking operators — deliberately *not* delegable to
  captains/managers, so scoring rights can't be handed to a stranger by
  someone who only manages one side.
- New endpoints: `POST/GET /matches/:id/operators`,
  `DELETE /matches/:id/operators/:accountId` (assign by email; the
  service resolves the target account, so nobody needs to know another
  user's internal ID).
- **Proven with a 5-step curl adversarial test**: before delegation the
  assignee gets 403 starting the match; a non-creator gets 403 trying to
  grant themselves operator rights; the creator's grant succeeds; the
  delegate can now start the match and would be able to score; a fourth,
  never-delegated account still gets 403 recording an event.
- Web UI: a creator-only "Match operators" panel on the Match Centre
  (grant by email + role, list current operators, revoke) —
  screenshot-verified showing the exact operator granted in the curl test.
- Not done: OFFICIAL/ORGANIZER roles exist in the schema and API but have
  no distinct permissions yet from SCORER (e.g. an OFFICIAL should
  eventually be able to record discipline/cards with elevated trust while
  a SCORER handles routine events) — currently all three roles grant the
  same `assertCanOperateMatch` pass. That's a real, documented
  simplification, not a hidden one.

## 1. Architecture summary

TypeScript monorepo (pnpm workspaces + Turborepo). One backend service, two
clients, three shared packages:

```
Postgres  ←→  packages/db (Prisma)  ←→  apps/api (NestJS)  ←→  apps/web (Next.js)
                                                            ↖  apps/mobile (Expo)
                     packages/shared  (types, zod schemas, event taxonomy, API contract)
                     packages/design-tokens  (colors, typography, spacing)
```

- **Single source of truth for football events.** `packages/db`'s
  `FootballEvent` model is the only place a goal, card, shot or
  substitution is recorded. Match score, match stats, and the timeline are
  all *derived* from that table — never written independently. This
  mirrors the spec's core principle (Source 6, Football Event & Statistics
  Engine): "capture the football action once as structured data and
  derive all downstream outputs from that source."
- **Contract-shared clients.** `packages/shared` holds the zod schemas and
  TS types both the API and the two clients import — the event taxonomy,
  the 8 default shot options, and the API's error-code enum exist in
  exactly one place, not reimplemented per app.
- **One design language, two renderers.** `packages/design-tokens` is
  plain data (hex colors, a type scale, a spacing scale); the web app maps
  it into Tailwind, the mobile app maps it into `StyleSheet` objects — same
  palette, same rhythm, no duplicated hex codes.

## 2. Repository structure

```
apps/
  api/          NestJS backend (see §4)
  web/          Next.js web app (see §5)
  mobile/       Expo React Native app (see §5)
packages/
  db/           Prisma schema + generated client
  shared/       zod DTOs, event taxonomy, API contract types
  design-tokens/ color/typography/spacing tokens
docs/
  STATUS.md     this file
```

## 3. Database schema (`packages/db/prisma/schema.prisma`)

Models, grouped by the domain that owns them in the spec:

- **Identity** (Source 15, 72): `Account` (login identity), `RefreshToken`,
  `PlayerProfile` (the stable football identity — deliberately separate
  from `Account`, per the Player Identity spec's core principle).
- **Team/Club** (Source 66, 86): `Club`, `Team`, `TeamMembership`
  (time-bounded player↔team relationship with role/status).
- **Match** (Source 50, 51, 54, 56, 60): `Venue`, `Match` (configurable
  `playersPerSide`/`durationMinutes`/`periodCount`, not hard-coded 11v11),
  `Period`, `MatchParticipant` (roster + live active/bench state).
- **Football Event Engine** (Source 6): `FootballEvent` — the canonical,
  append-oriented event with the full 55-entry taxonomy from the spec's
  Appendix A as a Prisma enum, a JSON `metadata` column for
  event-type-specific fields, idempotency via a `(matchId, clientEventId)`
  unique constraint, and monotonic `sequence` for deterministic ordering.
  `EventRevision` — every correction/retraction preserves the prior
  metadata + status + actor + reason, so nothing is silently overwritten.

Migrations are checked in (`packages/db/prisma/migrations/`); `pnpm
db:seed` populates a realistic dataset (1 club, 2 teams, 8 players).

## 4. API structure (`apps/api`, NestJS, base path `/v1`)

| Module | Endpoints |
|---|---|
| `auth` | `POST /auth/register`, `/login`, `/refresh` — JWT access + opaque refresh tokens, scrypt password hashing |
| `players` | `GET /me`, `GET/PATCH /players/:id`, `GET /players/:id/stats` |
| `teams` | `POST /teams`, `GET /teams/:id`, `GET/POST /teams/:id/members` |
| `matches` | `POST /matches`, `GET /matches/:id`, `POST /matches/:id/participants`, `POST /matches/:id/{start,pause,resume,complete}`, `GET /matches/:id/{stats,timeline}` |
| `events` | `POST /matches/:id/events` (create), `GET /matches/:id/events`, `PATCH /matches/:id/events/:eventId` (correct), `POST /matches/:id/events/:eventId/retract` |

Every response uses the API spec's envelope (`{data, meta}` /
`{error: {code, message, details, request_id}}`), and every domain failure
throws a typed `ApiException` mapped to the spec's error-code taxonomy
(`VALIDATION_ERROR`, `MATCH_NOT_LIVE`, `STATE_CONFLICT`, …) rather than a
generic framework error.

**The event engine's validation pipeline** (`events.service.ts`), matching
spec Source 6 §5: authenticate → match must be `LIVE` → idempotency check
against `clientEventId` (a retried submission returns the original event,
never a duplicate) → team/participant validation → per-event-type metadata
validation (goal/shot/card/substitution each have their own zod schema) →
transactional persist → immediate projections (score recalculation for
goals, dismissal for red cards, active/bench flip for substitutions).
Corrections and retractions create an `EventRevision` and recompute the
score from the full non-retracted event set — never an incremental
add/subtract that could drift.

## 5. Frontend structure

**Web** (`apps/web`, Next.js App Router + Tailwind, dark-first premium
palette): `/login`, `/register`, `/players/[id]`, `/teams/[id]`,
`/matches/new`, and the flagship `/matches/[id]` — the Match Centre and
Live Scoring Console combined (scoreboard, match stats, lifecycle
controls, participant management, the goal/card/substitution event
composer with the 8 shot options, and the timeline with retract).
Reusable components: `Scoreboard`, `EventComposer`, `MatchTimeline`, plus
a small UI primitive set (`Button`, `Card`, `Input`, `Badge`).

**Mobile** (`apps/mobile`, Expo/React Native): login, register, and a
mobile-first Live Scoring Console screen (large touch targets, team/player
chip selection, one-tap goal recording). Scope is intentionally smaller
than web for this slice — see §7.

## 6. What's implemented (verified, not assumed)

- ✅ Full auth loop: register → login → JWT-authenticated requests → refresh.
- ✅ Team creation and roster management.
- ✅ Match creation with configurable format (players-per-side, duration).
- ✅ Match lifecycle: `SCHEDULED → LIVE → PAUSED/LIVE → COMPLETED`, each
  transition also recording a lifecycle `FootballEvent`.
- ✅ Canonical event capture for `GOAL`, `YELLOW_CARD`/`RED_CARD`/
  `SECOND_YELLOW`, `SUBSTITUTION`, with idempotent retry safety confirmed
  by curl (identical `clientEventId` → identical event, not a duplicate).
- ✅ Live score derived from goal events, including own-goal attribution.
- ✅ Event retraction with automatic score recalculation, confirmed by
  curl (goal → 1-0 → retract → 0-0, `EventRevision` preserved).
- ✅ Match stats (shots, cards, corners) and timeline, both derived
  read-side from the event table.
- ✅ Basic player career stats (goals/assists/cards) derived from events.
- ✅ Design tokens driving both Tailwind (web) and RN `StyleSheet` (mobile)
  from one source.
- ✅ Web app verified in a real Chromium browser via Playwright: registered
  a user, created a match, added a participant, started the match, and
  confirmed the Live Scoring Console renders and is interactive, at both
  desktop and mobile viewport sizes.
- ✅ Mobile app verified via a real Metro bundle export (596 modules,
  zero errors) and a clean `tsc --noEmit`.

## 7. Known assumptions & deliberate simplifications

The spec explicitly allows this: *"If a genuinely unresolved product
decision prevents implementation, identify it clearly and choose the
safest implementation-compatible interpretation while documenting the
assumption."* These are those decisions:

- **Tech stack.** Not specified anywhere in the 89 documents (confirmed by
  grep). Chose TypeScript end-to-end (Next.js + NestJS + Postgres/Prisma +
  Expo) per your explicit choice earlier in this conversation.
- **The eight default shot options' exact labels.** The spec mandates the
  *count* (eight) and the classification *dimensions* (foot/range/
  situation) but never names the eight labels verbatim. Chose: Inside Box
  (Right/Left/Header), Outside Box (Right/Left), Long Range, Free Kick,
  Penalty — stored as data (`packages/shared/src/events.ts`), swappable
  without touching event storage or stats, per the spec's own guidance
  that these are a "configurable ShotOption registry."
  Color values, typography scale, spacing scale similarly: the spec
  requires the token *names* and structure, explicitly leaves exact
  values as "implementation/design decisions."
- **No player/team search yet.** The Search & Discovery domain (spec
  Source 81) isn't built in this slice. Creating a match creates its two
  teams inline; adding a participant requires pasting a Player ID rather
  than searching by name. This is the most visible rough edge in the UI
  today — flagged there directly, not hidden.
- **Scorer authorization is simplified.** Any authenticated user can
  record events for any live match. The full spec (Match Integrity +
  Security specs) requires role-scoped scorer/official authorization per
  match; that permission model isn't built yet, so this is a real gap, not
  just an omission of a nice-to-have.
- **No realtime channel.** Match Centre / Live Scoring Console poll via
  manual refetch after each action, not the spec's WebSocket realtime API
  (Source: API spec §22). Documented in §8 as the top remaining item.
- **Mobile scope is narrower than web.** Mobile records goals only (no
  shot-option detail, no substitutions yet) to keep this slice shippable;
  web has the full composer. Both hit the same API, so extending mobile is
  additive, not a rearchitecture.
- **Match clock is manually entered** (mm:ss on web, minute-only on
  mobile), not derived from a running server clock tied to `PERIOD_STARTED`
  — the spec's Match Clock & Timekeeping domain (Source 50) isn't built
  yet.

## 8. Remaining work (of the 89-document spec, roughly 85 domains are not
started)

Grouped by what the master prompt's own Phase plan calls out next:

- **Phase 2 remainder:** passing/defensive/goalkeeper/possession event
  families exist in the taxonomy and DB enum but have no dedicated
  metadata schema or stats aggregation yet (only goal/shot/card/sub do).
  Match Clock & Timekeeping domain (running server clock, stoppage time).
- **Phase 3 — Statistics:** heat maps, spatial analytics, player rating
  engine, team chemistry, possession/passing/defensive/goalkeeper
  dedicated stat engines.
- **Phase 4 — History:** career/season/year aggregation pipelines, player
  comparison/head-to-head, rankings/leaderboards.
- **Phase 5 — Competition:** the entire Competition/League/Tournament
  domain (RuleSets, standings, brackets, qualification, promotion/
  relegation) — read in depth from the spec but not implemented.
- **Phase 6 — Engagement:** XP, badges, achievements, rewards, avatars,
  performance posters.
- **Phase 7 — Media:** multi-camera capture, synchronization, streaming,
  highlights, replay.
- **Phase 8 — AI:** match/player/tactical intelligence, AI reports and
  commentary.
- **Phase 9 — Premium:** the ₹99/₹249/₹499/₹899 entitlement system,
  streaming credits, paywall UI.
- **Phase 10 — Platform hardening:** the full security/permissions model
  (role-scoped scorer authorization, MFA, audit logging), search &
  discovery, notifications, moderation, observability, disaster recovery,
  accessibility hardening, localization, and the full automated test
  suite (this slice was verified manually/end-to-end, not covered by a
  CI test suite yet).

## 9. Test results

No automated test suite exists yet (that's Phase 10 in the spec's own
roadmap) — everything above was verified manually against a live stack:

- `pnpm --filter @flare/api exec nest build` — 0 errors.
- `pnpm --filter @flare/web exec next build` — 0 errors, all 7 routes
  compiled (2 static, 3 dynamic).
- `pnpm --filter @flare/mobile exec tsc --noEmit` — 0 errors.
- `npx expo export --platform android` — 596 modules bundled, 0 errors.
- Full curl walkthrough against a live Postgres-backed API: register →
  login → create teams → create match → add participant → start match →
  record goal → verify idempotent retry → verify match stats/timeline →
  retract goal → verify score recalculates to 0-0 → complete match.
- Full browser walkthrough (Playwright/Chromium, desktop + mobile
  viewport): home page, register flow, match creation flow, Live Scoring
  Console rendering with real data.

## 10. How to run

See the root [`README.md`](../README.md).

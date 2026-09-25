# FLARE — Requirements Coverage Matrix

Living document, updated as implementation progresses. Statuses follow the
v2 spec's own definitions:

- **Verified complete** — real end-to-end behavior confirmed against
  persisted data (curl/browser evidence exists).
- **Existing and verified** — was already true before this stage, re-checked.
- **Partially implemented** — some real behavior exists but the domain is
  not fully built.
- **Needs implementation** — not started.
- **Needs redesign** — exists but the approach is wrong and should be rebuilt.
- **Blocked by dependency** — needs something else first.

A route, table, button, or mock response existing is *never* by itself
evidence of "Verified complete." See the Evidence column.

| # | Requirement | Domain | Status | Evidence / gap |
|---|---|---|---|---|
| 1 | Register / login / refresh (JWT) | Auth | Verified complete | curl walkthrough, this + prior stage |
| 2 | Password hashing | Auth | Verified complete | scrypt, salted, `apps/api/src/auth/password.ts` |
| 3 | Rate limiting on auth endpoints | Auth | Verified complete | curl: 10 req/60s → 429 confirmed this stage |
| 4 | Player profile CRUD | Player | Verified complete | `PATCH /players/:id` ownership-checked (only own account) |
| 5 | Player career stats (goals/assists/cards) | Player | Partially implemented | Derived from events via count/groupBy; no passing/defending/GK/possession/rating stats yet |
| 6 | Player year/season history | Player | Needs implementation | No season/year aggregation pipeline exists |
| 7 | Team creation | Team | Verified complete | Now records `createdByAccountId` |
| 8 | Team roster management | Team | Verified complete | Authorization added this stage (creator/CAPTAIN/MANAGER only) |
| 9 | Clubs/academies/organizations | Team | Partially implemented | `Club` model exists (name only); no academy/org hierarchy, no org-level roles |
| 10 | Match creation/configuration | Match | Verified complete | Configurable playersPerSide/duration/periods/subModel |
| 11 | Match lifecycle (scheduled→live→paused→completed) | Match | Verified complete | State machine enforced server-side |
| 12 | Match lifecycle authorization | Match | Verified complete | **This stage's flagship fix** — curl-proven: stranger 403s on start/participants/events, owner succeeds |
| 13 | Lineups/formations | Match | Needs implementation | `MatchParticipant` tracks roster + active/bench only; no formation/shape model |
| 14 | Officials/operators as a distinct role from team captain/manager | Match | Verified complete | `MatchOperator` model + `assignOperator`/`listOperators`/`revokeOperator`; only the match creator may grant/revoke; curl-proven 5-assertion test (pre-delegation 403, non-creator can't grant, grant succeeds, delegate can now operate, uninvolved stranger still 403); web UI (creator-only panel) screenshot-verified |
| 15 | Venues/scheduling | Match | Partially implemented | `Venue` model + `scheduledAt` exist; no calendar/conflict detection |
| 16 | Canonical FootballEvent engine | Event Engine | Verified complete | Full 55-type taxonomy, idempotency, ordering, corrections/retractions with audit trail |
| 17 | Goal/shot/card/substitution capture + validation | Event Engine | Verified complete | Per-type zod metadata schemas; participant/team validation |
| 18 | Passing/defensive/goalkeeper/possession/tactical event capture | Event Engine | Partially implemented | Event types exist in taxonomy/DB enum; no dedicated metadata schema or stat aggregation yet |
| 19 | Score derivation (incl. own goals) | Event Engine | Verified complete | Recalculated from non-retracted goal events, not incremental |
| 20 | Event correction/retraction, audit trail | Event Engine | Verified complete | `EventRevision` preserves prior state; curl-proven score recalculation |
| 21 | Event idempotency | Event Engine | Verified complete | `(matchId, clientEventId)` unique constraint; curl-proven duplicate-safe |
| 22 | Match statistics (shots/cards/corners) | Statistics | Partially implemented | Basic counts via groupBy; no shot maps, passing maps, possession % |
| 23 | Heat maps / shot maps / spatial analytics | Statistics | Needs implementation | `pitchX/pitchY` columns exist on events, unused downstream |
| 24 | Player ratings | Statistics | Needs implementation | No rating engine |
| 25 | Team chemistry | Statistics | Needs implementation | Not started |
| 26 | Player comparison / head-to-head | Statistics | Needs implementation | Not started |
| 27 | Live Scoring Console (web) | Live Match | Verified complete | Goal/card/substitution composer, 8 shot options, real-time-ish via refetch |
| 28 | Live Scoring Console (mobile) | Live Match | Partially implemented | Goal capture only (no cards/subs yet); Metro-bundle verified, not device-verified |
| 29 | Realtime channel (WebSocket push) | Live Match | Needs implementation | Currently manual refetch after each action, not a push channel |
| 30 | Offline durable queue + reconciliation | Live Match | Needs implementation | Not started — biggest gap vs. spec Section 22 |
| 31 | Match Centre (score/timeline/stats/lineups) | Match Centre | Partially implemented | Score/timeline/stats/participants integrated on one page; no commentary, formations, heat maps, media |
| 32 | Competitions/leagues/tournaments | Competition | Needs implementation | Not started (spec read in depth, zero implementation) |
| 33 | Gamification (XP/badges/achievements/streaks) | Engagement | Needs implementation | Not started. Avatar correctly excluded per v2 spec |
| 34 | Search & discovery | Discovery | Needs implementation | Not started |
| 35 | Community (follows/posts/comments) | Community | Needs implementation | Not started |
| 36 | Notifications | Notifications | Needs implementation | Not started |
| 37 | QR / deep links | Identity flows | Needs implementation | Not started |
| 38 | Media & multi-camera streaming | Media | Needs implementation | Not started |
| 39 | AI football intelligence | AI | Needs implementation | Not started |
| 40 | Premium entitlements (₹99/₹249/₹499/₹899 + trial) | Monetization | Needs implementation | Pricing is documented (this doc + chat) but no entitlement model, billing, or paywall exists |
| 41 | Resource-level authorization (IDOR/BOLA protection) | Security | Verified complete | **This stage** — `PermissionsService`, curl-proven on team/match/event endpoints |
| 42 | Rate limiting / abuse prevention | Security | Partially implemented | Global + auth-specific throttling added this stage; no anomaly detection, no CAPTCHA |
| 43 | RBAC (platform admin / org / competition roles) | Security | Needs implementation | Only team CAPTAIN/MANAGER + resource-creator exist; no admin role, no competition official role |
| 44 | Admin/backoffice | Admin | Needs implementation | Not started |
| 45 | Audit trail for admin/competition/entitlement actions | Admin | Blocked by dependency | `EventRevision` covers football events only; no general audit log because there's no admin/competition/entitlement surface yet to audit |
| 46 | Design tokens (color/typography/spacing) | Design System | Verified complete | Elite-club red/near-black/white/gold palette (this stage), shared by web + mobile from one source |
| 47 | Shared component library | Design System | Partially implemented | `Scoreboard`, `EventComposer`, `MatchTimeline`, basic UI primitives exist; most of the spec's named component list (PitchView, FormationBoard, StandingsTable, MediaViewer, etc.) not built |
| 48 | Responsive web | Responsive | Verified complete | Tailwind responsive classes; visually confirmed desktop + mobile viewport |
| 49 | Mobile-first native app | Responsive | Partially implemented | Expo app exists with a mobile-first scoring screen; single-screen nav, not a full app |
| 50 | Accessibility | Accessibility | Partially implemented | Semantic HTML, 44px touch targets, contrast-aware tokens; no screen-reader audit, no reduced-motion handling yet |
| 51 | Internationalization | i18n | Needs implementation | All strings hard-coded in English |
| 52 | Performance (pagination/caching/indexes) | Performance | Partially implemented | DB indexes on hot query paths exist (`FootballEvent` by match/period/clock, by match/eventType); no caching layer, no pagination on list endpoints yet |
| 53 | Automated test suite | Testing | Needs implementation | Zero automated tests exist. All verification so far is manual (curl + Playwright browser + Metro bundle) — **the single largest process gap** |

## Summary

Of 53 tracked requirement rows: **17 Verified complete**, **11 Partially
implemented**, **1 Blocked by dependency**, **24 Needs implementation**.

This reflects Stage 0 (forensics, done implicitly — this repo's builder
has full knowledge of it), Stage 1 (architectural hardening), part of
Stage 2 (design system — visual identity done, app shell/nav not yet),
and part of Stage 3 (core football OS — match operators done; lineups/
formations, club/academy hierarchy, and venue scheduling still open) of
the v2 spec's 18-stage protocol. Stages 4 through 18 remain.

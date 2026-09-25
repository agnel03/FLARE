# FLARE — Permission Matrix

This is the authoritative source of truth for FLARE's authorization model.
Per the build protocol that requested this artifact:

```text
PERMISSION MATRIX
       ↕
AUTHORIZATION CODE
       ↕
AUTOMATED AUTHORIZATION TESTS
```

These three must stay synchronized. Concretely, in this repo:

- **Permission identifiers & role→permission grants (the data)**:
  [`packages/shared/src/permissions.ts`](../packages/shared/src/permissions.ts)
- **Enforcement (the code)**:
  [`apps/api/src/common/permissions.service.ts`](../apps/api/src/common/permissions.service.ts)
- **Automated tests**: [`apps/api/test/`](../apps/api/test/) (Jest) and the
  executable black-box script
  [`apps/api/test/manual/permission-matrix.sh`](../apps/api/test/manual/permission-matrix.sh)
- **This document**: the *why*, in prose, for humans.

If any of the four disagree, the implementation is not complete — treat
that as a bug, not a documentation lag.

## 1. Scope of this document

This repo currently implements **match-scoped and team-scoped**
authorization only — the resources that actually exist: `Match`, `Team`,
`FootballEvent`, `MatchOperator`, `PlayerProfile`. Section 9 below lists
every role the wider FLARE product spec names, and Section 10 lists the
permission identifiers for domains the spec describes but this repo
**has not built yet** (competitions, media, community, premium,
platform admin). Those are documented as *intended* names so future work
doesn't invent conflicting ones, but there is **no enforcement code
behind them** — do not read their presence in this file as a claim they
work.

## 2. Roles

### 2.1 Implemented and enforced

| Role | Canonical name in code | Scope | How it's acquired |
|---|---|---|---|
| Account holder | `Account` | Platform-wide identity | Registration |
| Player | `PlayerProfile` | Own profile | Created 1:1 with an Account at registration |
| Match creator | `Match.createdByAccountId` | One match | Whoever calls `POST /matches` |
| Team creator | `Team.createdByAccountId` | One team | Whoever calls `POST /teams` |
| Team captain | `TeamMembership.role = CAPTAIN` | One team | Granted by whoever can manage that team |
| Team manager | `TeamMembership.role = MANAGER` | One team | Granted by whoever can manage that team |
| Match scorer | `MatchOperator.role = SCORER` | One match | Granted by that match's creator only |
| Match official | `MatchOperator.role = OFFICIAL` | One match | Granted by that match's creator only |
| Match organizer | `MatchOperator.role = ORGANIZER` | One match | Granted by that match's creator only |
| Viewer / public | *(no role — unauthenticated or authenticated-but-unrelated)* | Public resources only | N/A |

### 2.2 Named by the wider spec, not yet implemented

Listed so nobody invents a second name for the same concept later.

| Spec role | Intended scope | Status |
|---|---|---|
| Club administrator | One club | Not implemented — `Club` model has no admin/role concept yet, just a name and a list of teams |
| Academy administrator | One academy | Not implemented — no academy concept exists |
| Organization administrator | One organization | Not implemented |
| Competition administrator | One competition | Not implemented — no competition domain exists yet (requirements matrix row 32) |
| Competition organizer | One competition | Not implemented (distinct from the implemented match-scoped `ORGANIZER` operator role, which only affects one match) |
| Moderator | Platform-wide, content-scoped | Not implemented — no community domain exists yet |
| Support/Operations | Platform-wide | Not implemented — no admin/support domain exists yet |
| Platform administrator | Platform-wide | Not implemented — there is no admin surface at all yet |

## 3. Permission identifiers

Defined in `packages/shared/src/permissions.ts`. Naming convention:
`<RESOURCE>_<ACTION>`.

### 3.1 Match permissions (`MatchPermission`)

| Identifier | Meaning |
|---|---|
| `MATCH_EVENT_CREATE` | Record a routine canonical `FootballEvent` (goal, shot, card, substitution, …) |
| `MATCH_EVENT_CORRECT` | Amend an existing event's metadata/clock (creates an `EventRevision`) |
| `MATCH_EVENT_RETRACT` | Void an existing event (creates an `EventRevision`, excluded from stats) |
| `MATCH_LIFECYCLE_MANAGE` | Start / pause / resume the match clock and periods |
| `MATCH_FINALIZE` | Complete the match — the highest-trust lifecycle action |
| `MATCH_LINEUP_MANAGE` | Add/manage participants for this specific match |
| `MATCH_OPERATOR_LIST` | View the match's delegated operators |
| `MATCH_OPERATOR_GRANT` | Delegate SCORER/OFFICIAL/ORGANIZER to another account |
| `MATCH_OPERATOR_REVOKE` | Revoke a delegation |

`MATCH_VIEW` (reading a match/timeline/stats) is **not** a listed
permission because it's intentionally public/unauthenticated — every
`GET` match/team/player endpoint in this repo has no auth guard. There is
no private-match or private-team visibility mode implemented yet; if one
is added later, `MATCH_VIEW`/`TEAM_VIEW` become real checks and this
document must be updated first.

### 3.2 Team permissions (`TeamPermission`)

| Identifier | Meaning |
|---|---|
| `TEAM_ROSTER_MANAGE` | Add a player to the team's persistent roster |

### 3.3 Specified, not yet implemented

These names are reserved for when their owning domain gets built (see
`docs/REQUIREMENTS_MATRIX.md` for which rows). Do not implement partial
enforcement for these without updating this document first.

```text
COMPETITION_VIEW, COMPETITION_CREATE, COMPETITION_UPDATE,
COMPETITION_RULE_MANAGE, COMPETITION_REGISTRATION_MANAGE,
COMPETITION_FIXTURE_MANAGE, COMPETITION_STANDINGS_MANAGE,
COMPETITION_APPEAL_MANAGE

MEDIA_VIEW, MEDIA_RESTRICTED_VIEW, MEDIA_UPLOAD, MEDIA_MANAGE,
MEDIA_STREAM_MANAGE, MEDIA_HIGHLIGHT_MANAGE

COMMUNITY_POST_CREATE, COMMUNITY_POST_MODERATE, COMMUNITY_REPORT,
COMMUNITY_ACCOUNT_RESTRICT

PREMIUM_ENTITLEMENT_VIEW, PREMIUM_ENTITLEMENT_ADMINISTER

ADMIN_USER_MANAGE, ADMIN_AUDIT_VIEW, ADMIN_CONFIG_MANAGE,
ADMIN_FEATURE_FLAG_MANAGE, ADMIN_DISPUTE_MANAGE
```

## 4. Role → permission matrix

Computed by `PermissionsService.assertMatchPermission`: the effective
permission set for `(account, match)` is the **union** of every
applicable role. The match **creator** is a special case — implicitly
granted every `MatchPermission` — rather than a row in the table, because
"creator" isn't a role that could ever be *revoked* like the others; it's
an immutable fact about who made the resource.

| Permission | Creator | Team Captain | Team Manager | Scorer | Official | Organizer | Unrelated account |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `MATCH_EVENT_CREATE` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `MATCH_EVENT_CORRECT` | ✓ | ✓ | ✓ | — | ✓ | — | — |
| `MATCH_EVENT_RETRACT` | ✓ | ✓ | ✓ | — | ✓ | — | — |
| `MATCH_LIFECYCLE_MANAGE` | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| `MATCH_FINALIZE` | ✓ | ✓ | ✓ | — | ✓ | — | — |
| `MATCH_LINEUP_MANAGE` | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `MATCH_OPERATOR_LIST` | ✓ | — | — | — | — | — | — |
| `MATCH_OPERATOR_GRANT` | ✓ | — | — | — | — | — | — |
| `MATCH_OPERATOR_REVOKE` | ✓ | — | — | — | — | — | — |
| `TEAM_ROSTER_MANAGE` (own team) | *(team creator, separate check)* | ✓ | ✓ | n/a | n/a | n/a | — |

**Design rationale** (the "why", since a table alone can't justify itself):

- **Team Captain/Manager keep full operational trust**, unchanged from
  before this refinement. They already had this before roles were
  differentiated, and restricting them wasn't asked for or motivated by
  any risk — a team's own captain/manager scoring their own team's match
  is the normal case, not an edge case.
- **Scorer is deliberately the narrowest role**: "someone I trust to tap
  in goals, nothing else." No correction, no retraction, no clock
  control, no lineup changes. If a scorer makes a mistake, only an
  Official/Captain/Manager/Creator can fix it — this is intentional
  friction, not an oversight.
- **Official mirrors a real match official's authority**: full trust
  over the football record (create/correct/retract events, clock,
  finalize) but *not* the lineup — assembling a squad is a team/organizer
  concern, not a match official's job in real football either.
- **Organizer is match-day logistics, not football judgment**: can manage
  the lineup and control the clock (kickoff/pause) but cannot touch the
  football record at all (no event create/correct/retract) and cannot
  finalize (finalizing is certifying the *football result*, which is an
  Official/team/Creator call, not a logistics call).
- **Operator management is creator-only, full stop**, granted to no
  delegated role — see Section 8 (Delegation).

## 5. Resource scope

Every permission check in Section 4 is evaluated **per-resource**, not
globally. A permission identifier alone (`MATCH_EVENT_CREATE`) is
meaningless without the resource it's scoped to:

> `assertMatchPermission(accountId, matchId, "MATCH_EVENT_CREATE")` means
> "does this account hold `MATCH_EVENT_CREATE` **on this specific
> match**?" — never "does this account have scorer powers anywhere."

Concretely, the scope categories that exist today:

| Scope | Meaning | Example |
|---|---|---|
| Own resource | The account created it | Match/Team creator |
| Team resource | Active CAPTAIN/MANAGER membership on that specific team | Team roster management |
| Match resource | Active `MatchOperator` row for that specific match | Delegated SCORER/OFFICIAL/ORGANIZER |
| Public resource | No ownership check — open to any request | `GET` match/team/player reads |

`own account` scope also exists outside match/team resources:
`PATCH /players/:id` requires `player.accountId === requester.accountId`
— a player can only edit their own profile, checked in
`PlayersService.update`, not `PermissionsService` (it's a simpler
same-account check, not a role lookup).

## 6. Conditions

| Action | Required permission | Additional condition enforced in code |
|---|---|---|
| Record event | `MATCH_EVENT_CREATE` | Match status must be `LIVE` (`EventsService.create`); referenced players must be registered `MatchParticipant`s of that match |
| Correct event | `MATCH_EVENT_CORRECT` | Event must not already be `RETRACTED` |
| Retract event | `MATCH_EVENT_RETRACT` | Idempotent — retracting an already-retracted event is a no-op, not an error |
| Start match | `MATCH_LIFECYCLE_MANAGE` | Match must be `SCHEDULED` |
| Pause match | `MATCH_LIFECYCLE_MANAGE` | Match must be `LIVE` |
| Resume match | `MATCH_LIFECYCLE_MANAGE` | Match must be `PAUSED` |
| Finalize match | `MATCH_FINALIZE` | Match must be `LIVE` or `PAUSED` |
| Manage lineup | `MATCH_LINEUP_MANAGE` | Match must not be `COMPLETED`/`CANCELLED`; player not already registered; team must be one of the match's two teams |
| Grant operator | *(creator-only, not a table permission — see §8)* | Target account must exist (resolved by email) |
| Revoke operator | *(creator-only, not a table permission — see §8)* | — |
| Manage team roster | `TEAM_ROSTER_MANAGE` | Player not already an active member of that team |
| Edit player profile | *(same-account check, not a permission)* | `player.accountId === requester.accountId` |

## 7. Explicit deny rules

Every row below is covered by an automated test (Jest and/or the
`permission-matrix.sh` script — see Section 13).

| Denied action | Why it's denied |
|---|---|
| Authenticated user scores an unrelated match | No creator/team-role/operator relationship to that match |
| Unrelated team member modifies another team's roster | `assertCanManageTeam` requires creator or active CAPTAIN/MANAGER on *that* team |
| SCORER corrects or retracts an event | Not in SCORER's permission set (Section 4) |
| SCORER controls the match clock or finalizes | Not in SCORER's permission set |
| ORGANIZER records a football event | Not in ORGANIZER's permission set |
| OFFICIAL manages the lineup | Not in OFFICIAL's permission set |
| Any delegated operator (SCORER/OFFICIAL/ORGANIZER) grants or revokes another operator | Operator management is creator-only (Section 8) — delegated authority is not further delegable |
| A non-creator grants themselves an operator role | `assertIsMatchCreator` rejects any accountId that isn't `match.createdByAccountId` |
| Revoked operator continues to act | The `MatchOperator` row is deleted; the next request re-evaluates from scratch and finds nothing |
| Team manager acts on a match involving a team they don't manage | `assertMatchPermission` only looks at memberships on `match.homeTeamId`/`match.awayTeamId` |
| Changing a resource ID to bypass authorization (IDOR) | Every check re-derives the resource from the ID in the URL and re-checks from zero — there is no cached/trusted client-supplied role |
| Calling a privileged endpoint directly without the UI | The API has no separate "UI-only" trust boundary — every guard/permission check runs regardless of caller |
| Unauthenticated request to any mutating endpoint | `JwtAuthGuard` rejects with `AUTHENTICATION_REQUIRED` before any permission logic runs |

## 8. Delegation model (`MatchOperator`)

> **Delegated permissions are not automatically delegable.** A SCORER,
> OFFICIAL, or ORGANIZER cannot grant or revoke anyone else's access,
> including another instance of their own role. Only the match creator
> can.

| Question | Answer |
|---|---|
| Who can grant? | The match creator only (`assertIsMatchCreator`) |
| Who can receive? | Any existing FLARE account, resolved by email |
| What is granted? | Exactly one of SCORER / OFFICIAL / ORGANIZER per `(match, account)` pair |
| Scope | Single match — a grant on match A has no effect on match B |
| Start time | Immediate on grant |
| Expiry | None implemented — a grant lasts until explicitly revoked or the underlying match/account is deleted (cascade) |
| Revocation | The match creator only; immediate — the next authorization check simply finds no `MatchOperator` row |
| Audit trail | `MatchOperator.grantedByAccountId` + `createdAt` record who granted it and when. There is no separate revocation-audit record yet — a revoke is a hard delete, not a soft-revoke with history. **Documented gap**: this should become an append-only audit log before this is used for anything beyond development/testing. |
| Duplicate assignment | `assignOperator` uses `upsert` on the `(matchId, accountId)` unique constraint — re-granting the same account updates their role rather than erroring or creating a duplicate row |
| Survives match completion? | Yes — the `MatchOperator` row is not deleted when a match completes, though it becomes moot since no further mutations are possible on a `COMPLETED` match anyway |
| Self-delegable? | No — nothing stops a creator from granting themselves an operator role, but it's a no-op since the creator already implicitly holds every permission |

## 9. Authorization decision flow

Implemented in `PermissionsService`, called from every controller that
needs it — never re-implemented inline in a controller:

```text
Request
  ↓
Authenticate account            (JwtAuthGuard, before any handler runs)
  ↓
Identify resource                (matchId/teamId from the URL)
  ↓
Load resource + ownership        (Match.createdByAccountId / Team.createdByAccountId)
  ↓
Resolve team-scoped roles        (active TeamMembership CAPTAIN/MANAGER on the relevant team(s))
  ↓
Resolve match-scoped delegations (MatchOperator row for this account+match)
  ↓
Union → effective permission set
  ↓
Is the required permission in that set?
  ↓
Allow → continue to business logic (which re-validates resource STATE, e.g. match must be LIVE)
Deny  → throw ApiException("FORBIDDEN", …) → HTTP 403, error.code = "FORBIDDEN"
```

Resource-not-found is checked first and separately
(`ApiException("RESOURCE_NOT_FOUND", …)` → 404) so a stranger probing
random UUIDs gets 404s for nonexistent matches and 403s for real ones
they can't touch — no information leak either way, but also no
conflation of the two failure modes in the response contract.

## 10. API enforcement map

Every privileged endpoint, its required permission, and where it's
tested. "Endpoint has no UI" is never a reason it's unprotected — every
row below is enforced regardless of whether the web/mobile app currently
calls it.

| Endpoint | Method | Required permission | Scope | Jest | Manual script |
|---|---|---|---|:-:|:-:|
| `/auth/register` | POST | *(none — public)* | — | ✓ | — |
| `/auth/login` | POST | *(none — public, but rate-limited)* | — | ✓ | — |
| `/players/:id` | PATCH | *(same-account check)* | Own profile | ✓ | — |
| `/teams` | POST | *(none — any authenticated account)* | — | ✓ | — |
| `/teams/:id/members` | POST | `TEAM_ROSTER_MANAGE` | Team | ✓ | — |
| `/matches` | POST | *(none — any authenticated account)* | — | ✓ | — |
| `/matches/:id/participants` | POST | `MATCH_LINEUP_MANAGE` | Match | ✓ | ✓ |
| `/matches/:id/start` | POST | `MATCH_LIFECYCLE_MANAGE` | Match | ✓ | ✓ |
| `/matches/:id/pause` | POST | `MATCH_LIFECYCLE_MANAGE` | Match | ✓ | — |
| `/matches/:id/resume` | POST | `MATCH_LIFECYCLE_MANAGE` | Match | ✓ | — |
| `/matches/:id/complete` | POST | `MATCH_FINALIZE` | Match | ✓ | ✓ |
| `/matches/:id/operators` | POST | *(creator-only)* | Match | ✓ | ✓ |
| `/matches/:id/operators` | GET | *(creator-only)* | Match | ✓ | — |
| `/matches/:id/operators/:accountId` | DELETE | *(creator-only)* | Match | ✓ | ✓ |
| `/matches/:id/events` | POST | `MATCH_EVENT_CREATE` | Match | ✓ | ✓ |
| `/matches/:id/events/:eventId` | PATCH | `MATCH_EVENT_CORRECT` | Match | ✓ | ✓ |
| `/matches/:id/events/:eventId/retract` | POST | `MATCH_EVENT_RETRACT` | Match | ✓ | ✓ |

## 11. Automated permission test matrix

The concrete scenarios covered by `apps/api/test/authorization.spec.ts`
and `apps/api/test/manual/permission-matrix.sh` (16/16 passing as of this
writing — see `docs/STATUS.md` for the run transcript):

| Actor | Resource | Action | Expected |
|---|---|---|---|
| Match creator | Own match, SCHEDULED | Start | ALLOW |
| Delegated SCORER | Own match, SCHEDULED | Start | DENY |
| Delegated ORGANIZER | Own match, SCHEDULED | Start | ALLOW |
| Delegated OFFICIAL | Own match, LIVE | Manage lineup | DENY |
| Delegated ORGANIZER | Own match, LIVE | Manage lineup | ALLOW |
| Delegated ORGANIZER | Own match, LIVE | Record event | DENY |
| Delegated SCORER | Own match, LIVE | Record event | ALLOW |
| Delegated SCORER | Own event | Correct | DENY |
| Delegated SCORER | Own event | Retract | DENY |
| Delegated OFFICIAL | Own event | Correct | ALLOW |
| Team CAPTAIN/MANAGER | Own team's match | Record event | ALLOW |
| Team MANAGER | Unrelated match | Record event | DENY |
| Unrelated account | Any match | Record event | DENY |
| Unrelated account | Any match | Self-grant operator | DENY |
| Unrelated account | Any match | Finalize | DENY |
| Revoked SCORER | Formerly-assigned match | Record event | DENY (immediately after revocation) |
| Delegated OFFICIAL | Own match | Finalize | ALLOW |

## 12. Keeping this in sync

Before adding or changing any permission:

1. Add/change the identifier in `packages/shared/src/permissions.ts` and
   its role grants in `MATCH_ROLE_PERMISSIONS`.
2. Update the call site in the relevant `*.service.ts` to check the new
   permission via `PermissionsService.assertMatchPermission` (never a new
   ad hoc check).
3. Update Sections 4, 6, 7, 10 and 11 of this document.
4. Add/update the corresponding Jest test and, if it's adversarial and
   worth a black-box proof, a row in `permission-matrix.sh`.

If code and this document disagree, treat it as a bug to fix, not a
documentation lag to ignore.

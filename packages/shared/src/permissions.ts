/**
 * FLARE authorization model — single source of truth for permission
 * identifiers and static role→permission grants. This file, the
 * enforcement code in apps/api/src/common/permissions.service.ts, the
 * automated tests in apps/api/test/, and docs/PERMISSION_MATRIX.md must
 * all stay in sync; docs/PERMISSION_MATRIX.md documents *why* each grant
 * exists, this file is the machine-checkable *what*.
 *
 * Scope: this file currently covers only the resources that are actually
 * implemented (match-scoped and team-scoped authorization). Permission
 * identifiers for domains the spec describes but this repo hasn't built
 * yet (competitions, media, community, admin, premium) are intentionally
 * NOT defined here — inventing enforcement code for endpoints that don't
 * exist would be fake completeness. See docs/PERMISSION_MATRIX.md
 * Section "Specified, not yet implemented" for those.
 */

// ---------------------------------------------------------------------------
// Permission identifiers
// ---------------------------------------------------------------------------

export const MATCH_PERMISSIONS = [
  /** Record a routine canonical FootballEvent (goal/shot/card/substitution/etc). */
  "MATCH_EVENT_CREATE",
  /** Amend an existing event's metadata/clock (creates an EventRevision). */
  "MATCH_EVENT_CORRECT",
  /** Void an existing event (creates an EventRevision, excludes from stats). */
  "MATCH_EVENT_RETRACT",
  /** Start / pause / resume the match clock and periods. */
  "MATCH_LIFECYCLE_MANAGE",
  /** Complete (finalize) the match — the highest-trust lifecycle action. */
  "MATCH_FINALIZE",
  /** Add/manage match participants (roster for this specific match). */
  "MATCH_LINEUP_MANAGE",
  /** View the list of match operators (delegated scorers/officials/organizers). */
  "MATCH_OPERATOR_LIST",
  /** Grant a match-operator delegation to another account. */
  "MATCH_OPERATOR_GRANT",
  /** Revoke a match-operator delegation. */
  "MATCH_OPERATOR_REVOKE",
] as const;
export type MatchPermission = (typeof MATCH_PERMISSIONS)[number];

export const TEAM_PERMISSIONS = [
  /** Add a player to the team's persistent roster. */
  "TEAM_ROSTER_MANAGE",
] as const;
export type TeamPermission = (typeof TEAM_PERMISSIONS)[number];

// ---------------------------------------------------------------------------
// Match-scoped roles and their static permission grants
// ---------------------------------------------------------------------------

/**
 * A "role" here is match-scoped, not a global user attribute — the same
 * account can be CREATOR on one match, TEAM_CAPTAIN on another it didn't
 * create, and hold no role at all on a third. The effective permission
 * set for (account, match) is the UNION of every role that applies.
 */
export const MATCH_ROLES = [
  "CREATOR",
  "TEAM_CAPTAIN",
  "TEAM_MANAGER",
  "SCORER",
  "OFFICIAL",
  "ORGANIZER",
] as const;
export type MatchRole = (typeof MATCH_ROLES)[number];

/**
 * CREATOR is deliberately not listed here — it is handled as "grants
 * every MATCH_PERMISSION" directly in PermissionsService, rather than
 * duplicating the full permission list in this table. Every other role's
 * grant set is authoritative here.
 *
 * Rationale for each row (see docs/PERMISSION_MATRIX.md for the full
 * write-up):
 * - TEAM_CAPTAIN / TEAM_MANAGER: full operational trust for their own
 *   team's matches (unchanged from the pre-refinement behavior) — they
 *   can score, correct, retract, control the clock, finalize, and manage
 *   the lineup. They cannot touch match-operator delegation — that stays
 *   creator-only regardless of team role (delegated authority is not
 *   further delegable).
 * - SCORER: the narrowest role — records events only. Cannot correct,
 *   retract, control the clock, finalize, or manage the lineup. This is
 *   the "someone I trust to tap in goals, nothing else" role.
 * - OFFICIAL: full event-lifecycle trust (create/correct/retract,
 *   clock control, finalize) — mirrors a real match official's
 *   authority — but cannot manage the lineup (that's a team/organizer
 *   concern, not an official's) and cannot manage operator delegation.
 * - ORGANIZER: match-day logistics — lineup management and clock
 *   control (kickoff/pause) — but does NOT record football events and
 *   does NOT correct/retract/finalize (that's the scorer/official's
 *   football judgment, not the organizer's) and cannot manage operator
 *   delegation.
 */
export const MATCH_ROLE_PERMISSIONS: Record<Exclude<MatchRole, "CREATOR">, readonly MatchPermission[]> = {
  TEAM_CAPTAIN: [
    "MATCH_EVENT_CREATE",
    "MATCH_EVENT_CORRECT",
    "MATCH_EVENT_RETRACT",
    "MATCH_LIFECYCLE_MANAGE",
    "MATCH_FINALIZE",
    "MATCH_LINEUP_MANAGE",
  ],
  TEAM_MANAGER: [
    "MATCH_EVENT_CREATE",
    "MATCH_EVENT_CORRECT",
    "MATCH_EVENT_RETRACT",
    "MATCH_LIFECYCLE_MANAGE",
    "MATCH_FINALIZE",
    "MATCH_LINEUP_MANAGE",
  ],
  SCORER: ["MATCH_EVENT_CREATE"],
  OFFICIAL: ["MATCH_EVENT_CREATE", "MATCH_EVENT_CORRECT", "MATCH_EVENT_RETRACT", "MATCH_LIFECYCLE_MANAGE", "MATCH_FINALIZE"],
  ORGANIZER: ["MATCH_LIFECYCLE_MANAGE", "MATCH_LINEUP_MANAGE"],
};

/**
 * MATCH_OPERATOR_LIST/GRANT/REVOKE are intentionally granted to NO role
 * in the table above, including OFFICIAL/ORGANIZER — only the match
 * CREATOR holds them, enforced directly (not via this table) by
 * PermissionsService.assertIsMatchCreator. This encodes "delegated
 * permissions are not automatically delegable": an ORGANIZER cannot turn
 * around and grant SCORER rights to someone else.
 */
export const OPERATOR_MANAGEMENT_PERMISSIONS: readonly MatchPermission[] = [
  "MATCH_OPERATOR_LIST",
  "MATCH_OPERATOR_GRANT",
  "MATCH_OPERATOR_REVOKE",
];

/**
 * Canonical football event taxonomy — mirrors the "Minimum Event Registry"
 * (Appendix A) of the Football Event & Statistics Engine Specification.
 * This is the single list every app (api/web/mobile) imports; nobody
 * redefines event type strings locally.
 */
export const FOOTBALL_EVENT_TYPES = [
  "MATCH_CREATED",
  "MATCH_STARTED",
  "PERIOD_STARTED",
  "PERIOD_ENDED",
  "HALF_TIME",
  "MATCH_PAUSED",
  "MATCH_RESUMED",
  "MATCH_COMPLETED",
  "GOAL",
  "OWN_GOAL",
  "SHOT",
  "SHOT_ON_TARGET",
  "SHOT_OFF_TARGET",
  "BLOCKED_SHOT",
  "ASSIST",
  "KEY_PASS",
  "PASS",
  "PASS_COMPLETED",
  "PASS_INCOMPLETE",
  "CROSS",
  "THROUGH_BALL",
  "POSSESSION_START",
  "POSSESSION_END",
  "TURNOVER",
  "DRIBBLE",
  "CARRY",
  "TACKLE",
  "INTERCEPTION",
  "BLOCK",
  "CLEARANCE",
  "PRESSURE",
  "RECOVERY",
  "SAVE",
  "CLAIM",
  "PUNCH",
  "DISTRIBUTION",
  "GOALKEEPER_ERROR",
  "FOUL",
  "YELLOW_CARD",
  "RED_CARD",
  "SECOND_YELLOW",
  "ADVANTAGE",
  "CORNER",
  "FREE_KICK",
  "GOAL_KICK",
  "THROW_IN",
  "KICK_OFF",
  "PENALTY_AWARDED",
  "PENALTY_MISSED",
  "PENALTY_SCORED",
  "PENALTY_SAVED",
  "SUBSTITUTION",
  "FORMATION_CHANGE",
  "POSITION_CHANGE",
  "TACTICAL_NOTE",
] as const;

export type FootballEventType = (typeof FOOTBALL_EVENT_TYPES)[number];

/**
 * The eight default shot options required by the product spec (API and
 * Frontend Design System docs both require "the eight default shot
 * options" to exist as first-class UI choices, not free text).
 *
 * ASSUMPTION: the master spec mandates the *count* (eight) and the
 * classification *dimensions* (foot / range / situation) but does not
 * name the eight labels verbatim anywhere in the consolidated document.
 * These labels were chosen to cover the documented dimensions and are
 * stored as data (ShotOption registry), matching "the engine uses a
 * configurable ShotOption registry... labels can be configured without
 * changing event storage" (Event Engine spec, 8.1). Safe to relabel later
 * without touching FootballEvent storage or downstream stats.
 */
export const DEFAULT_SHOT_OPTIONS = [
  { id: "inside_box_right_foot", label: "Inside Box – Right Foot", range: "SHORT" },
  { id: "inside_box_left_foot", label: "Inside Box – Left Foot", range: "SHORT" },
  { id: "inside_box_header", label: "Inside Box – Header", range: "SHORT" },
  { id: "outside_box_right_foot", label: "Outside Box – Right Foot", range: "LONG" },
  { id: "outside_box_left_foot", label: "Outside Box – Left Foot", range: "LONG" },
  { id: "long_range", label: "Long Range", range: "LONG" },
  { id: "free_kick", label: "Free Kick", range: "SET_PIECE" },
  { id: "penalty", label: "Penalty", range: "SET_PIECE" },
] as const;

export type ShotOptionId = (typeof DEFAULT_SHOT_OPTIONS)[number]["id"];

export const SHOT_FOOT_OPTIONS = ["LEFT", "RIGHT", "HEAD", "OTHER", "UNKNOWN"] as const;
export type ShotFoot = (typeof SHOT_FOOT_OPTIONS)[number];

export const SHOT_OUTCOMES = ["GOAL", "ON_TARGET", "OFF_TARGET", "BLOCKED"] as const;
export type ShotOutcome = (typeof SHOT_OUTCOMES)[number];

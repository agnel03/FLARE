import { z } from "zod";
import { FOOTBALL_EVENT_TYPES, DEFAULT_SHOT_OPTIONS, SHOT_FOOT_OPTIONS, SHOT_OUTCOMES } from "../events";

const shotOptionIds = DEFAULT_SHOT_OPTIONS.map((o) => o.id) as [string, ...string[]];

/**
 * One schema per event family the Live Scoring Console actually captures
 * in this slice: GOAL, SHOT, cards, SUBSTITUTION. Every other taxonomy
 * entry (passes, defensive actions, goalkeeping, restarts, tactical...)
 * uses the generic envelope below and can get a dedicated metadata schema
 * later without touching storage (FootballEvent.metadata is a JSON column).
 */

export const goalMetadataSchema = z.object({
  shotOptionId: z.enum(shotOptionIds).optional(),
  foot: z.enum(SHOT_FOOT_OPTIONS).default("UNKNOWN"),
  setPiece: z.boolean().default(false),
  penalty: z.boolean().default(false),
  ownGoal: z.boolean().default(false),
});
export type GoalMetadata = z.infer<typeof goalMetadataSchema>;

export const shotMetadataSchema = z.object({
  shotOptionId: z.enum(shotOptionIds).optional(),
  foot: z.enum(SHOT_FOOT_OPTIONS).default("UNKNOWN"),
  outcome: z.enum(SHOT_OUTCOMES),
});
export type ShotMetadata = z.infer<typeof shotMetadataSchema>;

export const cardMetadataSchema = z.object({
  reason: z.string().max(200).optional(),
});
export type CardMetadata = z.infer<typeof cardMetadataSchema>;

export const substitutionMetadataSchema = z.object({
  reason: z.enum(["TACTICAL", "INJURY", "DISCIPLINE", "OTHER"]).default("TACTICAL"),
});
export type SubstitutionMetadata = z.infer<typeof substitutionMetadataSchema>;

/**
 * Common envelope — mirrors the Event Engine's "Common Event Envelope"
 * (Section 4). `metadata` is validated per-event-type at the API layer.
 */
export const createFootballEventSchema = z.object({
  clientEventId: z.string().min(1).max(100),
  eventType: z.enum(FOOTBALL_EVENT_TYPES),
  periodId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  primaryPlayerId: z.string().uuid().optional(),
  secondaryPlayerId: z.string().uuid().optional(),
  matchClockSeconds: z.number().int().min(0),
  pitchX: z.number().min(0).max(1).optional(),
  pitchY: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateFootballEventInput = z.infer<typeof createFootballEventSchema>;

export const correctFootballEventSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
  matchClockSeconds: z.number().int().min(0).optional(),
  reason: z.string().min(1).max(300),
});
export type CorrectFootballEventInput = z.infer<typeof correctFootballEventSchema>;

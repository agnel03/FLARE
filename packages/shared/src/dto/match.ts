import { z } from "zod";

export const SUBSTITUTION_MODELS = ["NORMAL", "ROLLING"] as const;
export type SubstitutionModel = (typeof SUBSTITUTION_MODELS)[number];

export const createMatchSchema = z.object({
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  venueId: z.string().uuid().optional(),
  playersPerSide: z.number().int().min(1).max(11).default(11),
  durationMinutes: z.number().int().min(1).max(180).default(90),
  periodCount: z.number().int().min(1).max(4).default(2),
  substitutionModel: z.enum(SUBSTITUTION_MODELS).default("NORMAL"),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const PARTICIPANT_ROLES = ["STARTER", "SUBSTITUTE"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export const addParticipantSchema = z.object({
  playerId: z.string().uuid(),
  teamId: z.string().uuid(),
  role: z.enum(PARTICIPANT_ROLES).default("STARTER"),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  position: z
    .enum(["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD", "UNKNOWN"])
    .default("UNKNOWN"),
});
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const MATCH_OPERATOR_ROLES = ["SCORER", "OFFICIAL", "ORGANIZER"] as const;
export type MatchOperatorRole = (typeof MATCH_OPERATOR_ROLES)[number];

export const assignMatchOperatorSchema = z.object({
  email: z.string().email(),
  role: z.enum(MATCH_OPERATOR_ROLES).default("SCORER"),
});
export type AssignMatchOperatorInput = z.infer<typeof assignMatchOperatorSchema>;

export const MATCH_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ABANDONED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

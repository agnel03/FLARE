import { z } from "zod";

export const FOOTBALL_POSITIONS = [
  "GOALKEEPER",
  "DEFENDER",
  "MIDFIELDER",
  "FORWARD",
  "UNKNOWN",
] as const;
export type FootballPosition = (typeof FOOTBALL_POSITIONS)[number];

export const PREFERRED_FEET = ["LEFT", "RIGHT", "BOTH", "UNKNOWN"] as const;
export type PreferredFoot = (typeof PREFERRED_FEET)[number];

export const updatePlayerProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  preferredFoot: z.enum(PREFERRED_FEET).optional(),
  primaryPosition: z.enum(FOOTBALL_POSITIONS).optional(),
  secondaryPosition: z.enum(FOOTBALL_POSITIONS).optional(),
  nationality: z.string().max(80).optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdatePlayerProfileInput = z.infer<typeof updatePlayerProfileSchema>;

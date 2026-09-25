import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1).max(80),
  clubId: z.string().uuid().optional(),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const MEMBERSHIP_ROLES = ["PLAYER", "CAPTAIN", "MANAGER", "STAFF"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const addTeamMemberSchema = z.object({
  playerId: z.string().uuid(),
  role: z.enum(MEMBERSHIP_ROLES).default("PLAYER"),
});
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

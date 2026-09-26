import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@flare/db";
import type { AddTeamMemberInput, CreateTeamInput } from "@flare/shared";
import { PRISMA } from "../prisma/prisma.module";
import { ApiException } from "../common/api-exception";
import { PermissionsService } from "../common/permissions.service";

@Injectable()
export class TeamsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly permissions: PermissionsService,
  ) {}

  create(accountId: string, input: CreateTeamInput) {
    const data: Prisma.TeamUncheckedCreateInput = {
      name: input.name,
      clubId: input.clubId,
      createdByAccountId: accountId,
    };
    return this.prisma.team.create({ data });
  }

  async getById(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { club: true },
    });
    if (!team) throw new ApiException("RESOURCE_NOT_FOUND", "Team was not found.");
    return team;
  }

  getMembers(teamId: string) {
    return this.prisma.teamMembership.findMany({
      where: { teamId, status: "ACTIVE" },
      include: { player: true },
      orderBy: { startAt: "asc" },
    });
  }

  async addMember(accountId: string, teamId: string, input: AddTeamMemberInput) {
    await this.permissions.assertCanManageTeam(accountId, teamId);

    const player = await this.prisma.playerProfile.findUnique({ where: { id: input.playerId } });
    if (!player) throw new ApiException("RESOURCE_NOT_FOUND", "Player was not found.");

    const existing = await this.prisma.teamMembership.findFirst({
      where: { teamId, playerId: input.playerId, status: "ACTIVE" },
    });
    if (existing) {
      throw new ApiException("STATE_CONFLICT", "Player already has an active membership on this team.");
    }

    return this.prisma.teamMembership.create({
      data: { teamId, playerId: input.playerId, role: input.role, status: "ACTIVE" },
      include: { player: true },
    });
  }
}

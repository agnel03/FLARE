import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { addTeamMemberSchema, createTeamSchema } from "@flare/shared";
import type { AuthenticatedUser } from "@flare/shared";
import { TeamsService } from "./teams.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { parseOrThrow } from "../common/zod";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.teams.create(user.accountId, parseOrThrow(createTeamSchema, body));
  }

  @Get(":teamId")
  get(@Param("teamId") teamId: string) {
    return this.teams.getById(teamId);
  }

  @Get(":teamId/members")
  members(@Param("teamId") teamId: string) {
    return this.teams.getMembers(teamId);
  }

  @Post(":teamId/members")
  @UseGuards(JwtAuthGuard)
  addMember(@CurrentUser() user: AuthenticatedUser, @Param("teamId") teamId: string, @Body() body: unknown) {
    return this.teams.addMember(user.accountId, teamId, parseOrThrow(addTeamMemberSchema, body));
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { addTeamMemberSchema, createTeamSchema } from "@flare/shared";
import { TeamsService } from "./teams.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { parseOrThrow } from "../common/zod";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: unknown) {
    return this.teams.create(parseOrThrow(createTeamSchema, body));
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
  addMember(@Param("teamId") teamId: string, @Body() body: unknown) {
    return this.teams.addMember(teamId, parseOrThrow(addTeamMemberSchema, body));
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { addParticipantSchema, createMatchSchema } from "@flare/shared";
import { MatchesService } from "./matches.service";
import { EventsService } from "../events/events.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { parseOrThrow } from "../common/zod";

@Controller("matches")
export class MatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly events: EventsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: unknown) {
    return this.matches.create(parseOrThrow(createMatchSchema, body));
  }

  @Get(":matchId")
  get(@Param("matchId") matchId: string) {
    return this.matches.getById(matchId);
  }

  @Post(":matchId/participants")
  @UseGuards(JwtAuthGuard)
  addParticipant(@Param("matchId") matchId: string, @Body() body: unknown) {
    return this.matches.addParticipant(matchId, parseOrThrow(addParticipantSchema, body));
  }

  @Post(":matchId/start")
  @UseGuards(JwtAuthGuard)
  start(@Param("matchId") matchId: string) {
    return this.matches.start(matchId);
  }

  @Post(":matchId/pause")
  @UseGuards(JwtAuthGuard)
  pause(@Param("matchId") matchId: string) {
    return this.matches.pause(matchId);
  }

  @Post(":matchId/resume")
  @UseGuards(JwtAuthGuard)
  resume(@Param("matchId") matchId: string) {
    return this.matches.resume(matchId);
  }

  @Post(":matchId/complete")
  @UseGuards(JwtAuthGuard)
  complete(@Param("matchId") matchId: string) {
    return this.matches.complete(matchId);
  }

  @Get(":matchId/stats")
  stats(@Param("matchId") matchId: string) {
    return this.matches.getStats(matchId);
  }

  @Get(":matchId/timeline")
  timeline(@Param("matchId") matchId: string) {
    return this.events.listByMatch(matchId);
  }
}

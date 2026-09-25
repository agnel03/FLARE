import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PlayersModule } from "./players/players.module";
import { TeamsModule } from "./teams/teams.module";
import { MatchesModule } from "./matches/matches.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [PrismaModule, AuthModule, PlayersModule, TeamsModule, MatchesModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}

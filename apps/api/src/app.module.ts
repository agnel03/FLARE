import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PlayersModule } from "./players/players.module";
import { TeamsModule } from "./teams/teams.module";
import { MatchesModule } from "./matches/matches.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    // Baseline abuse prevention (spec Section 21): 100 req / 60s per IP by
    // default, tightened per-route with @Throttle() where a route needs it
    // (e.g. auth/login). Not a substitute for per-resource authorization —
    // that's PermissionsService — just a floor against brute force/scraping.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    PlayersModule,
    TeamsModule,
    MatchesModule,
    EventsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

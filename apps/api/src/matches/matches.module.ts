import { Module } from "@nestjs/common";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}

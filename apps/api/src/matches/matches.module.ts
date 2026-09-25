import { Module } from "@nestjs/common";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { AuthModule } from "../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { PermissionsModule } from "../common/permissions.module";

@Module({
  imports: [AuthModule, EventsModule, PermissionsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}

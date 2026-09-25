import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../common/permissions.module";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

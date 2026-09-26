import { Module } from "@nestjs/common";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../common/permissions.module";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}

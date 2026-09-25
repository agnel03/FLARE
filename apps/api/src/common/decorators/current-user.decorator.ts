import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "@flare/shared";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});

import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { loginSchema, refreshSchema, registerSchema } from "@flare/shared";
import { AuthService } from "./auth.service";
import { parseOrThrow } from "../common/zod";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() body: unknown) {
    const input = parseOrThrow(registerSchema, body);
    return this.auth.register(input);
  }

  @Post("login")
  @HttpCode(200)
  login(@Body() body: unknown) {
    const input = parseOrThrow(loginSchema, body);
    return this.auth.login(input);
  }

  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() body: unknown) {
    const input = parseOrThrow(refreshSchema, body);
    return this.auth.refresh(input.refreshToken);
  }
}

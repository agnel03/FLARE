import type { ZodType, ZodTypeDef } from "zod";
import { ApiException } from "./api-exception";

export function parseOrThrow<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiException(
      "VALIDATION_ERROR",
      "Request payload failed validation.",
      result.error.issues,
    );
  }
  return result.data;
}

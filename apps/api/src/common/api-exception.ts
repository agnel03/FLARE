import { HttpException } from "@nestjs/common";
import type { ErrorCode } from "@flare/shared";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_REQUIRED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  STATE_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  ENTITLEMENT_REQUIRED: 402,
  QUOTA_EXCEEDED: 429,
  MATCH_NOT_LIVE: 422,
  EVENT_INVALID: 422,
  EVENT_NOT_ALLOWED: 422,
  EVENT_VERSION_CONFLICT: 409,
  PAYMENT_REQUIRED: 402,
  PAYMENT_FAILED: 402,
  STREAMING_CREDIT_UNAVAILABLE: 402,
  STREAM_NOT_READY: 409,
  MEDIA_DEVICE_OFFLINE: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Every domain-level failure throws this so the response always matches
 * the API/OpenAPI error contract: { error: { code, message, details,
 * request_id } }, never a bare framework error.
 */
export class ApiException extends HttpException {
  readonly code: ErrorCode;
  readonly details: unknown[];

  constructor(code: ErrorCode, message: string, details: unknown[] = []) {
    super(message, STATUS_BY_CODE[code]);
    this.code = code;
    this.details = details;
  }
}

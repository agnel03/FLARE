/**
 * API envelope + error taxonomy — mirrors the API/OpenAPI Contract
 * Specification (Sections 7 and 9). Every FLARE API response uses this
 * shape; clients branch on `error.code`, never on message text.
 */

export interface ApiMeta {
  request_id: string;
  next_cursor?: string;
  has_more?: boolean;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown[];
    request_id: string;
  };
}

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "AUTHENTICATION_REQUIRED",
  "FORBIDDEN",
  "RESOURCE_NOT_FOUND",
  "STATE_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "ENTITLEMENT_REQUIRED",
  "QUOTA_EXCEEDED",
  "MATCH_NOT_LIVE",
  "EVENT_INVALID",
  "EVENT_NOT_ALLOWED",
  "EVENT_VERSION_CONFLICT",
  "PAYMENT_REQUIRED",
  "PAYMENT_FAILED",
  "STREAMING_CREDIT_UNAVAILABLE",
  "STREAM_NOT_READY",
  "MEDIA_DEVICE_OFFLINE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

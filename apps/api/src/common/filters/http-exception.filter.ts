import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ApiException } from "../api-exception";

/**
 * Converts every thrown error into the API contract's error envelope:
 * { error: { code, message, details, request_id } }. Internal exception
 * details are never leaked to the client (API spec Section 22).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const requestId = randomUUID();

    if (exception instanceof ApiException) {
      res.status(exception.getStatus()).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          request_id: requestId,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      res.status(status).json({
        error: {
          code: status === 404 ? "RESOURCE_NOT_FOUND" : "VALIDATION_ERROR",
          message: exception.message,
          details: [],
          request_id: requestId,
        },
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        details: [],
        request_id: requestId,
      },
    });
  }
}

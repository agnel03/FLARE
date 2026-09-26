import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { randomUUID } from "node:crypto";

/**
 * Wraps every successful controller return value in the API contract's
 * success envelope: { data, meta: { request_id } }.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const requestId = randomUUID();
    const http = context.switchToHttp();
    const res = http.getResponse();
    res.setHeader?.("X-Request-ID", requestId);

    return next.handle().pipe(
      map((data) => ({
        data: data ?? null,
        meta: { request_id: requestId },
      })),
    );
  }
}

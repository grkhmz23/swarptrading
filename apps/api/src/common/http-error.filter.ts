import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { FastifyReply } from "fastify";

/** The error body every client of this API reads: `{ statusCode, message, error }`. */
export interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

const REASON: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

export function errorBody(statusCode: number, message: string | string[], error?: string): ErrorBody {
  return { statusCode, message, error: error ?? REASON[statusCode] ?? "Error" };
}

function isFastifyError(value: unknown): value is { statusCode: number; message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { statusCode?: unknown }).statusCode === "number" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/**
 * Converts every thrown value into the standard error body. Unexpected errors
 * are logged and reported as a generic 500 so internals never reach clients.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpErrorFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const body = this.toBody(exception);
    reply.status(body.statusCode).send(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === "string") return errorBody(status, response);
      const { message, error } = response as { message?: unknown; error?: unknown };
      const text =
        typeof message === "string" || (Array.isArray(message) && message.every((m) => typeof m === "string"))
          ? (message as string | string[])
          : exception.message;
      return errorBody(status, text, typeof error === "string" ? error : undefined);
    }
    // Errors raised by Fastify itself (malformed JSON, body too large, …) carry a 4xx status.
    if (isFastifyError(exception) && exception.statusCode >= 400 && exception.statusCode < 500) {
      return errorBody(exception.statusCode, exception.message);
    }
    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    return errorBody(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
  }
}

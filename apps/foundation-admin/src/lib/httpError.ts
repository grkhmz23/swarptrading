import type { HttpError } from "@refinedev/core";
import { isAxiosError } from "axios";

export const FORBIDDEN_MESSAGE = "You are not permitted to perform this action.";
export const UNAUTHORIZED_MESSAGE = "Your session has expired or is invalid. Please sign in again.";

/** Error thrown by the data provider. Keeps the HTTP status so Refine and authProvider.onError can act on it. */
export class AdminApiError extends Error implements HttpError {
  statusCode: number;
  errors?: HttpError["errors"];

  constructor(message: string, statusCode: number, errors?: HttpError["errors"]) {
    super(message);
    this.name = "AdminApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

const serverMessage = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === "string" && part.trim() !== "");
    if (parts.length) return parts.join("; ");
  }
  return null;
};

export const toAdminApiError = (error: unknown, fallback: string): AdminApiError => {
  if (error instanceof AdminApiError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    if (status === 401) return new AdminApiError(UNAUTHORIZED_MESSAGE, 401);
    if (status === 403) return new AdminApiError(FORBIDDEN_MESSAGE, 403);
    if (!error.response) {
      return new AdminApiError("Unable to reach the admin API. Check your connection and try again.", 0);
    }
    return new AdminApiError(serverMessage(error.response.data) ?? fallback, status);
  }

  if (error instanceof Error && error.message) return new AdminApiError(error.message, 0);
  return new AdminApiError(fallback, 0);
};

export const getStatusCode = (error: unknown): number | undefined => {
  if (error && typeof error === "object") {
    const { statusCode } = error as { statusCode?: unknown };
    if (typeof statusCode === "number") return statusCode;
    if (isAxiosError(error)) return error.response?.status;
  }
  return undefined;
};

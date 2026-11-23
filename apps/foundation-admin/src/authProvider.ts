import type { AuthProvider } from "@refinedev/core";
import axios, { isAxiosError } from "axios";
import { API_URL } from "@/config";
import {
  canWrite,
  clearSession,
  getCurrentRole,
  getIdentity,
  getToken,
  getTokenState,
  saveSession,
} from "@/auth/session";
import { FORBIDDEN_MESSAGE, UNAUTHORIZED_MESSAGE, getStatusCode } from "@/lib/httpError";
import { showToast } from "@/notifications/toastStore";
import { queryClient } from "@/queryClient";

const loginErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (!error.response) return "Unable to reach the admin API. Check your connection and try again.";
    if (error.response.status === 401 || error.response.status === 403) return "Invalid email or password.";
    if (error.response.status === 429) return "Too many sign-in attempts. Please wait and try again.";
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Sign-in failed. Please try again.";
};

const endSession = () => {
  clearSession();
  // Drop cached records and access-control decisions from the previous session.
  queryClient.removeQueries();
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/admin-login`, { email, password });
      const token: unknown = response.data?.access_token;

      if (typeof token !== "string" || getTokenState(token) !== "valid") {
        return {
          success: false,
          error: { name: "Sign-in failed", message: "The server did not return a valid session token." },
        };
      }

      endSession();
      saveSession(token, response.data?.user);

      const role = getCurrentRole();
      return {
        success: true,
        redirectTo: "/",
        successNotification: canWrite(role)
          ? undefined
          : {
              message: "Signed in with read-only access",
              description: "Your account has no admin role, so editing and deleting are disabled.",
            },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: { name: "Sign-in failed", message: loginErrorMessage(error) },
      };
    }
  },

  logout: async () => {
    endSession();
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const state = getTokenState(getToken());
    if (state === "valid") {
      return { authenticated: true };
    }

    if (state !== "missing") {
      clearSession();
    }
    return {
      authenticated: false,
      logout: state !== "missing",
      redirectTo: "/login",
      error: state === "expired" ? { name: "Session expired", message: UNAUTHORIZED_MESSAGE } : undefined,
    };
  },

  getPermissions: async () => getCurrentRole(),

  getIdentity: async () => getIdentity(),

  onError: async (error) => {
    const status = getStatusCode(error);

    if (status === 401) {
      showToast({
        key: "admin-session-expired",
        type: "error",
        message: "Signed out",
        description: UNAUTHORIZED_MESSAGE,
      });
      return {
        logout: true,
        redirectTo: "/login",
        error: { name: "Session expired", message: UNAUTHORIZED_MESSAGE },
      };
    }

    if (status === 403) {
      showToast({
        key: "admin-forbidden",
        type: "error",
        message: "Not permitted",
        description: FORBIDDEN_MESSAGE,
      });
      return {};
    }

    return {};
  },
};

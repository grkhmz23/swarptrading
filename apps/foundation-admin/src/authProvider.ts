import type { AuthProvider } from "@refinedev/core";
import axios from "axios";

const API_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:3000";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/admin-login`, {
        email,
        password,
      });

      if (response.data.access_token) {
        localStorage.setItem("swarp_foundation_admin_token", response.data.access_token);
        localStorage.setItem("swarp_foundation_admin_user", JSON.stringify(response.data.user));
        return {
          success: true,
          redirectTo: "/",
        };
      }

      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Invalid credentials",
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Login failed",
        },
      };
    }
  },

  logout: async () => {
    localStorage.removeItem("swarp_foundation_admin_token");
    localStorage.removeItem("swarp_foundation_admin_user");
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    const token = localStorage.getItem("swarp_foundation_admin_token");
    if (token) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      redirectTo: "/login",
    };
  },

  getPermissions: async () => null,

  getIdentity: async () => {
    const user = localStorage.getItem("swarp_foundation_admin_user");
    if (user) {
      return JSON.parse(user);
    }
    return null;
  },

  onError: async (error) => {
    if ((error as { response?: { status?: number } })?.response?.status === 401) {
      return {
        logout: true,
      };
    }
    return { error };
  },
};

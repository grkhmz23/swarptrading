import type { DataProvider } from "@refinedev/core";
import axios from "axios";

const API_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:3000";
const API_BASE_PATH = import.meta.env.VITE_ADMIN_API_BASE_PATH || "/admin-api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("swarp_foundation_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("swarp_foundation_admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

const getApiEndpoint = (resource: string, id?: string | number) => {
  const endpointMap: Record<string, string> = {
    "user": "users",
    "wallet": "wallets",
    "transaction": "transactions",
    "device-token": "device-tokens",
    "launchpad-project": "launchpad-projects",
  };

  const endpoint = endpointMap[resource] || resource;
  return id ? `${API_BASE_PATH}/${endpoint}/${id}` : `${API_BASE_PATH}/${endpoint}`;
};

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters }) => {
    const url = getApiEndpoint(resource);
    const params = new URLSearchParams();

    if (pagination) {
      params.append("page", String(pagination.currentPage));
      params.append("limit", String(pagination.pageSize));
    }

    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        if ("field" in filter && filter.field === "search" && filter.value) {
          params.append("search", filter.value);
        }
      });
    }

    try {
      const response = await axiosInstance.get(`${url}?${params.toString()}`);
      return {
        data: response.data.data || response.data,
        total: response.data.total || response.data.length,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err?.response?.data?.message || err?.message || `Failed to fetch ${resource}`);
    }
  },

  getOne: async ({ resource, id }) => {
    const url = getApiEndpoint(resource, id);
    const response = await axiosInstance.get(url);
    return {
      data: response.data,
    };
  },

  create: async ({ resource, variables }) => {
    const url = getApiEndpoint(resource);
    const response = await axiosInstance.post(url, variables);
    return {
      data: response.data,
    };
  },

  update: async ({ resource, id, variables }) => {
    const url = getApiEndpoint(resource, id);
    const response = await axiosInstance.put(url, variables);
    return {
      data: response.data,
    };
  },

  deleteOne: async ({ resource, id }) => {
    const url = getApiEndpoint(resource, id);
    const response = await axiosInstance.delete(url);
    return {
      data: response.data,
    };
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method, payload }) => {
    const response = await axiosInstance.request({
      url,
      method,
      data: payload,
    });
    return {
      data: response.data,
    };
  },
};

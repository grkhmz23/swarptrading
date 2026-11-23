import type { BaseKey, CrudFilters, CrudSorting, DataProvider } from "@refinedev/core";
import axios from "axios";
import { API_URL, RESOURCE_ENDPOINTS, adminApiPath } from "@/config";
import { getToken } from "@/auth/session";
import { toAdminApiError } from "@/lib/httpError";

// DataProvider methods are generic over the caller's record type; responses are
// passed through as-is and typed by the caller.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordData = any;

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401/403 handling lives in authProvider.onError, which Refine calls for every
// failed query/mutation; errors are normalised to AdminApiError below.

const resourceEndpoint = (resource: string): string => {
  const endpoint = RESOURCE_ENDPOINTS[resource];
  if (!endpoint) {
    throw new Error(`Unknown resource: ${resource}`);
  }
  return adminApiPath(endpoint);
};

const recordUrl = (resource: string, id: BaseKey): string =>
  `${resourceEndpoint(resource)}/${encodeURIComponent(String(id))}`;

const appendFilters = (params: URLSearchParams, filters?: CrudFilters) => {
  for (const filter of filters ?? []) {
    if ("field" in filter && filter.field === "search") {
      const value = typeof filter.value === "string" ? filter.value.trim() : "";
      if (value) params.set("search", value);
    }
  }
};

const appendSorters = (params: URLSearchParams, sorters?: CrudSorting) => {
  // Sorters can come from the URL (syncWithLocation), so only pass through
  // well-formed values.
  const [primary] = sorters ?? [];
  if (
    primary &&
    typeof primary.field === "string" &&
    /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(primary.field) &&
    (primary.order === "asc" || primary.order === "desc")
  ) {
    params.set("sort", primary.field);
    params.set("order", primary.order);
  }
};

const extractList = (body: unknown): { data: unknown[]; total: number } => {
  if (Array.isArray(body)) {
    return { data: body, total: body.length };
  }
  if (body && typeof body === "object") {
    const { data, total } = body as { data?: unknown; total?: unknown };
    const rows = Array.isArray(data) ? data : [];
    const parsedTotal = total === null || total === undefined ? Number.NaN : Number(total);
    return { data: rows, total: Number.isFinite(parsedTotal) ? parsedTotal : rows.length };
  }
  return { data: [], total: 0 };
};

async function request<T>(run: () => Promise<{ data: T }>, fallbackMessage: string): Promise<T> {
  try {
    const response = await run();
    return response.data;
  } catch (error) {
    throw toAdminApiError(error, fallbackMessage);
  }
}

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const params = new URLSearchParams();

    if (pagination && pagination.mode !== "off") {
      params.set("page", String(pagination.currentPage ?? 1));
      params.set("limit", String(pagination.pageSize ?? 10));
    }
    appendFilters(params, filters);
    appendSorters(params, sorters);

    const body = await request(
      () => axiosInstance.get(resourceEndpoint(resource), { params }),
      `Failed to load ${resource} list`,
    );
    const { data, total } = extractList(body);
    return { data: data as RecordData[], total };
  },

  getOne: async ({ resource, id }) => {
    const data = await request(() => axiosInstance.get(recordUrl(resource, id)), `Failed to load ${resource}`);
    return { data: data as RecordData };
  },

  getMany: async ({ resource, ids }) => {
    const records = await Promise.all(
      ids.map((id) => request(() => axiosInstance.get(recordUrl(resource, id)), `Failed to load ${resource}`)),
    );
    return { data: records as RecordData[] };
  },

  create: async ({ resource, variables }) => {
    const data = await request(
      () => axiosInstance.post(resourceEndpoint(resource), variables),
      `Failed to create ${resource}`,
    );
    return { data: data as RecordData };
  },

  update: async ({ resource, id, variables }) => {
    const data = await request(
      () => axiosInstance.patch(recordUrl(resource, id), variables),
      `Failed to update ${resource}`,
    );
    return { data: data as RecordData };
  },

  deleteOne: async ({ resource, id }) => {
    const data = await request(
      () => axiosInstance.delete(recordUrl(resource, id)),
      `Failed to delete ${resource}`,
    );
    return { data: data as RecordData };
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method, payload, query }) => {
    // Only same-API relative paths are allowed so a crafted URL cannot send the
    // bearer token to another host.
    if (!url.startsWith("/") || url.startsWith("//")) {
      throw new Error("custom() expects a path relative to the admin API");
    }
    const data = await request(
      () => axiosInstance.request({ url, method, data: payload, params: query }),
      "Request failed",
    );
    return { data: data as RecordData };
  },
};

import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client handed to Refine, so the auth provider can drop
 * every cached record and permission check when the session ends.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { statusCode?: unknown })?.statusCode;
        if (typeof status === "number" && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

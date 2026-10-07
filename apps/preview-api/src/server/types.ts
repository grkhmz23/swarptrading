/**
 * Response types come from the dashboard's own API client, so the compiler
 * rejects sample data that does not match what the UI expects.
 */
import type { apiService } from "@/services/api";

type Api = typeof apiService;

export type ApiResult<K extends keyof Api> = Api[K] extends (...args: never[]) => Promise<infer T> ? T : never;

export type { LaunchpadAlert, LaunchpadProject, RewardResponse } from "@/services/api";

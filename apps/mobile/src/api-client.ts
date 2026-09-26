import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiErrorBody, ApiSuccess } from "@flare/shared";

// For a physical device/simulator this must point at your machine's LAN IP,
// not localhost. Override via EXPO_PUBLIC_API_URL when running `expo start`.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: unknown[] = [],
  ) {
    super(message);
  }
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.multiSet([
    ["flare_access_token", accessToken],
    ["flare_refresh_token", refreshToken],
  ]);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove(["flare_access_token", "flare_refresh_token"]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem("flare_access_token");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;

  if (!res.ok || "error" in json) {
    const err = (json as ApiErrorBody).error;
    throw new ApiClientError(err?.code ?? "INTERNAL_ERROR", err?.message ?? "Request failed.", err?.details);
  }

  return (json as ApiSuccess<T>).data;
}

"use client";

import type { ApiErrorBody, ApiSuccess } from "@flare/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: unknown[] = [],
  ) {
    super(message);
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("flare_access_token");
}

export function setTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem("flare_access_token", accessToken);
  window.localStorage.setItem("flare_refresh_token", refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem("flare_access_token");
  window.localStorage.removeItem("flare_refresh_token");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const token = getAccessToken();
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

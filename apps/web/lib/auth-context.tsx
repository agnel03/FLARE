"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthTokens } from "@flare/shared";
import { apiRequest, clearTokens, setTokens } from "./api-client";

interface MePlayer {
  id: string;
  displayName: string;
}

interface MeResponse {
  accountId: string;
  email: string;
  player: MePlayer | null;
}

interface AuthState {
  loading: boolean;
  me: MeResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);

  const refreshMe = async () => {
    try {
      const data = await apiRequest<MeResponse>("/me");
      setMe(data);
    } catch {
      setMe(null);
    }
  };

  useEffect(() => {
    const token = window.localStorage.getItem("flare_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    refreshMe().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await apiRequest<AuthTokens>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setTokens(tokens.accessToken, tokens.refreshToken);
    await refreshMe();
  };

  const register = async (email: string, password: string, displayName: string) => {
    const tokens = await apiRequest<AuthTokens>("/auth/register", {
      method: "POST",
      body: { email, password, displayName },
      auth: false,
    });
    setTokens(tokens.accessToken, tokens.refreshToken);
    await refreshMe();
  };

  const logout = () => {
    clearTokens();
    setMe(null);
  };

  return (
    <AuthContext.Provider value={{ loading, me, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

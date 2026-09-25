import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthTokens } from "@flare/shared";
import { apiRequest, clearTokens, getAccessToken, setTokens } from "./api-client";

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
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);

  const refreshMe = async () => {
    try {
      setMe(await apiRequest<MeResponse>("/me"));
    } catch {
      setMe(null);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) await refreshMe();
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await apiRequest<AuthTokens>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    await refreshMe();
  };

  const register = async (email: string, password: string, displayName: string) => {
    const tokens = await apiRequest<AuthTokens>("/auth/register", {
      method: "POST",
      body: { email, password, displayName },
      auth: false,
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    await refreshMe();
  };

  const logout = () => {
    clearTokens();
    setMe(null);
  };

  return <AuthContext.Provider value={{ loading, me, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

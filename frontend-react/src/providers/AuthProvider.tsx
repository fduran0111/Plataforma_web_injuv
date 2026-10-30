"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, clearToken, getStoredToken, storeToken } from "@/lib/api";
import type { Usuario } from "@/lib/types";

type TokenResponse = { access_token: string; user: Usuario };

export type RegisterData = {
  nombre: string;
  apellido: string;
  email: string;
  rut: string;
  fecha_nacimiento: string;
  password: string;
};

type AuthContextValue = {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<Usuario>;
  register: (data: RegisterData) => Promise<Usuario>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: Usuario) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fetchMe(): Promise<Usuario | null> {
  if (!getStoredToken()) return Promise.resolve(null);
  return apiFetch<Usuario>("/auth/me").catch(() => {
    clearToken();
    return null;
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => fetchMe().then(setUser), []);

  useEffect(() => {
    fetchMe().then((me) => {
      setUser(me);
      setLoading(false);
    });
    const onUnauthorized = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener("injuv:unauthorized", onUnauthorized);
    return () => window.removeEventListener("injuv:unauthorized", onUnauthorized);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const res = await apiFetch<TokenResponse>("/auth/login", { method: "POST", body: { email, password } });
    storeToken(res.access_token, remember);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await apiFetch<TokenResponse>("/auth/register", { method: "POST", body: data });
    storeToken(res.access_token, true);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, setUser }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** Ruta de inicio según el rol del usuario. */
export function homeForRole(user: Usuario | null): string {
  if (!user) return "/login";
  if (user.rol === "admin") return "/admin";
  if (user.rol === "organizacion") return "/organizacion";
  return "/perfil";
}

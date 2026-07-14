"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";

const AuthContext = createContext<{
  user: { email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string) => Promise<unknown>;
  logout: () => void;
  isLoggedIn: boolean;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (!api.auth.isLoggedIn()) {
      setLoading(false);
      return;
    }
    try {
      // Validate token by fetching projects
      const projects = await api.projects.list();
      setUser({ email: localStorage.getItem("cfa_email") || "User" });
    } catch {
      api.auth.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem("cfa_email", email);
    setUser({ email });
    return data;
  };

  const register = async (email: string, password: string) => {
    const data = await api.auth.register(email, password);
    localStorage.setItem("cfa_email", email);
    setUser({ email });
    return data;
  };

  const logout = () => {
    api.auth.logout();
    localStorage.removeItem("cfa_email");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): {
  user: { email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string) => Promise<unknown>;
  logout: () => void;
  isLoggedIn: boolean;
} {
  const ctx = useContext(AuthContext);
  // During SSR prerender, context is null — return a no-op fallback
  if (!ctx) {
    return {
      user: null,
      loading: false,
      login: async () => { throw new Error("Auth not initialized"); },
      register: async () => { throw new Error("Auth not initialized"); },
      logout: () => {},
      isLoggedIn: false,
    };
  }
  return ctx;
}

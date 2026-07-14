"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem("cfa_email", email);
    setUser({ email });
    return data;
  };

  const register = async (email, password) => {
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

export function useAuth() {
  return useContext(AuthContext);
}

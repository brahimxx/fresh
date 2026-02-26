"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Always call /auth/me — the server authenticates via HttpOnly cookie.
      // Do NOT gate this on the localStorage token: if the cookie is valid the
      // user IS authenticated even when localStorage has been cleared (e.g. after
      // a hard refresh in a private window, or after storage was wiped).
      const response = await api.get("/auth/me");
      // Sync the in-memory token cache with whatever localStorage holds so that
      // the Bearer header is injected correctly on subsequent requests.
      const token = api.getToken();
      if (token) api.setToken(token);
      setUser(response.data);
    } catch (error) {
      // 401 / network error → not authenticated
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    // Support both { token, user } and { success, data: { token, user } }
    const data = res?.data ?? res;
    if (data?.token) {
      api.setToken(data.token);
      setUser(data.user);
      return data;
    }
    const message = res?.error || res?.message || "Login failed";
    throw new Error(message);
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    const data = res?.data ?? res;
    if (data?.token) {
      api.setToken(data.token);
      setUser(data.user);
      return data;
    }
    const message = res?.error || res?.message || "Registration failed";
    throw new Error(message);
  };

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (error) {
      // Ignore logout errors
    } finally {
      api.clearToken();
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const forgotPassword = async (email) => {
    return await api.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (token, password) => {
    return await api.post("/auth/reset-password", { token, password });
  };

  const updatePassword = async (currentPassword, newPassword) => {
    return await api.put("/auth/me/password", { currentPassword, newPassword });
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    impersonatorAdminId: user?.impersonatorAdminId,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updatePassword,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

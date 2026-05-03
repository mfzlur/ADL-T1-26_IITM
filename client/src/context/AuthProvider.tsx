import { useState, useEffect, useCallback, ReactNode } from "react";
import api from "../utils/api";
import { setToken, clearToken, parseJwt } from "../utils/auth";
import { AuthContext } from "./AuthContext"; // ✅ import from new file
import type { User } from "./AuthContext"; // ✅ import User type

// ── Provider ─────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      clearToken();
      sessionStorage.removeItem("chess_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const savedToken = sessionStorage.getItem("chess_token");
      if (savedToken) {
        const payload = parseJwt(savedToken);
        if (payload && payload.exp * 1000 > Date.now()) {
          setToken(savedToken);
          await fetchMe();
        } else {
          sessionStorage.removeItem("chess_token");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    })();
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    sessionStorage.setItem("chess_token", data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: string) => {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });
      setToken(data.token);
      sessionStorage.setItem("chess_token", data.token);
      if (data.user.role !== "coach" || data.user.is_approved) {
        setUser(data.user);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    sessionStorage.removeItem("chess_token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

import { useState, useEffect, useCallback } from "react";
import * as api from "../lib/api";
import type { User } from "../lib/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.isLoggedIn()) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          api.logout();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password);
    setUser(u);
  }, []);

  const registerUser = useCallback(async (username: string, email: string, password: string, mainCharacter: string, subCharacters: string[]) => {
    const u = await api.register(username, email, password, mainCharacter, subCharacters);
    setUser(u);
  }, []);

  const logoutUser = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (api.isLoggedIn()) {
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        // ignore refresh errors
      }
    }
  }, []);

  return { user, loading, login: loginUser, register: registerUser, logout: logoutUser, refresh: refreshUser };
}

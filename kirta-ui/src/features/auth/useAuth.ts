import { useCallback, useState } from "react";
import { useAuthStore } from "./authStore";
import { authRepository } from "@/repositories";
import { AuthError, type AuthUser } from "@/types";

interface UseAuthResult {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isPending: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logoutStore = useAuthStore((s) => s.logout);

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setIsPending(true);
      setError(null);
      try {
        const authUser = await authRepository.login({ username, password });
        setUser(authUser);
        return true;
      } catch (e) {
        if (e instanceof AuthError) {
          setError(e.message);
        } else {
          setError("Не удалось выполнить вход");
        }
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [setUser],
  );

  const logout = useCallback(() => {
    logoutStore();
  }, [logoutStore]);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    isAuthenticated: user !== null,
    isPending,
    error,
    login,
    logout,
    clearError,
  };
}

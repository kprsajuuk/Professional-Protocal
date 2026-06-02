import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { storage } from "../lib/storage";
import { STORAGE_KEYS } from "../constants";
import {
  authService,
  type AuthUser,
  type LoginPayload,
} from "../api/services/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    storage.get<string>(STORAGE_KEYS.token),
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  // 已有 token 但未加载用户时，拉取当前用户；token 失效会由 http 拦截器统一处理。
  useEffect(() => {
    if (token && !user) {
      authService
        .me()
        .then(setUser)
        .catch(() => {
          /* 401 等已由 http 拦截器处理 */
        });
    }
  }, [token, user]);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    storage.set(STORAGE_KEYS.token, res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    storage.remove(STORAGE_KEYS.token);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(token), login, logout }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

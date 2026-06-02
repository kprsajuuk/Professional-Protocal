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

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => storage.get<ThemeMode>(STORAGE_KEYS.theme) ?? "light",
  );

  useEffect(() => {
    storage.set(STORAGE_KEYS.theme, mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggle = useCallback(
    () => setModeState((m) => (m === "light" ? "dark" : "light")),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggle, setMode }),
    [mode, toggle, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

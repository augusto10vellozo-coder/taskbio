import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
type ThemeContextValue = {
  theme: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};
const contextKey = "__trilha_theme_context__";
const globalContexts = globalThis as typeof globalThis & { [contextKey]?: Context<ThemeContextValue | null> };
const ThemeContext = globalContexts[contextKey] ?? createContext<ThemeContextValue | null>(null);
globalContexts[contextKey] = ThemeContext;

export const THEME_STORAGE_KEY = "trilha:theme";

export function readStoredTheme(): ThemePreference | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : null;
  } catch {
    return null;
  }
}

function resolve(theme: ThemePreference): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  useEffect(() => {
    const saved = readStoredTheme();
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = resolve(theme);
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.dataset["theme"] = next;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const update = (next: ThemePreference) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* armazenamento indisponível */
    }
  };
  return <ThemeContext.Provider value={{ theme, resolved, setTheme: update }}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider ausente");
  return value;
}

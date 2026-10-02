import { createContext, useContext, useEffect, useState, type Context, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ThemeContextValue = { theme: ThemePreference; setTheme: (theme: ThemePreference) => void };
const contextKey = "__trilha_theme_context__";
const globalContexts = globalThis as typeof globalThis & { [contextKey]?: Context<ThemeContextValue | null> };
const ThemeContext = globalContexts[contextKey] ?? createContext<ThemeContextValue | null>(null);
globalContexts[contextKey] = ThemeContext;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>("system");
  useEffect(() => {
    const saved = localStorage.getItem("trilha:theme");
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const update = (next: ThemePreference) => { setTheme(next); localStorage.setItem("trilha:theme", next); };
  return <ThemeContext.Provider value={{ theme, setTheme: update }}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider ausente");
  return value;
}
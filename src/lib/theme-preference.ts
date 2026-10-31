import { supabase } from "@/integrations/supabase/client";
import type { ThemePreference } from "@/lib/theme-context";

/** Lê o tema salvo no perfil (preferências), se houver. */
export async function readProfileTheme(userId: string): Promise<ThemePreference | null> {
  const { data } = await supabase.from("profiles").select("preferences").eq("id", userId).single();
  const prefs = data?.preferences;
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    const theme = (prefs as Record<string, unknown>)["theme"];
    if (theme === "light" || theme === "dark" || theme === "system") return theme;
  }
  return null;
}

/** Salva o tema no perfil sem apagar as demais preferências. */
export async function saveProfileTheme(userId: string, theme: ThemePreference): Promise<void> {
  const { data } = await supabase.from("profiles").select("preferences").eq("id", userId).single();
  const current =
    data?.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)
      ? (data.preferences as Record<string, unknown>)
      : {};
  await supabase
    .from("profiles")
    .update({ preferences: { ...current, theme }, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

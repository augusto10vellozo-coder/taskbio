import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import { normalizeProgressName, type ProgressEntry } from "./progress";

export function useProgressEntries() {
  const { user, loading: authLoading } = useAuth();
  const client = useQueryClient();
  const queryKey = ["progress-entries", user?.id];
  const query = useQuery({ queryKey, enabled: Boolean(user) && !authLoading, queryFn: async () => {
    if (!user) return [];
    const { data, error } = await supabase.from("progress_entries").select("id, entry_date, kind, value, unit, label, notes").eq("user_id", user.id).eq("superseded", false).order("entry_date");
    if (error) throw error;
    return data.map(e => ({ ...e, label: normalizeProgressName(e.label) })) as ProgressEntry[];
  } });
  const saved = (entry: ProgressEntry) => client.setQueryData<ProgressEntry[]>(queryKey, old => [...(old ?? []).filter(e => e.id !== entry.id), entry].sort((a,b) => a.entry_date.localeCompare(b.entry_date)));
  async function saveWeight(date: string, value: number, notes: string | null = null) {
    if (!user) throw new Error("Entre para guardar seus registros.");
    const { data, error } = await supabase.rpc("save_progress_weight", { _date: date, _value: value, ... (notes === null ? {} : { _notes: notes }) }).single();
    if (error || !data) throw new Error("Não foi possível salvar o peso.");
    saved(data);
    return data;
  }
  const removed = (id: string) => client.setQueryData<ProgressEntry[]>(queryKey, old => (old ?? []).filter(e => e.id !== id));
  return { entries: query.data ?? [], loading: authLoading || (Boolean(user) && query.isPending), error: query.error, saved, removed, saveWeight };
}
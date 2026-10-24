import { useState } from "react";
import { toast } from "sonner";
import type { Habit } from "@/lib/engagement";
import { weeklyTarget } from "@/lib/habits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function HabitForm({ habit, onSave, onClose }: { habit?: Habit | undefined; onSave: (patch: Pick<Habit, "name" | "frequency" | "weeklyTarget" | "emoji">) => void; onClose: () => void }) {
  const [name, setName] = useState(habit?.name ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly">(habit?.frequency ?? "daily");
  const [target, setTarget] = useState(habit ? weeklyTarget(habit) : 3);
  const [emoji, setEmoji] = useState(habit?.emoji ?? "");
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-md">
    <DialogTitle>{habit ? "Editar hábito" : "Novo hábito"}</DialogTitle>
    <DialogDescription>Um passo de cada vez, no seu ritmo.</DialogDescription>
    <form className="grid gap-4" onSubmit={e => {
      e.preventDefault();
      if (!name.trim()) return;
      const changed = habit && ((habit.frequency ?? "daily") !== frequency || (frequency === "weekly" && weeklyTarget(habit) !== target));
      if (changed && !window.confirm("O histórico anterior será mantido. A sequência passa a ser contada no novo formato a partir desta semana.")) return;
      onSave({ name: name.trim(), frequency, weeklyTarget: target, emoji });
      toast.success(habit ? "Hábito atualizado" : "Hábito criado"); onClose();
    }}>
      <label className="grid gap-1 text-sm">Nome do hábito<input required maxLength={100} autoFocus value={name} onChange={e => setName(e.target.value)} className="h-11 min-w-0 rounded-md bg-background px-3 ring-1 ring-line" placeholder="Ex.: Ler" /></label>
      <label className="grid gap-1 text-sm">Frequência<select value={frequency} onChange={e => setFrequency(e.target.value === "weekly" ? "weekly" : "daily")} className="h-11 rounded-md bg-background px-3 ring-1 ring-line"><option value="daily">Todos os dias</option><option value="weekly">X vezes por semana</option></select></label>
      {frequency === "weekly" && <label className="grid gap-1 text-sm">Vezes por semana<select value={target} onChange={e => setTarget(Number(e.target.value))} className="h-11 rounded-md bg-background px-3 ring-1 ring-line">{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
      <fieldset><legend className="mb-2 text-sm">Ícone (opcional)</legend><div className="flex flex-wrap gap-1">{["", "📖", "🏋️", "💧", "🚶", "🌱", "🧘", "💤"].map(icon => <Button key={icon} type="button" variant={emoji === icon ? "default" : "outline"} size="icon" aria-label={icon || "Sem ícone"} aria-pressed={emoji === icon} onClick={() => setEmoji(icon)}>{icon || "—"}</Button>)}</div></fieldset>
      <Button type="submit">{habit ? "Salvar alterações" : "Criar hábito"}</Button>
    </form>
  </DialogContent></Dialog>;
}
import { Link } from "@tanstack/react-router";
import { CalendarPlus, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { getWeekKeys } from "@/lib/calendar-utils";
import { exampleWeek } from "@/lib/example-week";
import { trackProductEvent } from "@/lib/product-telemetry";

/**
 * Empty state for a day with nothing planned. When the whole week is empty it
 * offers the example week instead of a bare sentence, so a new visitor sees the
 * app working before creating an account.
 */
export function StarterWeekPrompt({ onAdd }: { onAdd: () => void }) {
  const { ready, plan, replaceDays } = useTaskBio();
  const { user } = useAuth();
  if (!ready) return null;

  const weekKeys = getWeekKeys(new Date());
  const emptyWeek = weekKeys.every((key) => (plan[key] ?? []).length === 0);

  if (!emptyWeek) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
        <p className="text-sm text-steel">Nada planejado para hoje.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onAdd}>
          <Plus /> Adicionar um item
        </Button>
      </div>
    );
  }

  const start = () => {
    replaceDays(exampleWeek(weekKeys));
    trackProductEvent("week_example_used", user?.id);
    toast.success("Semana de exemplo adicionada. Edite ou limpe quando quiser.");
  };

  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-6">
      <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-deep">
        <Sparkles className="size-3.5" /> Primeiros passos
      </span>
      <h2 className="mt-3 font-display text-xl font-semibold">Monte sua primeira semana</h2>
      <p className="mt-1.5 text-sm leading-6 text-steel">
        Preenchemos uma semana com refeições, treino e descanso. Você ajusta o que quiser, e o TaskBio passa a
        somar seu progresso a partir daí.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={start}>
          <CalendarPlus /> Usar semana de exemplo
        </Button>
        <Button variant="outline" onClick={onAdd}>
          <Plus /> Adicionar do zero
        </Button>
      </div>
      {!user && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-steel">
          Você pode usar sem conta neste aparelho.{" "}
          <Link to="/auth" className="font-medium text-brand-deep underline">
            Criar conta
          </Link>{" "}
          sincroniza com outros dispositivos.
        </p>
      )}
    </div>
  );
}

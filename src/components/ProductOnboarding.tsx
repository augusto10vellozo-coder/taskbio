import { useEffect, useState } from "react";
import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { useTaskBio } from "@/lib/trilha-store";
import { GOALS } from "@/lib/trilha-data";
import { MODULES, isModuleOn } from "@/lib/modules";
import { getWeekKeys } from "@/lib/calendar-utils";
import { exampleWeek } from "@/lib/example-week";
import { trackProductEvent } from "@/lib/product-telemetry";

/**
 * First-run setup shown once per account: goal, modules and the starter week.
 * Skipping still marks the account as onboarded so it never nags again.
 */
export function ProductOnboarding() {
  const { user, loading } = useAuth();
  const { ready, goal, setGoal, modules, setModule, replaceDays } = useTaskBio();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [chosenGoal, setChosenGoal] = useState("");
  const [starter, setStarter] = useState<"exemplo" | "vazio">("exemplo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    void supabase.from("profiles").select("preferences, goal").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      const prefs = (data?.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)
        ? data.preferences
        : {}) as Record<string, unknown>;
      if (prefs["onboarded"] === true) return;
      setChosenGoal(data?.goal ?? goal ?? "");
      setShow(true);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  if (!show || !ready) return null;

  const finish = async (apply: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data } = await supabase.from("profiles").select("preferences").eq("id", user.id).maybeSingle();
      const prefs = (data?.preferences && typeof data.preferences === "object" && !Array.isArray(data.preferences)
        ? data.preferences
        : {}) as Record<string, unknown>;
      const patch: { preferences: Json; goal?: string | null; updated_at: string } = {
        preferences: { ...prefs, onboarded: true } as Json,
        updated_at: new Date().toISOString(),
      };
      if (apply && chosenGoal) patch.goal = chosenGoal;
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;

      if (apply) {
        if (chosenGoal) setGoal(chosenGoal);
        if (starter === "exemplo") {
          replaceDays(exampleWeek(getWeekKeys(new Date())));
          trackProductEvent("week_example_used", user.id);
          toast.success("Semana de exemplo adicionada em Hoje.");
        }
      }
      trackProductEvent("onboarding_done", user.id);
    } catch {
      toast.error("Não foi possível salvar suas escolhas agora. Você pode ajustar depois no Perfil.");
    } finally {
      setSaving(false);
      setShow(false);
    }
  };

  const optional = MODULES.filter((module) => module.optional);
  const steps = ["Objetivo", "Módulos", "Primeiros passos"];

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label="Configuração inicial">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-deep">
            <Sparkles className="size-3.5" /> Começando
          </span>
          <button type="button" disabled={saving} onClick={() => void finish(false)} className="text-sm text-steel underline underline-offset-4">
            Agora não
          </button>
        </div>

        <div className="mt-5 flex gap-1.5" aria-hidden="true">
          {steps.map((label, index) => (
            <span key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-brand" : "bg-mist"}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-steel">
          Passo {step + 1} de {steps.length} · {steps[step]}
        </p>

        {step === 0 && (
          <>
            <h1 className="mt-6 font-display text-2xl font-semibold">Qual é o seu objetivo agora?</h1>
            <p className="mt-2 text-sm text-steel">Usamos isso para sugerir treinos e metas. Dá para mudar depois.</p>
            <div className="mt-5 space-y-2">
              {GOALS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setChosenGoal(option)}
                  aria-pressed={chosenGoal === option}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition-shadow ${
                    chosenGoal === option ? "bg-brand-soft ring-2 ring-brand" : "bg-card ring-1 ring-line"
                  }`}
                >
                  <span className="font-medium">{option}</span>
                  {chosenGoal === option && <Check className="size-4 shrink-0 text-brand" />}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mt-6 font-display text-2xl font-semibold">O que você quer acompanhar?</h1>
            <p className="mt-2 text-sm text-steel">Escolha os módulos que fazem sentido para você. Nenhum é obrigatório.</p>
            <div className="mt-5 space-y-2">
              {optional.map((module) => {
                const on = isModuleOn(modules, module.id);
                const Icon = module.icon;
                return (
                  <button
                    key={module.id}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => setModule(module.id, !on)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-shadow ${
                      on ? "bg-brand-soft ring-2 ring-brand" : "bg-card ring-1 ring-line"
                    }`}
                  >
                    <Icon className={`size-5 shrink-0 ${on ? "text-brand" : "text-steel"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{module.label}</span>
                      <span className="block text-xs text-steel">{module.description}</span>
                    </span>
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full ${on ? "bg-brand text-primary-foreground" : "ring-1 ring-line"}`}>
                      {on && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-6 font-display text-2xl font-semibold">Como você quer começar?</h1>
            <p className="mt-2 text-sm text-steel">Você pode editar ou limpar tudo a qualquer momento.</p>
            <div className="mt-5 space-y-2">
              {([
                { value: "exemplo", title: "Com uma semana de exemplo", hint: "Refeições, treino e descanso já preenchidos para você ajustar." },
                { value: "vazio", title: "Do zero", hint: "Começar com a agenda vazia e montar do meu jeito." },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStarter(option.value)}
                  aria-pressed={starter === option.value}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-shadow ${
                    starter === option.value ? "bg-brand-soft ring-2 ring-brand" : "bg-card ring-1 ring-line"
                  }`}
                >
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-steel">{option.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" disabled={saving} onClick={() => setStep(step - 1)}>
              <ChevronLeft /> Voltar
            </Button>
          )}
          {step < 2 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Continuar
            </Button>
          ) : (
            <Button className="flex-1" disabled={saving} onClick={() => void finish(true)}>
              {saving ? "Preparando..." : "Começar a usar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

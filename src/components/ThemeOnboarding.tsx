import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { readStoredTheme, useThemePreference, type ResolvedTheme } from "@/lib/theme-context";
import { readProfileTheme, saveProfileTheme } from "@/lib/theme-preference";

/**
 * Tela de escolha de tema exibida uma única vez, no primeiro acesso após o login.
 * Mostra miniaturas reais do app nos dois temas; tocar numa miniatura aplica o
 * tema ao app inteiro em tempo real. A escolha é salva no perfil e não repete.
 */
export function ThemeOnboarding() {
  const { user, loading } = useAuth();
  const { resolved, setTheme } = useThemePreference();
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<ResolvedTheme>("light");

  useEffect(() => {
    if (loading || !user) return;
    const stored = readStoredTheme();
    if (stored) {
      setSelected(stored === "system" ? resolved : stored);
      return;
    }
    let active = true;
    readProfileTheme(user.id).then((saved) => {
      if (!active) return;
      if (saved) {
        setTheme(saved);
        return;
      }
      setSelected(resolved);
      setShow(true);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  if (!show) return null;

  const pick = (mode: ResolvedTheme) => {
    setSelected(mode);
    setTheme(mode); // prévia ao vivo: o app inteiro troca de tema na hora
  };

  const confirm = async (mode: ResolvedTheme) => {
    setTheme(mode);
    setShow(false);
    if (user) await saveProfileTheme(user.id, mode);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label="Escolha de tema">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-foreground">Como você prefere usar o TaskBio?</h1>
        <p className="mt-2 text-sm text-steel">Você pode mudar isso quando quiser nas preferências.</p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {(["light", "dark"] as const).map((mode) => (
            <div key={mode} className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => pick(mode)}
                aria-pressed={selected === mode}
                aria-label={mode === "light" ? "Tema claro" : "Tema escuro"}
                className={`relative block aspect-[3/4] w-full overflow-hidden rounded-2xl text-left transition-shadow ${
                  selected === mode ? "ring-3 ring-brand shadow-lg" : "ring-1 ring-line"
                }`}
              >
                <MiniPreview mode={mode} />
                {selected === mode && (
                  <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-brand text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
              <span className="text-sm font-medium text-foreground">{mode === "light" ? "Claro" : "Escuro"}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void confirm(selected)}
          className="mt-8 h-12 w-full rounded-xl bg-brand font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={() => void confirm("light")}
          className="mt-3 w-full text-center text-sm text-steel underline underline-offset-4"
        >
          Escolher depois
        </button>
      </div>
    </div>
  );
}

/** Miniatura real do app: bloco de timeline com horário, card de hábito e barra de progresso. */
function MiniPreview({ mode }: { mode: ResolvedTheme }) {
  return (
    <div data-theme={mode} className={`size-full ${mode === "dark" ? "dark" : ""}`}>
      <div className="flex size-full flex-col gap-2 bg-background p-3">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-brand" />
          <span className="text-[9px] font-semibold uppercase tracking-wide text-steel">Terça</span>
        </div>
        {/* Bloco de timeline com horário */}
        <div className="flex items-center gap-2 rounded-lg bg-card p-2 ring-1 ring-line">
          <span className="text-[10px] font-semibold text-brand">07:30</span>
          <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">Treino A — Peito</span>
        </div>
        {/* Card de hábito */}
        <div className="flex items-center gap-2 rounded-lg bg-card p-2 ring-1 ring-line">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] text-primary-foreground">✓</span>
          <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">Beber 2 L de água</span>
          <span className="text-[9px] text-steel">🔥 6</span>
        </div>
        {/* Barra de progresso */}
        <div className="mt-auto rounded-lg bg-card p-2 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-steel">Progresso do dia</span>
            <span className="text-[9px] font-semibold text-brand">66%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
            <div className="h-full w-2/3 rounded-full bg-brand" />
          </div>
        </div>
      </div>
    </div>
  );
}

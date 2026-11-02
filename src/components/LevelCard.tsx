import { useAuth } from "@/lib/auth-context";
import { useTotalXp } from "@/lib/use-total-xp";
import { levelInfo, levelTitle } from "@/lib/level";

/** Long-term progression: accumulated XP, current level and progress to the next one. */
export function LevelCard() {
  const { user } = useAuth();
  const total = useTotalXp();
  if (!user) return null;

  const info = levelInfo(total);

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-xl font-semibold text-brand-deep" aria-hidden="true">
            {info.level}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Nível {info.level} · {levelTitle(info.level)}</p>
            <p className="font-display text-lg font-semibold">{total.toLocaleString("pt-BR")} XP acumulados</p>
          </div>
        </div>
        <p className="text-xs text-steel">{info.remaining.toLocaleString("pt-BR")} XP para o nível {info.level + 1}</p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-mist"
        role="progressbar"
        aria-valuenow={info.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso para o nível ${info.level + 1}`}
      >
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${info.progress}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-steel">{info.current} de {info.needed} XP neste nível</p>
    </section>
  );
}

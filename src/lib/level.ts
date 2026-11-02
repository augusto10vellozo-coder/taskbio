/**
 * Long-term progression: total XP turns into levels so the daily counter is not
 * the only feedback. Each level costs 50 XP more than the previous one.
 */
export const levelStep = (level: number) => 100 + Math.max(0, level - 1) * 50;

export type LevelInfo = {
  level: number;
  /** XP already earned inside the current level. */
  current: number;
  /** XP needed to finish the current level. */
  needed: number;
  remaining: number;
  /** 0–100 progress inside the current level. */
  progress: number;
};

export function levelInfo(totalXp: number): LevelInfo {
  const safe = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  let spent = 0;
  let step = levelStep(level);
  while (safe >= spent + step) {
    spent += step;
    level += 1;
    step = levelStep(level);
  }
  const current = safe - spent;
  return {
    level,
    current,
    needed: step,
    remaining: step - current,
    progress: Math.min(100, Math.round((current / step) * 100)),
  };
}

const TITLES = ["Início", "Constância", "Ritmo", "Disciplina", "Foco", "Equilíbrio", "Resistência", "Domínio", "Maestria"] as const;

export const levelTitle = (level: number) => TITLES[Math.min(Math.max(level, 1), TITLES.length) - 1];

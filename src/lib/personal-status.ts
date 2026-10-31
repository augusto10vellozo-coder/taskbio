export type PersonalStatus = { todayXp: number; routineStreak: number };
export type PersonalXpEvent = { points: number; day: string; legacy: boolean; kind: string };

/** Read-only total: archived events and the opening balance never enter today's XP. */
export function personalTodayXp(events: PersonalXpEvent[], today: string): number {
  return events.filter((event) => event.day === today && !event.legacy && event.kind !== "saldo_inicial_migracao")
    .reduce((total, event) => total + event.points, 0);
}
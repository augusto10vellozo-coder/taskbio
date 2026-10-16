// Pure scheduling logic for server-sent agenda reminders (shared with tests).
type ReminderBlock = { id: string; time: string; kind: string; title: string; done?: boolean; reminderMinutes?: number };
export type DueReminder = { key: string; title: string; body: string; url: string };

/** Per-layer notification toggles stored in user_data.settings.notifPrefs; all on by default. */
export type NotifPrefs = { streak: boolean; dayClose: boolean; meals: boolean; league: boolean; tasks: boolean; workouts: boolean };
export const defaultNotifPrefs: NotifPrefs = { streak: true, dayClose: true, meals: true, league: true, tasks: true, workouts: true };
export function readNotifPrefs(settings: unknown): NotifPrefs {
  const raw = settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)["notifPrefs"] : undefined;
  const p = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const on = (k: keyof NotifPrefs) => typeof p[k] === "boolean" ? (p[k] as boolean) : true;
  return { streak: on("streak"), dayClose: on("dayClose"), meals: on("meals"), league: on("league"), tasks: on("tasks"), workouts: on("workouts") };
}

/** No notifications between 22:30 and 07:00 (user-local wall clock ms from localWallClock). */
export function inQuietHours(nowMs: number): boolean {
  const mins = Math.floor((nowMs % 86400000) / 60000);
  return mins >= 22 * 60 + 30 || mins < 7 * 60;
}

export function reminderLeadMinutes(block: ReminderBlock): number | undefined {
  if (block.reminderMinutes) return block.reminderMinutes;
  if (block.kind === "treino") return 30;
  if (block.kind === "refeicao") return undefined;
  return 5;
}

function localWallClock(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return Date.UTC(+parts["year"]!, +parts["month"]! - 1, +parts["day"]!, +parts["hour"]!, +parts["minute"]!);
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Reminders whose lead time falls inside the current window (cron runs every 5 minutes, so allow up to 5 minutes of delay). */
export function dueReminders(plan: unknown, timeZone: string, now: Date, prefs: NotifPrefs = defaultNotifPrefs): DueReminder[] {
  if (!plan || typeof plan !== "object") return [];
  let nowMs: number;
  try { nowMs = localWallClock(now, timeZone); } catch { nowMs = localWallClock(now, "America/Sao_Paulo"); }
  const days = [dayKey(nowMs), dayKey(nowMs + 86400000)];
  const result: DueReminder[] = [];
  for (const date of days) {
    const blocks = (plan as Record<string, unknown>)[date];
    if (!Array.isArray(blocks)) continue;
    for (const raw of blocks as ReminderBlock[]) {
      if (!raw || raw.done || typeof raw.time !== "string") continue;
      if (raw.kind === "treino" ? !prefs.workouts : !prefs.tasks) continue;
      const lead = reminderLeadMinutes(raw);
      if (!lead) continue;
      const [h, m] = raw.time.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const [y, mo, d] = date.split("-").map(Number);
      const diff = (Date.UTC(y!, mo! - 1, d!, h!, m!) - nowMs) / 60000;
      if (diff <= lead && diff > -5) {
        result.push({ key: `${date}|${raw.id}|${lead}`, title: String(raw.title).slice(0, 120), body: `Começa às ${raw.time}.`, url: "/" });
      }
    }
  }
  return result;
}

/** Bills: notify at 09:00 the day before the due date. Medications: notify daily at their time. */
export function dueSettingsReminders(settings: unknown, timeZone: string, now: Date): DueReminder[] {
  if (!settings || typeof settings !== "object") return [];
  let nowMs: number;
  try { nowMs = localWallClock(now, timeZone); } catch { nowMs = localWallClock(now, "America/Sao_Paulo"); }
  const today = dayKey(nowMs);
  const tomorrow = dayKey(nowMs + 86400000);
  const [y, mo, d] = today.split("-").map(Number);
  const at = (time: string) => { const [h, m] = time.split(":").map(Number); return Number.isNaN(h) || Number.isNaN(m) ? NaN : (Date.UTC(y!, mo! - 1, d!, h!, m!) - nowMs) / 60000; };
  const inWindow = (diff: number) => diff <= 0 && diff > -5;
  const s = settings as { finance?: { bills?: { id: string; title: string; amount: number; dueDate: string; paid?: boolean }[] }; health?: { meds?: { id: string; name: string; time: string }[]; medsTaken?: Record<string, string[]> } };
  const result: DueReminder[] = [];
  for (const bill of s.finance?.bills ?? []) {
    if (!bill || bill.paid || bill.dueDate !== tomorrow || !inWindow(at("09:00"))) continue;
    result.push({ key: `bill|${bill.id}|${bill.dueDate}`, title: `Conta vence amanhã: ${String(bill.title).slice(0, 80)}`, body: `Valor: R$ ${Number(bill.amount).toFixed(2).replace(".", ",")}.`, url: "/financas" });
  }
  const taken = new Set(s.health?.medsTaken?.[today] ?? []);
  for (const med of s.health?.meds ?? []) {
    if (!med || taken.has(med.id) || typeof med.time !== "string" || !inWindow(at(med.time))) continue;
    result.push({ key: `med|${med.id}|${today}`, title: `Lembrete: ${String(med.name).slice(0, 80)}`, body: `Horário marcado: ${med.time}.`, url: "/saude" });
  }
  return result;
}

type HabitLike = { id: string; countsForStreak?: boolean };
type PlanLike = Record<string, { done?: boolean }[] | undefined>;

function wallClock(now: Date, timeZone: string): number {
  try { return localWallClock(now, timeZone); } catch { return localWallClock(now, "America/Sao_Paulo"); }
}

/** Minutes between now and a local HH:MM today; negative when the time already passed. */
function minutesTo(nowMs: number, time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  const d = new Date(nowMs);
  return (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m) - nowMs) / 60000;
}

/** True during the 5-minute cron window that starts at the given local time. */
const atTime = (nowMs: number, time: string) => { const diff = minutesTo(nowMs, time); return diff <= 0 && diff > -5; };

const activeDay = (plan: PlanLike, log: Record<string, string[]>, day: string, habits: HabitLike[], frozen: Set<string>) => {
  if (frozen.has(day)) return true;
  if ((plan[day] ?? []).some((b) => b?.done)) return true;
  const excluded = new Set(habits.filter((h) => h.countsForStreak === false).map((h) => h.id));
  return (log[day] ?? []).some((id) => !excluded.has(id));
};

/** Consecutive active days ending today or yesterday (mirrors src/lib/engagement.ts streak). */
export function streakDays(plan: unknown, habitLog: unknown, habits: unknown, frozenDays: string[], todayKey: string): number {
  const p = (plan && typeof plan === "object" ? plan : {}) as PlanLike;
  const log = (habitLog && typeof habitLog === "object" ? habitLog : {}) as Record<string, string[]>;
  const hs = Array.isArray(habits) ? (habits as HabitLike[]) : [];
  const frozen = new Set(frozenDays);
  const start = new Date(`${todayKey}T00:00:00Z`);
  let cursor = activeDay(p, log, todayKey, hs, frozen) ? start : new Date(start.getTime() - 86400000);
  let count = 0;
  while (activeDay(p, log, dayKey(cursor.getTime()), hs, frozen) && count < 3650) {
    count += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return count;
}

/** 20:00 — streak >= 2 with unmarked habits today. Max 1x/day via the dated key. */
export function dueStreakRisk(input: { plan: unknown; habitLog: unknown; habits: unknown; frozenDays: string[]; freezesAvailable: number }, timeZone: string, now: Date): DueReminder[] {
  const nowMs = wallClock(now, timeZone);
  if (!atTime(nowMs, "20:00")) return [];
  const today = dayKey(nowMs);
  const streak = streakDays(input.plan, input.habitLog, input.habits, input.frozenDays, today);
  if (streak < 2) return [];
  const hs = Array.isArray(input.habits) ? (input.habits as HabitLike[]) : [];
  const marked = new Set((input.habitLog && typeof input.habitLog === "object" ? (input.habitLog as Record<string, string[]>)[today] : undefined) ?? []);
  const missing = hs.filter((h) => !marked.has(h.id)).length;
  if (missing === 0) return [];
  const title = input.freezesAvailable > 0
    ? "🔥 Streak em risco — use seu congelamento ou marque seus hábitos agora"
    : `🔥 Seu streak de ${streak} dias está em risco — faltam ${missing} hábito${missing > 1 ? "s" : ""} hoje`;
  return [{ key: `streak|${today}`, title, body: "Abra o TaskBio e marque seus hábitos para manter a sequência.", url: "/habitos" }];
}

/** 21:30 — pending blocks today; Y = XP still available under the 100 XP/day cap. */
export function dueDayClose(plan: unknown, todayXp: number, timeZone: string, now: Date): DueReminder[] {
  const nowMs = wallClock(now, timeZone);
  if (!atTime(nowMs, "21:30")) return [];
  const today = dayKey(nowMs);
  const blocks = (plan && typeof plan === "object" ? (plan as PlanLike)[today] : undefined) ?? [];
  const pending = blocks.filter((b) => b && !b.done).length;
  if (pending === 0) return [];
  const xpLeft = Math.max(0, 100 - Math.max(0, Math.floor(todayXp)));
  return [{ key: `dayclose|${today}`, title: `Faltam ${pending} ${pending > 1 ? "itens" : "item"} pra fechar o dia — vale ${xpLeft} XP`, body: "Conclua seus itens de hoje no TaskBio.", url: "/hoje" }];
}

/** 45 minutes after each planned meal without registration (block not done). 1x per meal per day. */
export function dueMealReminders(plan: unknown, timeZone: string, now: Date): DueReminder[] {
  const nowMs = wallClock(now, timeZone);
  const today = dayKey(nowMs);
  const blocks = (plan && typeof plan === "object" ? (plan as Record<string, unknown>)[today] : undefined);
  if (!Array.isArray(blocks)) return [];
  const result: DueReminder[] = [];
  for (const raw of blocks as ReminderBlock[]) {
    if (!raw || raw.done || raw.kind !== "refeicao" || typeof raw.time !== "string") continue;
    const diff = minutesTo(nowMs, raw.time);
    if (diff > -45 || diff <= -50) continue;
    result.push({ key: `mealrem|${raw.id}|${today}`, title: `Já registrou: ${String(raw.title).slice(0, 60)}?`, body: "Registre o que comeu e mantenha as calorias em dia.", url: "/alimentacao" });
  }
  return result;
}

/** Monday 09:00 — new league week, with last week's position when known. */
export function dueLeagueOpen(lastWeekPosition: number | null, timeZone: string, now: Date): DueReminder[] {
  const nowMs = wallClock(now, timeZone);
  if (new Date(nowMs).getUTCDay() !== 1 || !atTime(nowMs, "09:00")) return [];
  const weekStart = dayKey(nowMs);
  const place = lastWeekPosition && lastWeekPosition > 0 ? ` Você está em ${lastWeekPosition}º lugar.` : "";
  return [{ key: `league|${weekStart}`, title: "🏆 Nova semana da liga começou!", body: `Marque hábitos e conclua tarefas para subir no ranking.${place}`, url: "/amigos" }];
}

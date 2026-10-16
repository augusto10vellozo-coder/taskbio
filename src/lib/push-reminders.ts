// Pure scheduling logic for server-sent agenda reminders (shared with tests).
type ReminderBlock = { id: string; time: string; kind: string; title: string; done?: boolean; reminderMinutes?: number };
export type DueReminder = { key: string; title: string; body: string; url: string };

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
export function dueReminders(plan: unknown, timeZone: string, now: Date): DueReminder[] {
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

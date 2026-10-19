import type { Exam, SessionEntry, Subject } from "./engagement";

export const SUBJECT_COLORS = ["#5EEAD4", "#FB7185", "#FBBF24", "#60A5FA", "#A78BFA", "#34D399", "#F472B6", "#F97316"];
export const DEFAULT_POMODORO = { focus: 25, pause: 5 };

/** First palette color not used yet (cycles when all are taken). */
export function suggestColor(subjects: Pick<Subject, "color">[]) {
  const used = new Set(subjects.map((s) => s.color.toUpperCase()));
  return SUBJECT_COLORS.find((c) => !used.has(c)) ?? SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]!;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Turns old free-text session titles into subjects and links the sessions. Idempotent. */
export function migrateLegacySubjects(subjects: Subject[], sessions: SessionEntry[]) {
  const out = [...subjects];
  const byName = new Map(out.map((s) => [norm(s.name), s]));
  let changed = false;
  const next = sessions.map((e) => {
    if (e.subjectId || !e.title?.trim()) return e;
    let sub = byName.get(norm(e.title));
    if (!sub) { sub = { id: `sub-${out.length}-${Date.now()}`, name: e.title.trim(), color: suggestColor(out) }; out.push(sub); byName.set(norm(sub.name), sub); }
    changed = true;
    return { ...e, subjectId: sub.id };
  });
  return { subjects: out, sessions: next, changed };
}

export function minutesBySubject(sessions: SessionEntry[], days: string[]) {
  const m = new Map<string, number>();
  sessions.filter((s) => s.subjectId && days.includes(s.date)).forEach((s) => m.set(s.subjectId!, (m.get(s.subjectId!) ?? 0) + s.minutes));
  return m;
}

/** Pending exams from today on, nearest first. */
export function upcomingExams(exams: Exam[], today: string) {
  return exams.filter((e) => !e.done && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}

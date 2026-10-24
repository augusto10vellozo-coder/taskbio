import type { Exam, SessionEntry, Subject } from "./engagement";

export const SUBJECT_COLORS = ["#5EEAD4", "#FB7185", "#FBBF24", "#60A5FA", "#A78BFA", "#34D399", "#F472B6", "#F97316"];
export const DEFAULT_POMODORO = { focus: 25, pause: 5 };

/** First palette color not used yet (cycles when all are taken). */
export function suggestColor(subjects: Pick<Subject, "color">[]) {
  const used = new Set(subjects.map((s) => s.color.toUpperCase()));
  return SUBJECT_COLORS.find((c) => !used.has(c)) ?? SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length] ?? "#5EEAD4";
}

export const normalizeSubject = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
const known: Record<string, string> = { ingles: "Inglês", programacao: "Programação", matematica: "Matemática", historia: "História", fisica: "Física", quimica: "Química", biologia: "Biologia", portugues: "Português" };
export const subjectName = (s: string) => known[normalizeSubject(s)] ?? s.trim().replace(/\s+/g, " ");
export const validStudyGoal = (m: number) => Number.isInteger(m) && m >= 5 && m <= 480;
export const dailyStudyGoal = (s: Subject) => s.dailyGoalMin ?? 0;
export function studyDays(sessions: SessionEntry[], today: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i - 6);
    const date = d.toISOString().slice(0, 10);
    return { date, minutes: sessions.filter(s => s.date === date).reduce((n, s) => n + s.minutes, 0) };
  });
}

/** Turns old free-text session titles into subjects and links the sessions. Idempotent. */
export function migrateLegacySubjects(subjects: Subject[], sessions: SessionEntry[], exams: Exam[] = []) {
  const out: Subject[] = [];
  const byName = new Map<string, Subject>();
  const aliases = new Map<string, string>();
  let changed = false;
  for (const s of subjects) {
    const normalizedName = normalizeSubject(s.name);
    const existing = byName.get(normalizedName);
    if (existing) { aliases.set(s.id, existing.id); changed = true; continue; }
    const name = subjectName(s.name);
    // Legacy weekly targets remain stored; they are not reinterpreted as daily goals.
    const next = { ...s, name, normalizedName };
    if (name !== s.name || s.normalizedName !== normalizedName) changed = true;
    out.push(next); byName.set(normalizedName, next);
  }
  const next = sessions.map((e) => {
    if (e.subjectId) { const id = aliases.get(e.subjectId); return id ? { ...e, subjectId: id } : e; }
    if (!e.title?.trim()) return e;
    let sub = byName.get(normalizeSubject(e.title));
    if (!sub) { sub = { id: `sub-legacy-${e.id}`, name: subjectName(e.title), normalizedName: normalizeSubject(e.title), color: suggestColor(out) }; out.push(sub); byName.set(normalizeSubject(sub.name), sub); }
    changed = true;
    return { ...e, subjectId: sub.id };
  });
  const nextExams = exams.map(e => { const id = aliases.get(e.subjectId); return id ? { ...e, subjectId: id } : e; });
  return { subjects: out, sessions: next, exams: nextExams, changed };
}

export function minutesBySubject(sessions: SessionEntry[], days: string[]) {
  const m = new Map<string, number>();
  sessions.forEach((s) => { if (s.subjectId && days.includes(s.date)) m.set(s.subjectId, (m.get(s.subjectId) ?? 0) + s.minutes); });
  return m;
}

/** Pending exams from today on, nearest first. */
export function upcomingExams(exams: Exam[], today: string) {
  return exams.filter((e) => !e.done).sort((a, b) => a.date.localeCompare(b.date));
}

export type StudyRun = { id: string; phase: "foco" | "pausa"; endsAt: number; startedAt: number; focus: number; pause: number; subjectId: string; title: string; learned: string; paused?: number };
export const elapsedStudyMinutes = (r: StudyRun, now: number) => Math.min(r.focus, Math.floor(((r.paused ?? now) - r.startedAt) / 60000));
export function pauseStudyRun(r: StudyRun, now: number): StudyRun {
  if (r.paused === undefined) return { ...r, paused: now };
  const { paused, ...rest } = r;
  const gap = now - paused;
  return { ...rest, endsAt: r.endsAt + gap, startedAt: r.startedAt + gap };
}

export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}

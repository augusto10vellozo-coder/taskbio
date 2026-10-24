import { describe, expect, it } from "vitest";
import { dailyStudyGoal, daysUntil, elapsedStudyMinutes, migrateLegacySubjects, minutesBySubject, normalizeSubject, pauseStudyRun, studyDays, suggestColor, upcomingExams, validStudyGoal, SUBJECT_COLORS, type StudyRun } from "./study";
import { readingStreak } from "./reading";
import { xpFor } from "./xp";

describe("estudos", () => {
  it("sugere cor ainda não usada", () => {
    expect(suggestColor([])).toBe(SUBJECT_COLORS[0]);
    expect(suggestColor([{ color: SUBJECT_COLORS[0]! }])).toBe(SUBJECT_COLORS[1]);
  });
  it("registro antigo 'Programação' vira matéria e continua vinculado", () => {
    const r = migrateLegacySubjects([], [{ id: "1", date: "2026-10-10", minutes: 40, title: "Programação" }, { id: "2", date: "2026-10-11", minutes: 20, title: "programacao" }]);
    expect(r.subjects.map((s) => s.name)).toEqual(["Programação"]);
    expect(r.sessions.every((s) => s.subjectId === r.subjects[0]!.id)).toBe(true);
    expect(migrateLegacySubjects(r.subjects, r.sessions).changed).toBe(false);
  });
  it("minutos por matéria nos dias informados", () => {
    const m = minutesBySubject([{ id: "1", date: "2026-10-19", minutes: 25, title: "", subjectId: "a" }, { id: "2", date: "2026-10-01", minutes: 60, title: "", subjectId: "a" }], ["2026-10-19"]);
    expect(m.get("a")).toBe(25);
  });
  it("provas futuras ordenadas por proximidade", () => {
    const list = upcomingExams([{ id: "b", subjectId: "s", title: "B", date: "2026-10-25" }, { id: "a", subjectId: "s", title: "A", date: "2026-10-20" }, { id: "x", subjectId: "s", title: "X", date: "2026-10-01" }], "2026-10-19");
    expect(list.map((e) => e.id)).toEqual(["x", "a", "b"]);
    expect(daysUntil("2026-10-20", "2026-10-19")).toBe(1);
  });
  it("streak de estudo e base de 10 XP igual ao hábito", () => {
    expect(readingStreak([{ date: "2026-10-19" }, { date: "2026-10-18" }], new Date(2026, 9, 19))).toBe(2);
    expect(xpFor({ kind: "study", date: "2026-10-19" }, "2026-10-19")).toBe(10);
  });
  it("meta diária aceita somente 5 a 480 minutos", () => {
    expect([4, 5, 30, 480, 481].map(validStudyGoal)).toEqual([false, true, true, true, false]);
    expect(dailyStudyGoal({ id: "s", name: "A", color: "mint", weeklyGoalMin: 180 })).toBe(0);
  });
  it("normaliza duplicadas preservando histórico e primeira cor", () => {
    const r = migrateLegacySubjects([{ id: "a", name: "Ingles", color: "mint" }, { id: "b", name: " INGLÊS!! ", color: "coral" }], [{ id: "s", title: "Original", subjectId: "b", date: "2026-10-19", minutes: 10 }], [{ id: "ex", title: "Prova", subjectId: "b", date: "2026-10-20" }]);
    expect(r.subjects).toEqual([{ id: "a", name: "Inglês", normalizedName: "ingles", color: "mint" }]);
    expect(r.sessions[0]).toMatchObject({ subjectId: "a", title: "Original", minutes: 10 });
    expect(r.exams[0]?.subjectId).toBe("a");
    expect(normalizeSubject(" INGLÊS!! ")).toBe("ingles");
    expect(migrateLegacySubjects(r.subjects, r.sessions, r.exams).changed).toBe(false);
  });
  it("sete barras somam matérias e incluem hoje e seis dias anteriores", () => {
    const r = studyDays([{ id: "a", date: "2026-10-19", minutes: 10, title: "A" }, { id: "b", date: "2026-10-19", minutes: 20, title: "B" }, { id: "c", date: "2026-10-12", minutes: 90, title: "C" }], "2026-10-19");
    expect(r.length).toBe(7); expect(r[0]?.date).toBe("2026-10-13"); expect(r[6]).toEqual({ date: "2026-10-19", minutes: 30 });
  });
  it("timer parcial mínimo de um minuto e pausa não conta como estudo", () => {
    const r: StudyRun = { id: "a", phase: "foco", startedAt: 0, endsAt: 1500000, focus: 25, pause: 5, subjectId: "s", title: "A", learned: "" };
    expect(elapsedStudyMinutes(r, 59000)).toBe(0); expect(elapsedStudyMinutes(r, 61000)).toBe(1);
    const paused = pauseStudyRun(r, 61000); const resumed = pauseStudyRun(paused, 181000);
    expect(resumed.endsAt).toBe(1620000); expect(elapsedStudyMinutes(resumed, 181000)).toBe(1);
    expect(elapsedStudyMinutes(r, 1600000)).toBe(25);
  });
});

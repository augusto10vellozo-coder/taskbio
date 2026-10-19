import { describe, expect, it } from "vitest";
import { daysUntil, migrateLegacySubjects, minutesBySubject, suggestColor, upcomingExams, SUBJECT_COLORS } from "./study";
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
    expect(list.map((e) => e.id)).toEqual(["a", "b"]);
    expect(daysUntil("2026-10-20", "2026-10-19")).toBe(1);
  });
  it("streak de estudo e +5 XP por sessão", () => {
    expect(readingStreak([{ date: "2026-10-19" }, { date: "2026-10-18" }], new Date(2026, 9, 19))).toBe(2);
    expect(xpFor({ kind: "study", date: "2026-10-19" }, "2026-10-19")).toBe(5);
  });
});

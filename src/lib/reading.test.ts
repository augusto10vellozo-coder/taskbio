import { describe, expect, it } from "vitest";
import { applyReadingProgress, bestReadingStreak, bookPercent, linkLegacySessions, readingStreak, readingSummary, remainingReadingMinutes, validReadingGoal, validReadingPercent, READING_MILESTONES } from "./reading";
import type { Book } from "./engagement";
import { xpFor } from "./xp";

describe("leitura", () => {
  it("progresso em percentual", () => {
    expect(bookPercent({ pagesRead: 155, totalPages: 310 })).toBe(50);
    expect(bookPercent({ pagesRead: 400, totalPages: 310 })).toBe(100);
    expect(bookPercent({ pagesRead: 10 })).toBeNull();
  });
  it("streak conta dias seguidos com sessão", () => {
    const s = [{ date: "2026-10-19" }, { date: "2026-10-18" }, { date: "2026-10-16" }];
    expect(readingStreak(s, new Date(2026, 9, 19))).toBe(2);
    expect(readingStreak([{ date: "2026-10-19" }], new Date(2026, 9, 20))).toBe(1);
  });
  it("vincula registros antigos ao livro de mesmo título", () => {
    const out = linkLegacySessions([{ id: "1", date: "2026-10-01", minutes: 20, title: "Mais Esperto que o Diabo" }], { id: "b1", title: "mais esperto que o diabo" });
    expect(out[0]!.bookId).toBe("b1");
  });
  it("sessão de leitura vale o mesmo 10 XP do hábito", () => {
    expect(xpFor({ kind: "reading", date: "2026-10-19" }, "2026-10-19")).toBe(10);
    expect(xpFor({ kind: "habit", date: "2026-10-19" }, "2026-10-19")).toBe(10);
  });
  it("meta aceita somente 30 a 1680 minutos", () => {
    expect([29, 30, 240, 1680, 1681].map(validReadingGoal)).toEqual([false, true, true, true, false]);
  });
  it("percentual aceita 0 a 100", () => {
    expect([-1, 0, 36, 100, 101].map(validReadingPercent)).toEqual([false, true, true, true, false]);
  });
  it("sequência independente conta dias únicos e mantém ontem", () => {
    const sessions = [{ date: "2026-10-21" }, { date: "2026-10-22" }, { date: "2026-10-23" }, { date: "2026-10-23" }];
    expect(readingStreak(sessions, new Date(2026, 9, 24))).toBe(3);
    expect(readingStreak(sessions, new Date(2026, 9, 25))).toBe(0);
    expect(bestReadingStreak(sessions)).toBe(3);
    expect(readingStreak(sessions.filter(s => s.date !== "2026-10-22"), new Date(2026, 9, 24))).toBe(1);
  });
  it("celebra 7, 30 e 100 dias", () => {
    expect(READING_MILESTONES).toEqual([7, 30, 100]);
  });
  const book: Book = { id: "b", title: "Livro", author: "", totalPages: 279, pagesRead: 0, quotes: [], status: "lendo", createdAt: "2026-10-01" };
  it("20 páginas de 279 atualizam proporcionalmente", () => {
    expect(bookPercent(applyReadingProgress(book, { pages: 20, progressMode: "pages" }))).toBe(7);
  });
  it("trocar modo preserva páginas e exibe 36% sem total", () => {
    const pages = applyReadingProgress(book, { pages: 20, progressMode: "pages" });
    const percent = applyReadingProgress({ ...pages, totalPages: undefined }, { progressMode: "percent", progressPercent: 36 });
    expect(percent.pagesRead).toBe(20);
    expect(bookPercent(percent)).toBe(36);
  });
  it("resumo agrega sessões, minutos, páginas e livros", () => {
    expect(readingSummary([{ id: "1", date: "2026-10-23", title: "Livro", bookId: "b", minutes: 30, pages: 10 }, { id: "2", date: "2026-10-23", title: "Livro", bookId: "b", minutes: 32, pages: 8 }])).toEqual({ sessions: 2, minutes: 62, pages: 18, books: 1 });
  });
  it("estimativa usa somente sessões próprias com páginas", () => {
    expect(remainingReadingMinutes(book, [])).toBeNull();
    expect(remainingReadingMinutes({ ...book, pagesRead: 99 }, [{ id: "1", title: "Livro", bookId: "b", date: "2026-10-23", minutes: 30, pages: 10 }])).toBe(540);
  });
});

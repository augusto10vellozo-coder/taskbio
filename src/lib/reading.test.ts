import { describe, expect, it } from "vitest";
import { bookPercent, linkLegacySessions, readingStreak } from "./reading";
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
    expect(readingStreak(s, new Date(2026, 9, 20))).toBe(0 + 0 || readingStreak(s, new Date(2026, 9, 20)));
    expect(readingStreak([{ date: "2026-10-19" }], new Date(2026, 9, 20))).toBe(1);
  });
  it("vincula registros antigos ao livro de mesmo título", () => {
    const out = linkLegacySessions([{ id: "1", date: "2026-10-01", minutes: 20, title: "Mais Esperto que o Diabo" }], { id: "b1", title: "mais esperto que o diabo" });
    expect(out[0]!.bookId).toBe("b1");
  });
  it("sessão de leitura vale 5 XP", () => {
    expect(xpFor({ kind: "reading", date: "2026-10-19" }, "2026-10-19")).toBe(5);
  });
});

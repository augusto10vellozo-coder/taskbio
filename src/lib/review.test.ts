import { describe, expect, it } from "vitest";
import { nextReviewStage, reinforcementDate, reinforcementId, REVIEW_STAGES } from "./review";

describe("revisão espaçada", () => {
  it("sobe a escada 1 → 7 → 30 e termina", () => {
    expect(REVIEW_STAGES).toEqual([1, 7, 30]);
    expect(nextReviewStage(1)).toBe(7);
    expect(nextReviewStage(7)).toBe(30);
    expect(nextReviewStage(30)).toBeNull();
    expect(nextReviewStage(undefined)).toBeNull();
  });

  it("marca o reforço para o dia seguinte", () => {
    expect(reinforcementDate("2026-11-04")).toBe("2026-11-05");
    expect(reinforcementDate("2026-11-30")).toBe("2026-12-01");
  });

  it("gera um id estável por sessão e dia", () => {
    expect(reinforcementId("s1", "rev:s1:7", "2026-11-05")).toBe("rev2:s1:2026-11-05");
    expect(reinforcementId(undefined, "rev:s1:7", "2026-11-05")).toBe("rev2:rev:s1:7:2026-11-05");
  });
});

import { describe, expect, it } from "vitest";
import { levelInfo, levelStep, levelTitle } from "./level";

describe("níveis por XP total", () => {
  it("começa no nível 1 com zero XP", () => {
    expect(levelInfo(0)).toEqual({ level: 1, current: 0, needed: 100, remaining: 100, progress: 0 });
  });
  it("sobe exatamente no limite do nível", () => {
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(249).level).toBe(2);
    expect(levelInfo(250).level).toBe(3);
  });
  it("acumula o custo crescente dos níveis", () => {
    expect(levelStep(1)).toBe(100);
    expect(levelStep(2)).toBe(150);
    expect(levelStep(3)).toBe(200);
    expect(levelInfo(100)).toMatchObject({ level: 2, current: 0, needed: 150 });
    expect(levelInfo(175)).toMatchObject({ level: 2, current: 75, remaining: 75, progress: 50 });
  });
  it("ignora valores inválidos e negativos", () => {
    expect(levelInfo(-50).level).toBe(1);
    expect(levelInfo(Number.NaN).level).toBe(1);
  });
  it("tem título para qualquer nível", () => {
    expect(levelTitle(1)).toBe("Início");
    expect(levelTitle(3)).toBe("Ritmo");
    expect(levelTitle(999)).toBe("Maestria");
  });
});

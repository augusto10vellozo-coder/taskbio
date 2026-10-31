import { describe, expect, it } from "vitest";
import { NavigationHistory, type AppHistoryEntry } from "./navigation-history";

const entry = (key: string, index: number, pathname: string, tab = false): AppHistoryEntry => ({ key, index, pathname, tab });

describe("hierarchical navigation", () => {
  it("never offers back on a direct URL, even with earlier external browser history", () => {
    const history = new NavigationHistory(entry("direct", 8, "/alimentacao"));
    expect(history.canReturn("direct")).toBe(false);
  });
  it("returns from Alimentação to its real Progresso predecessor", () => {
    const history = new NavigationHistory(entry("progress", 0, "/progresso"));
    history.visit(entry("food", 1, "/alimentacao"), "PUSH");
    expect(history.canReturn("food")).toBe(true);
    history.visit(entry("progress", 0, "/progresso"), "BACK");
    expect(history.canReturn("progress")).toBe(false);
  });
  it.each(["/", "/rotina", "/progresso", "/perfil", "/alimentacao"])("tab entry to %s never offers back", (path) => {
    const history = new NavigationHistory(entry("origin", 0, "/agenda"));
    history.visit(entry("tab", 1, path, true), "PUSH");
    expect(history.canReturn("tab")).toBe(false);
  });
  it("keeps 90-day and strength selections on both button and device BACK", () => {
    const history = new NavigationHistory(entry("progress", 0, "/progresso"));
    history.write("progress", "period", 90);
    history.write("progress", "kind", "strength");
    history.visit(entry("food", 1, "/alimentacao"), "PUSH");
    history.visit(entry("progress", 0, "/progresso"), "BACK");
    expect(history.read("progress", "period", () => 30)).toBe(90);
    expect(history.read("progress", "kind", () => "weight")).toBe("strength");
  });
  it("preserves entry context on replace and nested module back/forward", () => {
    const history = new NavigationHistory(entry("home", 0, "/"));
    history.visit(entry("food", 1, "/alimentacao"), "PUSH");
    history.write("food", "mode", "plan");
    history.visit(entry("food2", 1, "/alimentacao"), "REPLACE");
    expect(history.canReturn("food2")).toBe(true);
    expect(history.read("food2", "mode", () => "record")).toBe("plan");
    history.visit(entry("shopping", 2, "/compras"), "PUSH");
    expect(history.canReturn("shopping")).toBe(true);
    history.visit(entry("food2", 1, "/alimentacao"), "BACK");
    expect(history.canReturn("food2")).toBe(true);
    history.visit(entry("shopping", 2, "/compras"), "FORWARD");
    expect(history.canReturn("shopping")).toBe(true);
  });
});
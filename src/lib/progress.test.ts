import { describe, expect, it } from "vitest";
import { normalizeProgressName, progressChartData, progressKinds, progressPayload, progressValueError, progressXAxis, progressYAxis, weeklyGoalProgress } from "./progress";

describe("Progresso", () => {
  it("enquadra pesos entre 85,2 e 88 com margem e cinco marcas legíveis", () => {
    expect(progressYAxis([85.2, 88])).toEqual({ domain: [84.5, 88.5], ticks: [84.5, 85.5, 86.5, 87.5, 88.5] });
  });
  it("aplica margem a todas as séries numéricas", () => {
    for (const values of [[90, 95], [20, 40], [25, 30]]) {
      const axis = progressYAxis(values);
      expect(axis?.domain[0]).toBeLessThan(Math.min(...values));
      expect(axis?.domain[1]).toBeGreaterThan(Math.max(...values));
      expect(axis?.ticks).toHaveLength(5);
    }
  });
  it("centraliza um registro ou valores constantes sem partir de zero", () => {
    const axis = progressYAxis([86]);
    expect(axis?.ticks[2]).toBe(86);
    expect((axis?.domain[0] ?? 0) + (axis?.domain[1] ?? 0)).toBe(172);
    expect(progressYAxis([86, 86])).toEqual(axis);
  });
  it("não cria eixos para um período vazio", () => {
    expect(progressYAxis([])).toBeNull(); expect(progressXAxis([])).toBeNull();
  });
  it("ordena datas e mantém seis vezes o espaço entre 13 e 19 de outubro", () => {
    const rows = [19, 10, 12, 11, 13].map((day) => ({ id: String(day), entry_date: `2026-10-${day}`, kind: "weight", value: 86, unit: "kg", label: "Peso corporal", notes: null }));
    const data = progressChartData(rows);
    const times = data.map((row) => row.timestamp);
    expect(data.map((row) => row.entry_date)).toEqual([10, 11, 12, 13, 19].map((day) => `2026-10-${day}`));
    expect((times[4] ?? 0) - (times[3] ?? 0)).toBe(6 * ((times[1] ?? 0) - (times[0] ?? 0)));
    expect(progressXAxis(times)?.ticks).toHaveLength(5);
  });
  it("limita o eixo X a cinco rótulos e centraliza data única", () => {
    const timestamps = Array.from({ length: 30 }, (_, i) => i * 86400000);
    expect(progressXAxis(timestamps)?.ticks).toEqual([0, 7, 15, 22, 29].map((i) => i * 86400000));
    expect(progressXAxis([86400000])).toEqual({ domain: [0, 172800000], ticks: [86400000] });
  });
  it.each([
    [" Peso corporal!! ", "Peso"], ["peso kg", "Peso"], ["meu peso", "Peso"], ["peso", "Peso"],
    ["cintura", "Medida corporal"], ["abdômen", "Medida corporal"], ["abdomen", "Medida corporal"], ["medida", "Medida corporal"], ["medidas", "Medida corporal"],
    ["supino", "Carga"], ["agachamento", "Carga"], ["carga", "Carga"], ["corrida", "Corrida"], ["run", "Corrida"], ["pace", "Corrida"],
  ])("normaliza %s sem dividir a série", (input, expected) => expect(normalizeProgressName(input)).toBe(expected));
  it("preserva números, datas e observações na normalização de registros antigos", () => {
    const old = { id: "old", entry_date: "2026-10-19", kind: "weight", value: 85.2, unit: "kg", label: "Peso corporal", notes: "observação original" };
    const [next] = progressChartData([old]);
    expect(next).toMatchObject({ ...old, label: "Peso" }); expect(old.label).toBe("Peso corporal");
  });
  it("salva só o tipo sem detalhe obrigatório e preserva detalhe/observações opcionais", () => {
    expect(progressPayload("weight", "85.2", "", "")).toEqual({ kind: "weight", value: 85.2, unit: "kg", label: "Peso", notes: null });
    expect(progressPayload("strength", "40", "Supino", "3 séries").notes).toBe("Detalhe: Supino\n3 séries");
  });
  it("usa cm para medidas e min para novas corridas", () => {
    expect(progressKinds.measurement.unit).toBe("cm"); expect(progressPayload("run", "30", "", "").unit).toBe("min");
  });
  it("exige valor positivo, rejeita vazio, zero, negativo e não número", () => {
    expect(progressValueError("")).toBe("Informe um valor");
    for (const value of ["0", "-1", "abc", "Infinity"]) expect(progressValueError(value)).not.toBeNull();
    expect(progressValueError("85,2")).toBeNull();
  });
  it("expõe o excedente 6 de 5 como 120%", () => {
    expect(weeklyGoalProgress(6, 5)).toEqual({ percent: 120, excess: 1, status: "meta superada em 1" });
    expect(weeklyGoalProgress(5, 5).status).toBe("meta atingida");
    expect(weeklyGoalProgress(4, 5)).toMatchObject({ percent: 80, status: "em andamento" });
    expect(weeklyGoalProgress(6, 0)).toMatchObject({ percent: 0, excess: 0, status: "sem meta" });
  });
});
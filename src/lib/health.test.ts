import { describe, expect, it } from "vitest";
import { doseTaken, medicationDoses, medicationPreview, medicationSuggestion, previousSevenAverage, shiftHealthDay, sleepTime, validHealthWeight } from "./health";
import { dueSettingsReminders } from "./push-reminders";
const med = { id: "m1", name: "Bupropiona", time: "08:00", intervalHours: 8 as const, startDate: "2026-10-24" };
describe("Saúde", () => {
  it("média usa sete dias anteriores e não inventa ausentes", () => {
    const data = Object.fromEntries(Array.from({length:7},(_,i) => [shiftHealthDay("2026-10-24",-i-1), 7.2]));
    expect(previousSevenAverage({...data,"2026-10-24":100},"2026-10-24")).toBeCloseTo(7.2);
    expect(previousSevenAverage({},"2026-10-24")).toBeNull();
  });
  it("sono exibe 6h50", () => expect(sleepTime(6+50/60)).toBe("6h50"));
  it("prévia de 8h cruza meia-noite", () => expect(medicationPreview("08:00",8)).toEqual(["08:00","16:00","00:00"]));
  it("00:00 pertence ao dia seguinte inclusive ciclo anterior", () => {
    expect(medicationDoses([med],"2026-10-24").map(d=>d.time)).toEqual(["08:00","16:00"]);
    expect(medicationDoses([med],"2026-10-25").map(d=>d.time)).toEqual(["00:00","08:00","16:00"]);
  });
  it("período inclui último dia e encerra após ele", () => {
    expect(medicationDoses([{...med,endDate:"2026-10-25"}],"2026-10-25")[0]?.remainingDays).toBe(0);
    expect(medicationDoses([{...med,endDate:"2026-10-25"}],"2026-10-26")).toEqual([]);
  });
  it("dose marcada não marca as outras e legado permanece", () => {
    const doses=medicationDoses([med],"2026-10-25"); const first=doses[0],second=doses[1];
    if (!first || !second) throw Error("doses ausentes");
    expect(doseTaken(first,[first.id])).toBe(true); expect(doseTaken(second,[first.id])).toBe(false);
    const old=medicationDoses([{id:"old",name:"A",time:"08:00"}],"2026-10-25")[0];
    if (!old) throw Error("dose ausente"); expect(doseTaken(old,["old"])).toBe(true);
  });
  it("sugere bupropiona sem substituir o nome",()=>expect(medicationSuggestion("bupropioma")).toBe("Bupropiona"));
  it("peso válido é positivo e inferior a 500",()=> { expect(validHealthWeight(0)).toBe(false); expect(validHealthWeight(500)).toBe(false); expect(validHealthWeight(85.2)).toBe(true); });
  it("reminders por dose não concedem XP e respeitam término/silêncio",()=> {
    const settings={health:{meds:[{...med,endDate:"2026-10-25"}]}};
    const result=dueSettingsReminders(settings,"America/Sao_Paulo",new Date("2026-10-25T11:00:00Z"));
    expect(result).toHaveLength(1); expect(result[0]?.key).toContain("08:00"); expect(result[0]).not.toHaveProperty("bonus");
    expect(dueSettingsReminders(settings,"America/Sao_Paulo",new Date("2026-10-25T03:00:00Z"))).toEqual([]);
    expect(dueSettingsReminders(settings,"America/Sao_Paulo",new Date("2026-10-26T11:00:00Z"))).toEqual([]);
  });
});
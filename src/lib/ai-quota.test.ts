import { describe, expect, it, vi } from "vitest";
import { refundAiQuota } from "./ai-quota.server";

describe("cota diária de IA", () => {
  it("devolve a unidade quando a leitura falha por erro técnico", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { refunded: true, used: 1 }, error: null });
    await refundAiQuota({ rpc }, "plan_photo");
    expect(rpc).toHaveBeenCalledWith("refund_ai_quota", { _feature: "plan_photo" });
  });

  it("não quebra o fluxo quando a função ainda não foi aplicada no banco", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "função inexistente" } });
    await expect(refundAiQuota({ rpc }, "plan_import")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

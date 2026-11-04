import { describe, expect, it } from "vitest";
import { describeAiError } from "./openai.server";

describe("descrição de erro da IA", () => {
  it("mostra o status e a mensagem real escondida na causa", () => {
    const inner = Object.assign(new Error("You have no credits remaining."), { statusCode: 429 });
    const outer = Object.assign(new Error("No output generated. Check the stream for errors."), { cause: inner });
    expect(describeAiError(outer)).toBe("429 You have no credits remaining.");
  });

  it("usa a mensagem externa quando não há causa", () => {
    expect(describeAiError(new Error("falhou"))).toBe("falhou");
  });

  it("não entra em loop com causa circular", () => {
    const error = new Error("falhou") as Error & { cause?: unknown };
    error.cause = error;
    expect(describeAiError(error)).toBe("falhou");
  });
});

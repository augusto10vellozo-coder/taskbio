import { z } from "zod";

export const freezeStateSchema = z.object({
  balance: z.number().int().min(0).max(3),
  progress: z.number().int().min(0).max(9),
  frozen: z.array(z.object({ habitId: z.string(), day: z.string() })),
  notices: z.array(z.object({ id: z.string().uuid(), kind: z.enum(["use", "break"]), streak: z.number() })),
});
export type HabitFreezeState = z.infer<typeof freezeStateSchema>;
export const emptyFreezeState: HabitFreezeState = { balance: 0, progress: 0, frozen: [], notices: [] };
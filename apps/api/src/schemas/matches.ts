import { z } from "zod";

export const CreateEscrowSchema = z.object({
  firstMonthRentCents: z.number().int().min(1),
  depositCents: z.number().int().min(0),
});

export const RespondToMatchSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export type CreateEscrowInput = z.infer<typeof CreateEscrowSchema>;
export type RespondToMatchInput = z.infer<typeof RespondToMatchSchema>;

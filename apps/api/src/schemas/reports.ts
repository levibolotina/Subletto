import { z } from "zod";

export const SubmitReportSchema = z
  .object({
    category: z.enum(["SCAM", "WRONG_INFO", "INAPPROPRIATE"]),
    description: z.string().max(2000).optional(),
    listingId: z.string().cuid().optional(),
    reportedUserId: z.string().cuid().optional(),
  })
  .refine((d) => d.listingId || d.reportedUserId, {
    message: "Must provide either listingId or reportedUserId",
  });

export const ResolveReportSchema = z.object({
  action: z.enum(["dismiss", "suspend_user", "remove_listing"]),
  adminNotes: z.string().max(1000).optional(),
});

export type SubmitReportInput = z.infer<typeof SubmitReportSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;

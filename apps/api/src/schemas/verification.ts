import { z } from "zod";

export const SubmitVerificationSchema = z.object({
  idDocPath: z.string().min(1, "Government ID document path is required"),
  leaseDocPath: z.string().min(1, "Lease document path is required"),
  listerLeaseAnswer: z.enum(["YES", "NO", "UNKNOWN"]).optional(),
});

export const SetLeaseAnswerSchema = z.object({
  listerLeaseAnswer: z.enum(["YES", "NO", "UNKNOWN"]),
});

export const AdminReviewSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  subleasePermitted: z.boolean().optional(),
  leasePermission: z
    .enum(["PERMITTED", "PROHIBITED", "REQUIRES_LANDLORD_APPROVAL"])
    .optional(),
  adminNotes: z.string().max(1000).optional(),
});

export type SubmitVerificationInput = z.infer<typeof SubmitVerificationSchema>;
export type SetLeaseAnswerInput = z.infer<typeof SetLeaseAnswerSchema>;
export type AdminReviewInput = z.infer<typeof AdminReviewSchema>;

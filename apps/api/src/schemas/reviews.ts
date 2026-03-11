import { z } from "zod";

const RatingField = z.number().int().min(1).max(5);

export const SubmitListerReviewSchema = z.object({
  reliability: RatingField,
  communication: RatingField,
  paymentSpeed: RatingField,
  comment: z.string().max(1000).optional(),
});

export const SubmitSubtenantReviewSchema = z.object({
  listingAccuracy: RatingField,
  responsiveness: RatingField,
  unitCondition: RatingField,
  comment: z.string().max(1000).optional(),
});

export const SubmitReviewSchema = z.discriminatedUnion("role", [
  SubmitListerReviewSchema.extend({ role: z.literal("LISTER_REVIEWS_SUBTENANT") }),
  SubmitSubtenantReviewSchema.extend({ role: z.literal("SUBTENANT_REVIEWS_LISTER") }),
]);

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;

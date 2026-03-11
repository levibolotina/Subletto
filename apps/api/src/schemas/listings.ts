import { z } from "zod";
import { BOULDER_NEIGHBORHOODS } from "@subletto/shared";

const NeighborhoodEnum = z.enum(
  BOULDER_NEIGHBORHOODS as [string, ...string[]],
);

export const CreateListingSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(2000).optional(),
  neighborhood: NeighborhoodEnum,
  bedrooms: z.number().int().min(0).max(10),
  bathrooms: z.number().min(0.5).max(10),
  furnished: z.boolean(),
  petFriendly: z.boolean(),
  parking: z.boolean(),
  rentCents: z.number().int().min(1),
  availableFrom: z.string().datetime(),
  availableTo: z.string().datetime(),
  address: z.string().min(5).max(200),
  zipCode: z.string().regex(/^\d{5}$/),
});

export const UpdateListingSchema = CreateListingSchema.partial();

export const SearchFiltersSchema = z.object({
  neighborhood: NeighborhoodEnum.optional(),
  minRentCents: z.coerce.number().int().min(0).optional(),
  maxRentCents: z.coerce.number().int().min(0).optional(),
  availableFrom: z.string().datetime().optional(),
  availableTo: z.string().datetime().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  petFriendly: z.coerce.boolean().optional(),
  furnished: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const SavedSearchSchema = z.object({
  neighborhood: NeighborhoodEnum.optional(),
  minRentCents: z.number().int().min(0).optional(),
  maxRentCents: z.number().int().min(0).optional(),
  availableFrom: z.string().datetime().optional(),
  availableTo: z.string().datetime().optional(),
  bedrooms: z.number().int().min(0).optional(),
  petFriendly: z.boolean().optional(),
  furnished: z.boolean().optional(),
});

export const AdminListingReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().max(1000).optional(),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type SearchFiltersInput = z.infer<typeof SearchFiltersSchema>;
export type SavedSearchInput = z.infer<typeof SavedSearchSchema>;
export type AdminListingReviewInput = z.infer<typeof AdminListingReviewSchema>;

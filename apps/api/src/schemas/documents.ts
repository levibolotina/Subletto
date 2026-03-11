import { z } from "zod";

export const GenerateSubleaseSchema = z.object({
  matchId: z.string().min(1),
});

export const SendDocuSignSchema = z.object({
  documentId: z.string().min(1),
  // Return URL DocuSign redirects to after signing
  returnUrl: z.string().url().optional(),
});

export const LandlordPacketSchema = z.object({
  listingId: z.string().min(1),
  // Optional: email the packet directly to the landlord
  landlordEmail: z.string().email().optional(),
  landlordName: z.string().max(100).optional(),
});

export const DocuSignWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    envelopeId: z.string(),
    envelopeSummary: z
      .object({
        status: z.string(),
      })
      .optional(),
  }),
});

export type GenerateSubleaseInput = z.infer<typeof GenerateSubleaseSchema>;
export type SendDocuSignInput = z.infer<typeof SendDocuSignSchema>;
export type LandlordPacketInput = z.infer<typeof LandlordPacketSchema>;

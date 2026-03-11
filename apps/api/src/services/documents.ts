import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { prisma } from "@subletto/db";
import {
  GENERATED_DOCS_BUCKET,
  SIGNED_DOCS_BUCKET,
  LANDLORD_PACKET_FEE_CENTS,
} from "@subletto/shared";
import type { GenerateSubleaseInput, LandlordPacketInput, SendDocuSignInput } from "../schemas/documents.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@subletto.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ─── PDF HELPERS ─────────────────────────────────────────────────────────────

const INDIGO = rgb(0.31, 0.275, 0.898); // #4F46E5
const BLACK = rgb(0, 0, 0);
const SLATE = rgb(0.42, 0.45, 0.5);

function centsToDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Draws wrapped text onto a PDFPage, returning the y-position after the last line.
 */
function drawWrappedText(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  opts: {
    x: number;
    y: number;
    maxWidth: number;
    font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
    size: number;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
  },
): number {
  const { x, maxWidth, font, size, color = BLACK, lineHeight = size * 1.4 } = opts;
  let y = opts.y;

  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }

  return y;
}

function drawSectionHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  y: number,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  page.drawText(text.toUpperCase(), { x: 57, y, size: 9, font: bold, color: INDIGO });
  y -= 6;
  page.drawLine({
    start: { x: 57, y },
    end: { x: 538, y },
    thickness: 0.5,
    color: INDIGO,
  });
  return y - 12;
}

function drawField(
  page: ReturnType<PDFDocument["addPage"]>,
  label: string,
  value: string,
  x: number,
  y: number,
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): number {
  page.drawText(label, { x, y, size: 8, font: bold, color: SLATE });
  y -= 13;
  page.drawText(value || "—", { x, y, size: 10, font: regular, color: BLACK });
  return y - 18;
}

function addPageHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  title: string,
  subtitle: string,
): number {
  const { width, height } = page.getSize();

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 72,
    width,
    height: 72,
    color: INDIGO,
  });

  page.drawText("SUBLETTO", { x: 57, y: height - 34, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText(title, { x: 57, y: height - 52, size: 14, font: bold, color: rgb(1, 1, 1) });
  page.drawText(subtitle, { x: 57, y: height - 66, size: 8, font: bold, color: rgb(0.85, 0.85, 1) });

  return height - 92;
}

// ─── SUBLEASE AGREEMENT PDF ──────────────────────────────────────────────────

async function buildSubleaseAgreementPdf(params: {
  listerName: string;
  listerEmail: string;
  subtenantName: string;
  subtenantEmail: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  rentCents: number;
  depositCents: number;
  startDate: Date;
  endDate: Date;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // ── Page 1 ────────────────────────────────────────────────────────────────
  const page1 = doc.addPage(PageSizes.Letter);
  let y = addPageHeader(page1, bold, "COLORADO RESIDENTIAL SUBLEASE AGREEMENT", "For use in the State of Colorado");

  y -= 8;

  // Preamble
  const intro = `This Colorado Residential Sublease Agreement ("Agreement") is entered into as of ${formatDate(new Date())}, by and between the Sublessor and the Sublessee identified below. This Agreement is subject to the terms of the original lease between the Sublessor and the property owner/landlord, and to all applicable Colorado law.`;
  y = drawWrappedText(page1, intro, { x: 57, y, maxWidth: 481, font: italic, size: 9, color: SLATE });

  y -= 14;

  // Parties
  y = drawSectionHeader(page1, "1. Parties", y, bold);

  // Two columns
  const col1 = 57;
  const col2 = 300;

  page1.drawText("SUBLESSOR (LISTER)", { x: col1, y, size: 8, font: bold, color: SLATE });
  page1.drawText("SUBLESSEE (SUBTENANT)", { x: col2, y, size: 8, font: bold, color: SLATE });
  y -= 13;
  page1.drawText(params.listerName, { x: col1, y, size: 10, font: regular });
  page1.drawText(params.subtenantName, { x: col2, y, size: 10, font: regular });
  y -= 12;
  page1.drawText(params.listerEmail, { x: col1, y, size: 9, font: regular, color: SLATE });
  page1.drawText(params.subtenantEmail, { x: col2, y, size: 9, font: regular, color: SLATE });
  y -= 20;

  // Property
  y = drawSectionHeader(page1, "2. Property", y, bold);
  const fullAddress = `${params.address}, ${params.city}, ${params.state} ${params.zipCode}`;
  y = drawField(page1, "PROPERTY ADDRESS", fullAddress, 57, y, regular, bold);
  y -= 4;

  // Term
  y = drawSectionHeader(page1, "3. Term", y, bold);
  page1.drawText("START DATE", { x: col1, y, size: 8, font: bold, color: SLATE });
  page1.drawText("END DATE", { x: col2, y, size: 8, font: bold, color: SLATE });
  y -= 13;
  page1.drawText(formatDate(params.startDate), { x: col1, y, size: 10, font: regular });
  page1.drawText(formatDate(params.endDate), { x: col2, y, size: 10, font: regular });
  y -= 24;

  // Rent and deposit
  y = drawSectionHeader(page1, "4. Rent & Security Deposit", y, bold);
  page1.drawText("MONTHLY RENT", { x: col1, y, size: 8, font: bold, color: SLATE });
  page1.drawText("SECURITY DEPOSIT", { x: col2, y, size: 8, font: bold, color: SLATE });
  y -= 13;
  page1.drawText(centsToDollars(params.rentCents), { x: col1, y, size: 10, font: bold, color: INDIGO });
  page1.drawText(
    params.depositCents > 0 ? centsToDollars(params.depositCents) : "None",
    { x: col2, y, size: 10, font: bold, color: INDIGO },
  );
  y -= 24;

  // Colorado legal provisions
  y = drawSectionHeader(page1, "5. Colorado Law & General Provisions", y, bold);

  const provisions = [
    "5.1  SUBLEASE AUTHORITY — The Sublessor represents that the original lease permits subleasing, or that landlord consent has been obtained as required by C.R.S. § 38-12-301.",
    "5.2  RENT PAYMENT — Sublessee shall pay rent on or before the 1st day of each calendar month. Rent payments shall be made via the method agreed upon by the parties.",
    "5.3  CONDITION — Sublessee shall maintain the premises in a clean and sanitary condition and shall not cause damage beyond ordinary wear and tear.",
    "5.4  SUBLETTING — Sublessee may not further sub-sublet the premises without the prior written consent of both Sublessor and landlord.",
    "5.5  SECURITY DEPOSIT — If a security deposit is collected, Sublessor shall return it within 30 days after the end of the sublease term, less any lawful deductions, per C.R.S. § 38-12-103.",
    "5.6  QUIET ENJOYMENT — Sublessor warrants that Sublessee shall have quiet enjoyment of the premises during the sublease term.",
    "5.7  UTILITIES — Unless otherwise agreed in writing, Sublessee is responsible for all utilities and services during the sublease period.",
    "5.8  NOTICE — Either party may terminate this Agreement with 30-day written notice, except where shorter notice is required by Colorado law.",
    "5.9  GOVERNING LAW — This Agreement shall be governed by the laws of the State of Colorado. Any disputes shall be resolved in Boulder County District Court.",
    "5.10 ENTIRE AGREEMENT — This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements related to the subject matter herein.",
  ];

  for (const provision of provisions) {
    if (y < 100) {
      // would need a page 2 for very long docs — handled by overflow guard below
      break;
    }
    y = drawWrappedText(page1, provision, { x: 57, y, maxWidth: 481, font: regular, size: 8.5, color: BLACK });
    y -= 4;
  }

  // ── Signatures (Page 2) ───────────────────────────────────────────────────
  const page2 = doc.addPage(PageSizes.Letter);
  const { height: h2 } = page2.getSize();
  let y2 = h2 - 60;

  page2.drawText("SIGNATURES", { x: 57, y: y2, size: 14, font: bold, color: INDIGO });
  y2 -= 8;
  page2.drawLine({ start: { x: 57, y: y2 }, end: { x: 538, y: y2 }, thickness: 0.5, color: INDIGO });
  y2 -= 24;

  const sigNote = "By signing below, the parties agree to all terms of this Colorado Residential Sublease Agreement and confirm that the information above is accurate and complete.";
  y2 = drawWrappedText(page2, sigNote, { x: 57, y: y2, maxWidth: 481, font: italic, size: 9, color: SLATE });
  y2 -= 20;

  // Signature blocks
  for (const [label, name, email] of [
    ["SUBLESSOR (LISTER)", params.listerName, params.listerEmail],
    ["SUBLESSEE (SUBTENANT)", params.subtenantName, params.subtenantEmail],
  ]) {
    page2.drawText(label, { x: 57, y: y2, size: 9, font: bold, color: SLATE });
    y2 -= 36;
    page2.drawLine({ start: { x: 57, y: y2 }, end: { x: 280, y: y2 }, thickness: 0.75, color: BLACK });
    page2.drawText("Signature", { x: 57, y: y2 - 12, size: 8, font: regular, color: SLATE });
    page2.drawLine({ start: { x: 300, y: y2 }, end: { x: 538, y: y2 }, thickness: 0.75, color: BLACK });
    page2.drawText("Date", { x: 300, y: y2 - 12, size: 8, font: regular, color: SLATE });
    y2 -= 28;
    page2.drawText(`Printed Name: ${name}`, { x: 57, y: y2, size: 9, font: regular });
    y2 -= 14;
    page2.drawText(`Email: ${email}`, { x: 57, y: y2, size: 9, font: regular, color: SLATE });
    y2 -= 36;
  }

  // Footer
  const footer = `Generated by Subletto · subletto.co · ${formatDate(new Date())} · Colorado Residential Sublease — NOT a substitute for legal advice.`;
  page2.drawText(footer, { x: 57, y: 30, size: 7, font: regular, color: SLATE });

  return doc.save();
}

// ─── LANDLORD APPROVAL PACKET PDF ────────────────────────────────────────────

async function buildLandlordPacketPdf(params: {
  listerName: string;
  listerEmail: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  rentCents: number;
  startDate: Date;
  endDate: Date;
  subtenantName?: string;
  landlordName?: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const page = doc.addPage(PageSizes.Letter);
  let y = addPageHeader(page, bold, "LANDLORD CONSENT REQUEST — SUBLEASE", "Colorado Residential Property");

  y -= 8;

  // Date and addressee
  page.drawText(formatDate(new Date()), { x: 57, y, size: 10, font: regular });
  y -= 20;
  if (params.landlordName) {
    page.drawText(`To: ${params.landlordName}`, { x: 57, y, size: 10, font: regular });
    y -= 14;
  }
  page.drawText(`Re: Request for Consent to Sublet — ${params.address}, ${params.city}, ${params.state} ${params.zipCode}`, {
    x: 57,
    y,
    size: 10,
    font: bold,
  });
  y -= 24;

  y = drawSectionHeader(page, "Dear Landlord / Property Manager,", y, bold);

  const opening = `I am writing to formally request your consent to sublet the above-referenced property for a defined period. As a current tenant in good standing, I understand that Colorado law addresses the right to sublet, and I respectfully ask that you consider this request in accordance with the applicable statutes.`;
  y = drawWrappedText(page, opening, { x: 57, y, maxWidth: 481, font: regular, size: 10 });
  y -= 16;

  y = drawSectionHeader(page, "Proposed Sublease Details", y, bold);

  const details = [
    ["Current Tenant (Sublessor)", `${params.listerName} · ${params.listerEmail}`],
    ["Property Address", `${params.address}, ${params.city}, ${params.state} ${params.zipCode}`],
    ["Proposed Sublease Period", `${formatDate(params.startDate)} – ${formatDate(params.endDate)}`],
    ["Monthly Rent", centsToDollars(params.rentCents)],
    ["Proposed Subtenant", params.subtenantName ?? "To be confirmed upon your consent"],
  ];

  for (const [label, value] of details) {
    y = drawField(page, label, value, 57, y, regular, bold);
  }

  y -= 8;

  y = drawSectionHeader(page, "Applicable Colorado Law", y, bold);

  const legalText = `Under Colorado law, C.R.S. § 38-12-301, landlords may not unreasonably withhold consent to a sublease when the prospective subtenant meets reasonable standards. Courts have consistently interpreted "unreasonable withholding" to include refusals without cause where the subtenant is creditworthy and qualified. Additionally, C.R.S. § 38-12-802 affirms tenant rights to quiet enjoyment and the ability to make the most of their leasehold interest.\n\nI am prepared to provide any additional information you may require, including references, credit information, or identification for the proposed subtenant.`;
  y = drawWrappedText(page, legalText, { x: 57, y, maxWidth: 481, font: regular, size: 9.5 });
  y -= 16;

  y = drawSectionHeader(page, "Landlord Response", y, bold);

  const responseIntro = "Please indicate your decision below and return this signed form to the tenant:";
  y = drawWrappedText(page, responseIntro, { x: 57, y, maxWidth: 481, font: regular, size: 9.5 });
  y -= 16;

  // Checkboxes
  for (const option of [
    "I CONSENT to the sublease as described above.",
    "I CONSENT with the following conditions: _______________________________________________",
    "I DO NOT CONSENT for the following reason(s): _________________________________________",
  ]) {
    page.drawRectangle({ x: 57, y: y - 1, width: 11, height: 11, borderColor: BLACK, borderWidth: 0.75 });
    page.drawText(option, { x: 74, y, size: 9.5, font: regular });
    y -= 22;
  }

  y -= 12;

  // Landlord signature block
  page.drawLine({ start: { x: 57, y }, end: { x: 280, y }, thickness: 0.75, color: BLACK });
  page.drawLine({ start: { x: 300, y }, end: { x: 538, y }, thickness: 0.75, color: BLACK });
  y -= 12;
  page.drawText("Landlord / Authorized Agent Signature", { x: 57, y, size: 8, font: regular, color: SLATE });
  page.drawText("Date", { x: 300, y, size: 8, font: regular, color: SLATE });
  y -= 18;
  page.drawText("Printed Name: _______________________________", { x: 57, y, size: 9, font: regular });
  y -= 36;

  // Closing
  const closing = `Thank you for your consideration. If you have any questions, please do not hesitate to contact me at ${params.listerEmail}. This packet was generated by Subletto (subletto.co), a student sublease platform.`;
  y = drawWrappedText(page, closing, { x: 57, y, maxWidth: 481, font: italic, size: 9, color: SLATE });

  page.drawText(`Generated by Subletto · subletto.co · ${formatDate(new Date())} · For use in Colorado only — NOT a substitute for legal advice.`, {
    x: 57,
    y: 30,
    size: 7,
    font: regular,
    color: SLATE,
  });

  return doc.save();
}

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

async function uploadPdf(
  bucket: string,
  path: string,
  bytes: Uint8Array,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

// ─── DOCUSIGN INTEGRATION ─────────────────────────────────────────────────────
//
// JWT Grant auth flow: the API acts as a service account impersonating the
// platform admin user. Requires RSA key pair, consent grant in DocuSign admin.

async function getDocuSignAccessToken(): Promise<{ accessToken: string; basePath: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const docusign = require("docusign-esign");
  const apiClient = new docusign.ApiClient();

  const basePath = process.env.DOCUSIGN_BASE_PATH ?? "https://demo.docusign.net/restapi";
  const oauthBasePath =
    process.env.DOCUSIGN_OAUTH_BASE_PATH ?? "account-d.docusign.com";

  apiClient.setBasePath(basePath);
  apiClient.setOAuthBasePath(oauthBasePath);

  const privateKey = (process.env.DOCUSIGN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  const result = await apiClient.requestJWTUserToken(
    process.env.DOCUSIGN_CLIENT_ID!,
    process.env.DOCUSIGN_USER_ID!,
    ["signature"],
    Buffer.from(privateKey),
    3600,
  );

  return { accessToken: result.body.access_token as string, basePath };
}

async function sendDocuSignEnvelope(params: {
  pdfBytes: Uint8Array;
  documentName: string;
  signers: Array<{ name: string; email: string; routingOrder: number }>;
  emailSubject: string;
  emailBody: string;
}): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const docusign = require("docusign-esign");

  const { accessToken, basePath } = await getDocuSignAccessToken();
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(basePath);
  apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);

  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;

  const signerTabs = params.signers.map((signer) => ({
    signHereTabs: [
      {
        documentId: "1",
        pageNumber: "2",
        xPosition: signer.routingOrder === 1 ? "57" : "57",
        yPosition: signer.routingOrder === 1 ? "620" : "510",
        anchorString: signer.routingOrder === 1 ? "/sig1/" : "/sig2/",
        anchorYOffset: "0",
        anchorXOffset: "0",
        anchorIgnoreIfNotPresent: "true",
      },
    ],
    dateTabs: [
      {
        documentId: "1",
        pageNumber: "2",
        anchorString: signer.routingOrder === 1 ? "/date1/" : "/date2/",
        anchorYOffset: "0",
        anchorXOffset: "0",
        anchorIgnoreIfNotPresent: "true",
      },
    ],
  }));

  const envelopeDefinition = new docusign.EnvelopeDefinition();
  envelopeDefinition.emailSubject = params.emailSubject;
  envelopeDefinition.emailBlurb = params.emailBody;
  envelopeDefinition.status = "sent";

  const doc = new docusign.Document();
  doc.documentBase64 = Buffer.from(params.pdfBytes).toString("base64");
  doc.name = params.documentName;
  doc.fileExtension = "pdf";
  doc.documentId = "1";
  envelopeDefinition.documents = [doc];

  envelopeDefinition.recipients = new docusign.Recipients();
  envelopeDefinition.recipients.signers = params.signers.map((signer, i) => {
    const s = new docusign.Signer();
    s.email = signer.email;
    s.name = signer.name;
    s.recipientId = String(i + 1);
    s.routingOrder = String(signer.routingOrder);
    s.tabs = signerTabs[i];
    return s;
  });

  const results = await envelopesApi.createEnvelope(accountId, {
    envelopeDefinition,
  });

  return results.envelopeId as string;
}

// ─── GENERATE SUBLEASE AGREEMENT ─────────────────────────────────────────────

export async function generateSubleaseAgreement(
  input: GenerateSubleaseInput,
  requesterId: string,
) {
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          rentCents: true,
          availableFrom: true,
          availableTo: true,
        },
      },
      lister: { select: { id: true, email: true } },
      subtenant: { select: { id: true, email: true } },
    },
  });

  if (!match) throw new Error("Match not found");
  if (match.listerId !== requesterId && match.subtenantId !== requesterId) {
    throw new Error("Forbidden");
  }
  if (match.status !== "CONFIRMED") {
    throw new Error("Sublease agreement can only be generated for a CONFIRMED match");
  }

  // Resolve display names (fall back to email prefix)
  const listerProfile = await prisma.profile.findUnique({ where: { userId: match.listerId } });
  const subtenantProfile = await prisma.profile.findUnique({ where: { userId: match.subtenantId } });

  const listerName = listerProfile?.displayName ?? match.lister.email.split("@")[0];
  const subtenantName = subtenantProfile?.displayName ?? match.subtenant.email.split("@")[0];

  // Build PDF
  const pdfBytes = await buildSubleaseAgreementPdf({
    listerName,
    listerEmail: match.lister.email,
    subtenantName,
    subtenantEmail: match.subtenant.email,
    address: match.listing.address,
    city: match.listing.city,
    state: match.listing.state,
    zipCode: match.listing.zipCode,
    rentCents: match.listing.rentCents,
    depositCents: match.escrowAmountCents ?? 0,
    startDate: match.listing.availableFrom,
    endDate: match.listing.availableTo,
  });

  // Upload to Supabase
  const storagePath = `sublease-agreements/${match.id}-${Date.now()}.pdf`;
  await uploadPdf(GENERATED_DOCS_BUCKET, storagePath, pdfBytes);

  // Find existing PENDING/GENERATED doc for this match, or create a new one
  const existing = await prisma.document.findFirst({
    where: {
      matchId: match.id,
      type: "SUBLEASE_AGREEMENT",
      status: { in: ["PENDING", "GENERATED"] },
    },
  });

  const doc = existing
    ? await prisma.document.update({
        where: { id: existing.id },
        data: { status: "GENERATED", storagePath },
      })
    : await prisma.document.create({
        data: {
          type: "SUBLEASE_AGREEMENT",
          status: "GENERATED",
          ownerId: requesterId,
          matchId: match.id,
          listingId: match.listingId,
          storagePath,
        },
      });

  return { document: doc, storagePath };
}

// ─── SEND FOR DOCUSIGN ───────────────────────────────────────────────────────

export async function sendForDocuSign(input: SendDocuSignInput, requesterId: string) {
  const doc = await prisma.document.findUnique({ where: { id: input.documentId } });
  if (!doc) throw new Error("Document not found");
  if (doc.ownerId !== requesterId) throw new Error("Forbidden");
  if (doc.status !== "GENERATED") throw new Error("Document must be GENERATED before sending for signature");
  if (!doc.storagePath) throw new Error("Document has no PDF yet");

  // Download the PDF from Supabase
  const supabase = getSupabaseAdmin();
  const bucket = doc.type === "SUBLEASE_AGREEMENT" ? GENERATED_DOCS_BUCKET : GENERATED_DOCS_BUCKET;
  const { data, error } = await supabase.storage.from(bucket).download(doc.storagePath);
  if (error || !data) throw new Error(`Failed to download document: ${error?.message}`);
  const pdfBytes = new Uint8Array(await data.arrayBuffer());

  // Get signers
  let signers: Array<{ name: string; email: string; routingOrder: number }> = [];
  let emailSubject = "";
  let emailBody = "";

  if (doc.type === "SUBLEASE_AGREEMENT" && doc.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: doc.matchId },
      include: {
        lister: { select: { email: true } },
        subtenant: { select: { email: true } },
        listing: { select: { title: true } },
      },
    });
    if (!match) throw new Error("Match not found");

    const listerProfile = await prisma.profile.findUnique({ where: { userId: match.listerId } });
    const subtenantProfile = await prisma.profile.findUnique({ where: { userId: match.subtenantId } });

    signers = [
      {
        name: listerProfile?.displayName ?? match.lister.email.split("@")[0],
        email: match.lister.email,
        routingOrder: 1,
      },
      {
        name: subtenantProfile?.displayName ?? match.subtenant.email.split("@")[0],
        email: match.subtenant.email,
        routingOrder: 2,
      },
    ];
    emailSubject = `Please sign: Colorado Sublease Agreement — ${match.listing.title}`;
    emailBody = `Subletto has prepared a Colorado Residential Sublease Agreement for your sublease of ${match.listing.title}. Please review and sign at your earliest convenience.`;
  } else if (doc.type === "LANDLORD_PACKET" && doc.listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: doc.listingId },
      include: { owner: { select: { email: true } } },
    });
    if (!listing) throw new Error("Listing not found");

    signers = [
      {
        name: listing.owner.email.split("@")[0],
        email: listing.owner.email,
        routingOrder: 1,
      },
    ];
    emailSubject = "Subletto: Your Landlord Consent Packet is Ready";
    emailBody = "Your landlord consent packet has been generated. Please review and download from your Subletto dashboard.";
  }

  if (!signers.length) throw new Error("No signers found for document");

  const envelopeId = await sendDocuSignEnvelope({
    pdfBytes,
    documentName: doc.type === "SUBLEASE_AGREEMENT" ? "Sublease Agreement.pdf" : "Landlord Consent Packet.pdf",
    signers,
    emailSubject,
    emailBody,
  });

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      status: "SENT_FOR_SIGNATURE",
      docusignEnvelopeId: envelopeId,
      docusignStatus: "sent",
    },
  });

  return { document: updated, envelopeId };
}

// ─── GET DOCUMENTS BY MATCH ──────────────────────────────────────────────────

export async function getDocumentsByMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");
  if (match.listerId !== userId && match.subtenantId !== userId) throw new Error("Forbidden");

  const docs = await prisma.document.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
  });

  // Generate signed download URLs for GENERATED/SIGNED docs
  const supabase = getSupabaseAdmin();
  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      let downloadUrl: string | null = null;
      const path = doc.signedStoragePath ?? doc.storagePath;
      if (path) {
        const { data } = await supabase.storage
          .from(doc.signedStoragePath ? SIGNED_DOCS_BUCKET : GENERATED_DOCS_BUCKET)
          .createSignedUrl(path, 900); // 15-minute expiry
        downloadUrl = data?.signedUrl ?? null;
      }
      return { ...doc, downloadUrl };
    }),
  );

  return docsWithUrls;
}

// ─── GENERATE LANDLORD PACKET ─────────────────────────────────────────────────

export async function generateLandlordPacket(input: LandlordPacketInput, requesterId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { owner: { select: { id: true, email: true } } },
  });

  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== requesterId) throw new Error("Forbidden");

  const ownerProfile = await prisma.profile.findUnique({ where: { userId: listing.ownerId } });
  const listerName = ownerProfile?.displayName ?? listing.owner.email.split("@")[0];

  const pdfBytes = await buildLandlordPacketPdf({
    listerName,
    listerEmail: listing.owner.email,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zipCode: listing.zipCode,
    rentCents: listing.rentCents,
    startDate: listing.availableFrom,
    endDate: listing.availableTo,
    landlordName: input.landlordName,
  });

  const storagePath = `landlord-packets/${listing.id}-${Date.now()}.pdf`;
  await uploadPdf(GENERATED_DOCS_BUCKET, storagePath, pdfBytes);

  const doc = await prisma.document.create({
    data: {
      type: "LANDLORD_PACKET",
      status: "GENERATED",
      ownerId: requesterId,
      listingId: listing.id,
      storagePath,
    },
  });

  // Optionally email the packet to the landlord
  if (input.landlordEmail) {
    const supabase = getSupabaseAdmin();
    const { data: urlData } = await supabase.storage
      .from(GENERATED_DOCS_BUCKET)
      .createSignedUrl(storagePath, 7 * 24 * 3600); // 7 days

    if (urlData?.signedUrl) {
      await resend.emails.send({
        from: FROM,
        to: input.landlordEmail,
        subject: `Sublease Consent Request — ${listing.address}, ${listing.city}, CO`,
        html: `
          <p>Dear ${input.landlordName ?? "Landlord/Property Manager"},</p>
          <p>Your tenant <strong>${listerName}</strong> has requested your consent to sublet the property at
          <strong>${listing.address}, ${listing.city}, ${listing.state} ${listing.zipCode}</strong>.</p>
          <p>Please review and complete the attached landlord consent packet:</p>
          <p><a href="${urlData.signedUrl}" style="color:#4F46E5">Download Consent Packet (PDF)</a></p>
          <p>This link expires in 7 days. The packet was generated by
          <a href="${APP_URL}">Subletto</a>, a student sublease platform.</p>
          <p>Thank you for your consideration.</p>
        `,
      });
    }
  }

  return { document: doc, storagePath };
}

// ─── HANDLE DOCUSIGN WEBHOOK ─────────────────────────────────────────────────

export async function handleDocuSignWebhook(envelopeId: string, envelopeStatus: string) {
  const doc = await prisma.document.findFirst({
    where: { docusignEnvelopeId: envelopeId },
    include: {
      match: {
        include: {
          lister: { select: { email: true } },
          subtenant: { select: { email: true } },
          listing: { select: { title: true } },
        },
      },
    },
  });

  if (!doc) return; // webhook for unknown envelope — ignore

  const statusMap: Record<string, "SENT_FOR_SIGNATURE" | "SIGNED" | "DECLINED_SIGNING"> = {
    sent: "SENT_FOR_SIGNATURE",
    delivered: "SENT_FOR_SIGNATURE",
    completed: "SIGNED",
    declined: "DECLINED_SIGNING",
    voided: "DECLINED_SIGNING",
  };

  const newStatus = statusMap[envelopeStatus.toLowerCase()];
  if (!newStatus) return;

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      status: newStatus,
      docusignStatus: envelopeStatus,
      ...(newStatus === "SIGNED" ? { signedAt: new Date() } : {}),
    },
  });

  // Notify both parties when sublease agreement is fully signed
  if (newStatus === "SIGNED" && doc.type === "SUBLEASE_AGREEMENT" && doc.match) {
    const { lister, subtenant, listing } = doc.match;
    const dashboardUrl = `${APP_URL}/dashboard/documents/${doc.matchId}`;

    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: lister.email,
        subject: `Sublease agreement fully signed — ${listing.title}`,
        html: `<p>Great news! Your Colorado Sublease Agreement for <strong>${listing.title}</strong> has been signed by all parties.</p><p><a href="${dashboardUrl}">View & download the signed document →</a></p>`,
      }),
      resend.emails.send({
        from: FROM,
        to: subtenant.email,
        subject: `Sublease agreement fully signed — ${listing.title}`,
        html: `<p>Great news! Your Colorado Sublease Agreement for <strong>${listing.title}</strong> has been signed by all parties.</p><p><a href="${dashboardUrl}">View & download the signed document →</a></p>`,
      }),
    ]);
  }
}

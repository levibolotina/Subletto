-- CreateEnum
CREATE TYPE "ListerLeaseAnswer" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LeasePermission" AS ENUM ('PERMITTED', 'PROHIBITED', 'REQUIRES_LANDLORD_APPROVAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SUBLEASE_AGREEMENT', 'LANDLORD_PACKET');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'GENERATED', 'SENT_FOR_SIGNATURE', 'SIGNED', 'DECLINED_SIGNING');

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "leasePermission" "LeasePermission",
ADD COLUMN     "listerLeaseAnswer" "ListerLeaseAnswer";

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "ownerId" TEXT NOT NULL,
    "matchId" TEXT,
    "listingId" TEXT,
    "storagePath" TEXT,
    "signedStoragePath" TEXT,
    "docusignEnvelopeId" TEXT,
    "docusignStatus" TEXT,
    "addOnPaidAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_docusignEnvelopeId_key" ON "documents"("docusignEnvelopeId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

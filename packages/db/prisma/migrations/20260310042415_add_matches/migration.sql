/*
  Warnings:

  - A unique constraint covering the columns `[confirmationToken]` on the table `listings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bathrooms` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bedrooms` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `neighborhood` to the `listings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING_PAYMENT', 'AWAITING_LISTER', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('NONE', 'PENDING_PAYMENT', 'HELD', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CONNECTION_FEE', 'ESCROW_RENT', 'ESCROW_DEPOSIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'REFUNDED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingStatus" ADD VALUE 'MATCHED';
ALTER TYPE "ListingStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "bathrooms" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "bedrooms" INTEGER NOT NULL,
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "furnished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "neighborhood" TEXT NOT NULL,
ADD COLUMN     "parking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "petFriendly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "neighborhood" TEXT,
    "minRentCents" INTEGER,
    "maxRentCents" INTEGER,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "bedrooms" INTEGER,
    "petFriendly" BOOLEAN,
    "furnished" BOOLEAN,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listerId" TEXT NOT NULL,
    "subtenantId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "checkoutSessionId" TEXT,
    "feePaidAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'NONE',
    "escrowPaymentIntentId" TEXT,
    "escrowAmountCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" "PaymentType" NOT NULL,
    "stripeId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_checkoutSessionId_key" ON "matches"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_escrowPaymentIntentId_key" ON "matches"("escrowPaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeId_key" ON "payments"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "listings_confirmationToken_key" ON "listings"("confirmationToken");

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_listerId_fkey" FOREIGN KEY ("listerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_subtenantId_fkey" FOREIGN KEY ("subtenantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `formalizationStatus` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `totalEstimatedPrice` on the `Quote` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CustomerResponseStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'UPDATED', 'IN_NEGOTIATION', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClientFormalizationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "ViabilityStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "formalizationStatus",
DROP COLUMN "totalEstimatedPrice",
ADD COLUMN     "clientFormalizationStatus" "ClientFormalizationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "customerPrice" DECIMAL(12,4),
ADD COLUMN     "customerResponseStatus" "CustomerResponseStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "estimatedProductionTime" INTEGER;

-- DropEnum
DROP TYPE "FormalizationStatus";

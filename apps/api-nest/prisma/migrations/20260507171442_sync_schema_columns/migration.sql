-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isBaseProduct" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sizeGuideText" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "discountPct" DECIMAL(7,4);

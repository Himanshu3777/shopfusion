-- Dynamic pricing: profit-safe price bounds + price history log
ALTER TABLE "Product" ADD COLUMN "minPrice" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN "maxPrice" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN "lastPriceChange" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "priceTrend" TEXT;
ALTER TABLE "Product" ADD COLUMN "priceTrendAt" TIMESTAMP(3);

CREATE TABLE "PriceHistory" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "oldPrice" DECIMAL(12,2) NOT NULL,
  "newPrice" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceHistory_productId_createdAt_idx" ON "PriceHistory"("productId", "createdAt");

ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

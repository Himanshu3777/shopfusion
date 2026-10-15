-- Add COD to PaymentProvider enum (transaction-safe: ALTER TYPE .. ADD VALUE
-- cannot run inside a transaction block, so rebuild the enum instead)
CREATE TYPE "PaymentProvider_new" AS ENUM ('MOCK', 'STRIPE', 'RAZORPAY', 'COD');
ALTER TABLE "Payment" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING "provider"::text::"PaymentProvider_new";
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'MOCK';
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";

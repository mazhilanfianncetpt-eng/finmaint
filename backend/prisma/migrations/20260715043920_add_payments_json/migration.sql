/*
  Warnings:

  - You are about to drop the column `paidInstallments` on the `Borrower` table. All the data in the column will be lost.

*/

-- Step 1: Add the new payments column (keep paidInstallments for now)
ALTER TABLE "Borrower" ADD COLUMN "payments" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- Step 2: Migrate existing data — convert paidInstallments[] to payments[] with dueDate=paidOn
UPDATE "Borrower"
SET payments = (
  SELECT array_agg(jsonb_build_object('dueDate', d, 'paidOn', d))
  FROM unnest("paidInstallments") AS d
)
WHERE array_length("paidInstallments", 1) > 0;

-- Step 3: Now safe to drop the old column
ALTER TABLE "Borrower" DROP COLUMN "paidInstallments";
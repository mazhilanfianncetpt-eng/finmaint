-- Add borrowerCode column, starting sequence from 5 (so first code = "05")
-- We use a sequence so codes are always unique and auto-increment.

CREATE SEQUENCE IF NOT EXISTS borrower_code_seq START WITH 5 INCREMENT BY 1;

ALTER TABLE "Borrower"
  ADD COLUMN IF NOT EXISTS "borrowerCode" TEXT;

-- Back-fill existing rows with codes 05, 06, 07 … in creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "Borrower"
)
UPDATE "Borrower" b
SET "borrowerCode" = LPAD((4 + n.rn)::TEXT, 2, '0')
FROM numbered n
WHERE b.id = n.id;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "Borrower"
  ALTER COLUMN "borrowerCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Borrower_borrowerCode_key" ON "Borrower"("borrowerCode");

-- Advance sequence past any codes we just assigned
SELECT setval('borrower_code_seq', COALESCE((SELECT MAX(CAST("borrowerCode" AS INTEGER)) FROM "Borrower"), 4));

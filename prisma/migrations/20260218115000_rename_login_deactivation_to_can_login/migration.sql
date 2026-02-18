-- Rename isLoginDeactivated to canLogin with logic inversion
-- First, drop the existing index
DROP INDEX IF EXISTS "Employee_isLoginDeactivated_idx";

-- Add the new canLogin column with the inverted logic
ALTER TABLE "Employee" ADD COLUMN "canLogin" BOOLEAN NOT NULL DEFAULT true;

-- Migrate data: invert the logic (NOT isLoginDeactivated = canLogin)
UPDATE "Employee" SET "canLogin" = NOT "isLoginDeactivated";

-- Drop the old column
ALTER TABLE "Employee" DROP COLUMN "isLoginDeactivated";

-- Create index for the new column
CREATE INDEX "Employee_canLogin_idx" ON "Employee"("canLogin");

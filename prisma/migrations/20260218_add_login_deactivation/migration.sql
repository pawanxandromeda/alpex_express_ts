-- Add isLoginDeactivated field to Employee table
ALTER TABLE "Employee" ADD COLUMN "isLoginDeactivated" BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX "Employee_isLoginDeactivated_idx" ON "Employee"("isLoginDeactivated");

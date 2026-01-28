/*
  Warnings:

  - You are about to drop the column `username` on the `Todo` table. All the data in the column will be lost.
  - Added the required column `createdByUsername` to the `Todo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- AlterTable
ALTER TABLE "Todo" DROP COLUMN "username",
ADD COLUMN     "assignedToUsername" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdByUsername" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "priority" "TodoPriority" NOT NULL DEFAULT 'Medium';

-- CreateIndex
CREATE INDEX "Todo_createdByUsername_idx" ON "Todo"("createdByUsername");

-- CreateIndex
CREATE INDEX "Todo_assignedToUsername_idx" ON "Todo"("assignedToUsername");

-- CreateIndex
CREATE INDEX "Todo_priority_idx" ON "Todo"("priority");

-- CreateIndex
CREATE INDEX "Todo_dueDate_idx" ON "Todo"("dueDate");

-- CreateIndex
CREATE INDEX "Todo_completed_idx" ON "Todo"("completed");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_createdByUsername_fkey" FOREIGN KEY ("createdByUsername") REFERENCES "Employee"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_assignedToUsername_fkey" FOREIGN KEY ("assignedToUsername") REFERENCES "Employee"("username") ON DELETE SET NULL ON UPDATE CASCADE;

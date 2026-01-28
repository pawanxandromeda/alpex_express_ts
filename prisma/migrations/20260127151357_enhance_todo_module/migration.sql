-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('Open', 'InProgress', 'OnHold', 'Completed', 'Cancelled');

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_createdById_fkey";

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "status" "TodoStatus" NOT NULL DEFAULT 'Open';

-- CreateTable
CREATE TABLE "TodoMention" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "mentionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoUpdate" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updateType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TodoMention_employeeId_idx" ON "TodoMention"("employeeId");

-- CreateIndex
CREATE INDEX "TodoMention_todoId_idx" ON "TodoMention"("todoId");

-- CreateIndex
CREATE UNIQUE INDEX "TodoMention_todoId_employeeId_key" ON "TodoMention"("todoId", "employeeId");

-- CreateIndex
CREATE INDEX "TodoUpdate_todoId_idx" ON "TodoUpdate"("todoId");

-- CreateIndex
CREATE INDEX "TodoUpdate_createdAt_idx" ON "TodoUpdate"("createdAt");

-- CreateIndex
CREATE INDEX "Todo_status_idx" ON "Todo"("status");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoMention" ADD CONSTRAINT "TodoMention_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoMention" ADD CONSTRAINT "TodoMention_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoUpdate" ADD CONSTRAINT "TodoUpdate_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

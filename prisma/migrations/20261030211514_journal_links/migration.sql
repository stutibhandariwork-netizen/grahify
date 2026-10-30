-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "linkId" TEXT,
ADD COLUMN     "linkType" TEXT;

-- CreateIndex
CREATE INDEX "JournalEntry_userId_linkType_linkId_idx" ON "JournalEntry"("userId", "linkType", "linkId");

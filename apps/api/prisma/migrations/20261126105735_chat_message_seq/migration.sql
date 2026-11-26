-- DropIndex
DROP INDEX "chat_messages_chatId_createdAt_idx";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "chat_messages_chatId_seq_idx" ON "chat_messages"("chatId", "seq");

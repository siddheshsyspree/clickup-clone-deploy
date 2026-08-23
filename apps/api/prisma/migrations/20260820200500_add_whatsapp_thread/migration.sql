-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "CommentChannel_new" AS ENUM ('COMMENT', 'EMAIL');
ALTER TABLE "public"."Comment" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "Comment" ALTER COLUMN "channel" TYPE "CommentChannel_new" USING ("channel"::text::"CommentChannel_new");
ALTER TYPE "CommentChannel" RENAME TO "CommentChannel_old";
ALTER TYPE "CommentChannel_new" RENAME TO "CommentChannel";
DROP TYPE "public"."CommentChannel_old";
ALTER TABLE "Comment" ALTER COLUMN "channel" SET DEFAULT 'COMMENT';
COMMIT;

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "whatsappMeta";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "whatsappPhone" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppMessage_taskId_idx" ON "WhatsAppMessage"("taskId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_phone_idx" ON "WhatsAppMessage"("phone");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_providerMessageId_idx" ON "WhatsAppMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "Task_whatsappPhone_idx" ON "Task"("whatsappPhone");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


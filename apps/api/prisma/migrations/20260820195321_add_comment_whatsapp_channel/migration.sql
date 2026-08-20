-- AlterEnum
ALTER TYPE "CommentChannel" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "whatsappMeta" JSONB;

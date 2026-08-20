-- CreateEnum
CREATE TYPE "CommentChannel" AS ENUM ('COMMENT', 'EMAIL');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "channel" "CommentChannel" NOT NULL DEFAULT 'COMMENT',
ADD COLUMN     "emailMeta" JSONB;

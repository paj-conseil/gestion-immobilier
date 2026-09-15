-- AlterTable
ALTER TABLE "Scope" ADD COLUMN     "emailTemplateCorps" TEXT,
ADD COLUMN     "exigerSignatureDocuments" BOOLEAN NOT NULL DEFAULT false;

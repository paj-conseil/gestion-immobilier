-- AlterTable
ALTER TABLE "DocumentGenere" ADD COLUMN     "dataJson" JSONB,
ADD COLUMN     "signatureUrl" TEXT,
ADD COLUMN     "signeLe" TIMESTAMP(3),
ADD COLUMN     "signePar" TEXT;

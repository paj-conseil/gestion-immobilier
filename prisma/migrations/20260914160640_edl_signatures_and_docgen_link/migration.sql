-- AlterTable
ALTER TABLE "DocumentGenere" ADD COLUMN     "edlId" TEXT;

-- AlterTable
ALTER TABLE "EtatDesLieux" ADD COLUMN     "signatureBailleurLe" TIMESTAMP(3),
ADD COLUMN     "signatureBailleurPar" TEXT,
ADD COLUMN     "signatureBailleurUrl" TEXT,
ADD COLUMN     "signatureLocataireLe" TIMESTAMP(3),
ADD COLUMN     "signatureLocatairePar" TEXT,
ADD COLUMN     "signatureLocataireUrl" TEXT;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_edlId_fkey" FOREIGN KEY ("edlId") REFERENCES "EtatDesLieux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

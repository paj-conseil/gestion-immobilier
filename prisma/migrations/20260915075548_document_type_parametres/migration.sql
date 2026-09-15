-- AlterTable
ALTER TABLE "DocumentGenere" ADD COLUMN     "signatureProprietaireUrl" TEXT,
ADD COLUMN     "signeProprietaireLe" TIMESTAMP(3),
ADD COLUMN     "signeProprietairePar" TEXT;

-- CreateTable
CREATE TABLE "DocumentTypeParametre" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nomAffichage" TEXT,
    "texteIntro" TEXT,
    "texteClausesAdditionnelles" TEXT,
    "emailSujet" TEXT,
    "emailCorps" TEXT,
    "signataireLocataire" BOOLEAN NOT NULL DEFAULT true,
    "signataireProprietaire" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DocumentTypeParametre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTypeParametre_scopeId_type_key" ON "DocumentTypeParametre"("scopeId", "type");

-- AddForeignKey
ALTER TABLE "DocumentTypeParametre" ADD CONSTRAINT "DocumentTypeParametre_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

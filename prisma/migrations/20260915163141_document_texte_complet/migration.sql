/*
  Warnings:

  - You are about to drop the column `texteClausesAdditionnelles` on the `DocumentTypeParametre` table. All the data in the column will be lost.
  - You are about to drop the column `texteIntro` on the `DocumentTypeParametre` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DocumentTypeParametre" DROP COLUMN "texteClausesAdditionnelles",
DROP COLUMN "texteIntro",
ADD COLUMN     "texteDocument" TEXT;

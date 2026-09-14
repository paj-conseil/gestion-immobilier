/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `EDLItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "codesAcces" TEXT;

-- AlterTable
ALTER TABLE "EDLItem" DROP COLUMN "photoUrl",
ADD COLUMN     "quantite" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'ETAT',
ALTER COLUMN "etat" DROP NOT NULL,
ALTER COLUMN "etat" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EDLPhoto" ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "pieceId" TEXT;

-- AlterTable
ALTER TABLE "EtatDesLieux" ADD COLUMN     "fileUrl" TEXT;

-- AddForeignKey
ALTER TABLE "EDLPhoto" ADD CONSTRAINT "EDLPhoto_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "EDLPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDLPhoto" ADD CONSTRAINT "EDLPhoto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EDLItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

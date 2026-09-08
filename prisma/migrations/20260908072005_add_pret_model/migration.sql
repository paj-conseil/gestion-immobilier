-- CreateTable
CREATE TABLE "Pret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bienId" TEXT NOT NULL,
    "banque" TEXT,
    "montant" REAL,
    "tauxInteret" REAL,
    "mensualite" REAL,
    "dureeMois" INTEGER,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pret_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

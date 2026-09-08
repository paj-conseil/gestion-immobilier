-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bien" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT,
    "ville" TEXT,
    "complement" TEXT,
    "type" TEXT NOT NULL DEFAULT 'APPARTEMENT',
    "statut" TEXT NOT NULL DEFAULT 'VACANT',
    "surface" REAL,
    "description" TEXT,
    "telephone" TEXT,
    "numeroCompteur" TEXT,
    "couleur" TEXT DEFAULT '#1E5631',
    "prixAchat" REAL,
    "fraisNotaire" REAL,
    "montantTravaux" REAL,
    "apportPersonnel" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bien_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bien" ("adresse", "apportPersonnel", "codePostal", "complement", "couleur", "createdAt", "description", "fraisNotaire", "id", "montantTravaux", "numeroCompteur", "prixAchat", "scopeId", "statut", "surface", "telephone", "type", "updatedAt", "ville") SELECT "adresse", "apportPersonnel", "codePostal", "complement", "couleur", "createdAt", "description", "fraisNotaire", "id", "montantTravaux", "numeroCompteur", "prixAchat", "scopeId", "statut", "surface", "telephone", "type", "updatedAt", "ville" FROM "Bien";
DROP TABLE "Bien";
ALTER TABLE "new_Bien" RENAME TO "Bien";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


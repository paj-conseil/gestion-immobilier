-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Locataire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Locataire_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Locataire" ("createdAt", "email", "id", "nom", "prenom", "scopeId", "telephone") SELECT "createdAt", "email", "id", "nom", "prenom", "scopeId", "telephone" FROM "Locataire";
DROP TABLE "Locataire";
ALTER TABLE "new_Locataire" RENAME TO "Locataire";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

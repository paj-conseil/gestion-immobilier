-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Scope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scope_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITEUR',
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bien" (
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
    "montantFinance" REAL,
    "banque" TEXT,
    "tauxInteret" REAL,
    "mensualite" REAL,
    "dureeMois" INTEGER,
    "dateDebutPret" DATETIME,
    "dateFinPret" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bien_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BienPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bienId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BienPhoto_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Locataire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Locataire_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentLocataire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locataireId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'MANQUANT',
    "fileUrl" TEXT,
    "uploadedAt" DATETIME,
    CONSTRAINT "DocumentLocataire_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bienId" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "loyerHC" REAL NOT NULL,
    "charges" REAL NOT NULL DEFAULT 0,
    "depotGarantie" REAL,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "dateProchaineRevision" DATETIME,
    "indiceIRLReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationLocataire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "locataireId" TEXT NOT NULL,
    CONSTRAINT "LocationLocataire_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationLocataire_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentGenere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bienId" TEXT,
    "locationId" TEXT,
    "locataireId" TEXT,
    "periode" TEXT,
    "fileUrl" TEXT NOT NULL,
    "genereLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentGenere_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentGenere_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentGenere_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentGenere_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentGenereId" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ENVOYE',
    "envoyeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" DATETIME,
    CONSTRAINT "EmailLog_documentGenereId_fkey" FOREIGN KEY ("documentGenereId") REFERENCES "DocumentGenere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EtatDesLieux" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bienId" TEXT NOT NULL,
    "locationId" TEXT,
    "locataireId" TEXT,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EtatDesLieux_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EtatDesLieux_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EtatDesLieux_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EDLPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "edlId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EDLPhoto_edlId_fkey" FOREIGN KEY ("edlId") REFERENCES "EtatDesLieux" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EDLPiece" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "edlId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EDLPiece_edlId_fkey" FOREIGN KEY ("edlId") REFERENCES "EtatDesLieux" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EDLItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pieceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "etat" TEXT NOT NULL DEFAULT 'BON',
    "commentaire" TEXT,
    "photoUrl" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EDLItem_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "EDLPiece" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompteBancaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "banque" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    CONSTRAINT "CompteBancaire_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RelevBancaireImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nbLignes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RelevBancaireImport_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteBancaire" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Poste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "motsCles" TEXT,
    CONSTRAINT "Poste_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compteId" TEXT NOT NULL,
    "bienId" TEXT,
    "posteId" TEXT,
    "importId" TEXT,
    "date" DATETIME NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUEL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteBancaire" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "RelevBancaireImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_scopeId_key" ON "Membership"("userId", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationLocataire_locationId_locataireId_key" ON "LocationLocataire"("locationId", "locataireId");

-- CreateIndex
CREATE UNIQUE INDEX "Poste_scopeId_nom_key" ON "Poste"("scopeId", "nom");

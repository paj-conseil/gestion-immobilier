-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scope" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITEUR',
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bien" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT,
    "ville" TEXT,
    "complement" TEXT,
    "type" TEXT NOT NULL DEFAULT 'APPARTEMENT',
    "statut" TEXT NOT NULL DEFAULT 'VACANT',
    "surface" DOUBLE PRECISION,
    "description" TEXT,
    "telephone" TEXT,
    "numeroCompteur" TEXT,
    "couleur" TEXT DEFAULT '#1E5631',
    "prixAchat" DOUBLE PRECISION,
    "fraisNotaire" DOUBLE PRECISION,
    "montantTravaux" DOUBLE PRECISION,
    "apportPersonnel" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pret" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "banque" TEXT,
    "montant" DOUBLE PRECISION,
    "tauxInteret" DOUBLE PRECISION,
    "mensualite" DOUBLE PRECISION,
    "dureeMois" INTEGER,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BienPhoto" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BienPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locataire" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "lieuNaissance" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Locataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLocataire" (
    "id" TEXT NOT NULL,
    "locataireId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'MANQUANT',
    "fileUrl" TEXT,
    "uploadedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentLocataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "loyerHC" DOUBLE PRECISION NOT NULL,
    "charges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depotGarantie" DOUBLE PRECISION,
    "depotGarantieDateReglement" TIMESTAMP(3),
    "depotGarantieRembourse" DOUBLE PRECISION,
    "depotGarantieDateRemboursement" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "dateProchaineRevision" TIMESTAMP(3),
    "indiceIRLReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationLocataire" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "locataireId" TEXT NOT NULL,

    CONSTRAINT "LocationLocataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGenere" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bienId" TEXT,
    "locationId" TEXT,
    "locataireId" TEXT,
    "periode" TEXT,
    "fileUrl" TEXT NOT NULL,
    "genereLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentGenere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "documentGenereId" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ENVOYE',
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtatDesLieux" (
    "id" TEXT NOT NULL,
    "bienId" TEXT NOT NULL,
    "locationId" TEXT,
    "locataireId" TEXT,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtatDesLieux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EDLPhoto" (
    "id" TEXT NOT NULL,
    "edlId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EDLPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EDLPiece" (
    "id" TEXT NOT NULL,
    "edlId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EDLPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EDLItem" (
    "id" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "etat" TEXT NOT NULL DEFAULT 'BON',
    "commentaire" TEXT,
    "photoUrl" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EDLItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteBancaire" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "banque" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "CompteBancaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelevBancaireImport" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nbLignes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RelevBancaireImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poste" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "motsCles" TEXT,

    CONSTRAINT "Poste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "bienId" TEXT,
    "posteId" TEXT,
    "importId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_scopeId_key" ON "Membership"("userId", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationLocataire_locationId_locataireId_key" ON "LocationLocataire"("locationId", "locataireId");

-- CreateIndex
CREATE UNIQUE INDEX "Poste_scopeId_nom_key" ON "Poste"("scopeId", "nom");

-- AddForeignKey
ALTER TABLE "Scope" ADD CONSTRAINT "Scope_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pret" ADD CONSTRAINT "Pret_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BienPhoto" ADD CONSTRAINT "BienPhoto_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locataire" ADD CONSTRAINT "Locataire_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLocataire" ADD CONSTRAINT "DocumentLocataire_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationLocataire" ADD CONSTRAINT "LocationLocataire_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationLocataire" ADD CONSTRAINT "LocationLocataire_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_documentGenereId_fkey" FOREIGN KEY ("documentGenereId") REFERENCES "DocumentGenere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Locataire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDLPhoto" ADD CONSTRAINT "EDLPhoto_edlId_fkey" FOREIGN KEY ("edlId") REFERENCES "EtatDesLieux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDLPiece" ADD CONSTRAINT "EDLPiece_edlId_fkey" FOREIGN KEY ("edlId") REFERENCES "EtatDesLieux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EDLItem" ADD CONSTRAINT "EDLItem_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "EDLPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteBancaire" ADD CONSTRAINT "CompteBancaire_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelevBancaireImport" ADD CONSTRAINT "RelevBancaireImport_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poste" ADD CONSTRAINT "Poste_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_posteId_fkey" FOREIGN KEY ("posteId") REFERENCES "Poste"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "RelevBancaireImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

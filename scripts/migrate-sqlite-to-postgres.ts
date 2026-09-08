/**
 * Copie toutes les données réelles de l'ancienne base SQLite locale
 * (prisma/dev.db) vers la nouvelle base PostgreSQL (Neon) qui vient d'être
 * initialisée avec le même schéma. À exécuter une seule fois, juste après la
 * première migration Postgres (`prisma migrate dev --name init`), pendant
 * que la base Postgres est encore vide.
 *
 * Usage : npx tsx scripts/migrate-sqlite-to-postgres.ts
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sqlite = new Database(path.resolve(__dirname, '../prisma/dev.db'), { readonly: true });

function rows(table: string): Record<string, unknown>[] {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
}

function toDates(rows: Record<string, unknown>[], fields: string[]) {
  return rows.map((r) => {
    const copy = { ...r };
    for (const f of fields) {
      if (copy[f] != null) copy[f] = new Date(copy[f] as string);
    }
    return copy;
  });
}

async function main() {
  const users = toDates(rows('User'), ['createdAt']);
  if (users.length) await prisma.user.createMany({ data: users as never });
  console.log(`User: ${users.length}`);

  const scopes = toDates(rows('Scope'), ['createdAt']);
  if (scopes.length) await prisma.scope.createMany({ data: scopes as never });
  console.log(`Scope: ${scopes.length}`);

  const memberships = toDates(rows('Membership'), ['createdAt']);
  if (memberships.length) await prisma.membership.createMany({ data: memberships as never });
  console.log(`Membership: ${memberships.length}`);

  const biens = toDates(rows('Bien'), ['createdAt', 'updatedAt']);
  if (biens.length) await prisma.bien.createMany({ data: biens as never });
  console.log(`Bien: ${biens.length}`);

  const prets = toDates(rows('Pret'), ['dateDebut', 'dateFin', 'createdAt']);
  if (prets.length) await prisma.pret.createMany({ data: prets as never });
  console.log(`Pret: ${prets.length}`);

  const bienPhotos = rows('BienPhoto');
  if (bienPhotos.length) await prisma.bienPhoto.createMany({ data: bienPhotos as never });
  console.log(`BienPhoto: ${bienPhotos.length}`);

  const locataires = toDates(rows('Locataire'), ['dateNaissance', 'createdAt']);
  if (locataires.length) await prisma.locataire.createMany({ data: locataires as never });
  console.log(`Locataire: ${locataires.length}`);

  const docLocataires = toDates(rows('DocumentLocataire'), ['uploadedAt']);
  if (docLocataires.length) await prisma.documentLocataire.createMany({ data: docLocataires as never });
  console.log(`DocumentLocataire: ${docLocataires.length}`);

  const locations = toDates(rows('Location'), [
    'dateDebut',
    'dateFin',
    'depotGarantieDateReglement',
    'depotGarantieDateRemboursement',
    'dateProchaineRevision',
    'createdAt',
  ]);
  if (locations.length) await prisma.location.createMany({ data: locations as never });
  console.log(`Location: ${locations.length}`);

  const locationLocataires = rows('LocationLocataire');
  if (locationLocataires.length) await prisma.locationLocataire.createMany({ data: locationLocataires as never });
  console.log(`LocationLocataire: ${locationLocataires.length}`);

  const documentsGeneres = toDates(rows('DocumentGenere'), ['genereLe']);
  if (documentsGeneres.length) await prisma.documentGenere.createMany({ data: documentsGeneres as never });
  console.log(`DocumentGenere: ${documentsGeneres.length}`);

  const emailLogs = toDates(rows('EmailLog'), ['envoyeLe', 'openedAt']);
  if (emailLogs.length) await prisma.emailLog.createMany({ data: emailLogs as never });
  console.log(`EmailLog: ${emailLogs.length}`);

  const etatsDesLieux = toDates(rows('EtatDesLieux'), ['date']);
  if (etatsDesLieux.length) await prisma.etatDesLieux.createMany({ data: etatsDesLieux as never });
  console.log(`EtatDesLieux: ${etatsDesLieux.length}`);

  const edlPhotos = rows('EDLPhoto');
  if (edlPhotos.length) await prisma.eDLPhoto.createMany({ data: edlPhotos as never });
  console.log(`EDLPhoto: ${edlPhotos.length}`);

  const edlPieces = rows('EDLPiece');
  if (edlPieces.length) await prisma.eDLPiece.createMany({ data: edlPieces as never });
  console.log(`EDLPiece: ${edlPieces.length}`);

  const edlItems = rows('EDLItem');
  if (edlItems.length) await prisma.eDLItem.createMany({ data: edlItems as never });
  console.log(`EDLItem: ${edlItems.length}`);

  const comptes = rows('CompteBancaire');
  if (comptes.length) await prisma.compteBancaire.createMany({ data: comptes as never });
  console.log(`CompteBancaire: ${comptes.length}`);

  const imports = toDates(rows('RelevBancaireImport'), ['importedAt']);
  if (imports.length) await prisma.relevBancaireImport.createMany({ data: imports as never });
  console.log(`RelevBancaireImport: ${imports.length}`);

  const postes = rows('Poste');
  if (postes.length) await prisma.poste.createMany({ data: postes as never });
  console.log(`Poste: ${postes.length}`);

  const transactions = toDates(rows('Transaction'), ['date', 'createdAt']);
  if (transactions.length) await prisma.transaction.createMany({ data: transactions as never });
  console.log(`Transaction: ${transactions.length}`);

  console.log('Migration SQLite -> PostgreSQL terminée.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });

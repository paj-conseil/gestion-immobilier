/**
 * Import des anciens locataires (inactifs) reconstitués à partir de
 * l'historique bancaire, pour garder la traçabilité par bien.
 * Reconstruction faite à partir des libellés bancaires — niveau de confiance
 * variable, en particulier pour le Foyer Sainte-Marie (résidence à chambres
 * multiples avec beaucoup de rotation). À vérifier/corriger dans l'app.
 *
 * Usage : npx tsx scripts/import-historical-tenants.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Historique = { nom: string; prenom: string; loyerHC: number; dateDebut: Date; dateFin: Date };

async function addHistorique(bienId: string, entries: Historique[]) {
  for (const e of entries) {
    const existing = await prisma.locataire.findFirst({
      where: { nom: e.nom, prenom: e.prenom, locations: { some: { location: { bienId } } } },
    });
    if (existing) {
      console.log(`  (déjà présent) ${e.prenom} ${e.nom}`);
      continue;
    }
    const locataire = await prisma.locataire.create({
      data: {
        scopeId: (await prisma.bien.findUniqueOrThrow({ where: { id: bienId } })).scopeId,
        nom: e.nom,
        prenom: e.prenom,
        statut: 'INACTIF',
        documents: {
          create: [
            { type: 'CNI', statut: 'MANQUANT' },
            { type: 'AVIS_IMPOSITION', statut: 'MANQUANT' },
            { type: 'CONTRAT_TRAVAIL', statut: 'MANQUANT' },
          ],
        },
      },
    });
    await prisma.location.create({
      data: {
        bienId,
        loyerHC: e.loyerHC,
        charges: 0,
        dateDebut: e.dateDebut,
        dateFin: e.dateFin,
        statut: 'INACTIF',
        locataires: { create: [{ locataireId: locataire.id }] },
      },
    });
    console.log(`  + ${e.prenom} ${e.nom} (${e.loyerHC}€, ${e.dateDebut.toISOString().slice(0, 10)} → ${e.dateFin.toISOString().slice(0, 10)})`);
  }
}

async function main() {
  const scope = await prisma.scope.findFirst({ where: { nom: 'Anne & Pierre' } });
  if (!scope) throw new Error('Périmètre "Anne & Pierre" introuvable.');

  const biens = await prisma.bien.findMany({ where: { scopeId: scope.id } });
  const findBien = (adresse: string, complement: string) => {
    const b = biens.find((x) => x.adresse === adresse && x.complement === complement);
    if (!b) throw new Error(`Bien introuvable : ${adresse} ${complement}`);
    return b;
  };

  const cailloux4 = findBien('11 rue des Cailloux', 'Appt 4ème');
  const chanceMilly = findBien('22 rue Chance Milly', 'Studio');
  const foyer = findBien('94 rue Michelet', 'Foyer Sainte-Marie');

  // Correction : "Thery" (Foyer, locataire actif déjà importé) — le prénom réel
  // apparaît dans l'historique ("CAUTION ... BLANCHE THER", "LOYER BLANCHE THERY").
  const thery = await prisma.locataire.findFirst({ where: { scopeId: scope.id, nom: 'Thery' } });
  if (thery && thery.prenom === '—') {
    await prisma.locataire.update({ where: { id: thery.id }, data: { prenom: 'Blanche' } });
    console.log('Correction : "— Thery" → "Blanche Thery"');
  }

  console.log('\n--- 11 rue des Cailloux — Appt 4ème ---');
  await addHistorique(cailloux4.id, [
    { nom: 'Zion Bleka', prenom: 'Axel', loyerHC: 890, dateDebut: new Date(2017, 6, 6), dateFin: new Date(2018, 1, 5) },
    { nom: 'Nabholtz', prenom: 'Justine', loyerHC: 950, dateDebut: new Date(2018, 3, 2), dateFin: new Date(2020, 11, 1) },
    { nom: 'Pauget', prenom: 'Laura', loyerHC: 960, dateDebut: new Date(2020, 11, 20), dateFin: new Date(2022, 1, 28) },
    { nom: 'Bondini', prenom: 'Marchal', loyerHC: 975, dateDebut: new Date(2022, 2, 1), dateFin: new Date(2025, 3, 29) },
  ]);

  console.log('\n--- 22 rue Chance Milly — Studio ---');
  await addHistorique(chanceMilly.id, [
    { nom: 'Bruno', prenom: 'Lucie', loyerHC: 780, dateDebut: new Date(2018, 1, 15), dateFin: new Date(2019, 0, 1) },
    { nom: 'Drumel', prenom: 'Manon', loyerHC: 780, dateDebut: new Date(2019, 2, 11), dateFin: new Date(2021, 10, 28) },
    { nom: 'Vandrome', prenom: 'Camille', loyerHC: 795, dateDebut: new Date(2022, 0, 4), dateFin: new Date(2022, 7, 9) },
    { nom: 'Hilaire', prenom: 'Mélanie', loyerHC: 795, dateDebut: new Date(2022, 7, 24), dateFin: new Date(2024, 8, 11) },
  ]);

  console.log('\n--- 94 rue Michelet — Foyer Sainte-Marie (reconstruction moins certaine) ---');
  await addHistorique(foyer.id, [
    { nom: 'Lacassagne', prenom: 'Denis', loyerHC: 435, dateDebut: new Date(2022, 9, 10), dateFin: new Date(2023, 4, 31) },
    { nom: 'Mares', prenom: 'Etienne', loyerHC: 435, dateDebut: new Date(2022, 10, 9), dateFin: new Date(2023, 5, 3) },
    { nom: 'Pinon', prenom: 'Bénédicte', loyerHC: 435, dateDebut: new Date(2022, 9, 26), dateFin: new Date(2024, 2, 4) },
    { nom: 'Blaise', prenom: 'Margaux', loyerHC: 435, dateDebut: new Date(2023, 8, 4), dateFin: new Date(2024, 5, 4) },
    { nom: 'Bertrand', prenom: 'Jean', loyerHC: 435, dateDebut: new Date(2023, 8, 4), dateFin: new Date(2024, 5, 2) },
    { nom: 'Combeuil', prenom: 'Philomène', loyerHC: 435, dateDebut: new Date(2023, 8, 5), dateFin: new Date(2024, 5, 2) },
    { nom: 'Porte', prenom: 'Daphné', loyerHC: 455, dateDebut: new Date(2024, 7, 11), dateFin: new Date(2025, 5, 3) },
  ]);

  console.log('\nImport historique terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

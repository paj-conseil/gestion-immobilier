/**
 * Reconstruction complète de l'onglet Locataires à partir de la véritable
 * source de vérité trouvée dans le classeur Excel : l'onglet "Locataire data"
 * (nom, prénom, email, tél, loyer HC, charges, dates, statut actif/inactif).
 * Remplace entièrement la reconstruction précédente (faite par déduction
 * depuis l'historique bancaire, moins fiable).
 *
 * Usage : npx tsx scripts/rebuild-locataires.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function excelDate(serialOrText: number | string): Date {
  if (typeof serialOrText === 'number') {
    return new Date(Date.UTC(1899, 11, 30) + serialOrText * 86400000);
  }
  const m = serialOrText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error('Date invalide : ' + serialOrText);
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

type Entree = {
  bien: 'cailloux4' | 'cailloux5' | 'chanceMilly' | 'foyer';
  personnes: { nom: string; prenom: string; email?: string; telephone?: string }[];
  loyerHC: number;
  charges: number;
  dateDebut: number | string;
  dateFin?: number | string;
  actif: boolean;
};

const DONNEES: Entree[] = [
  // --- 11 rue des Cailloux - 4ème ---
  { bien: 'cailloux4', personnes: [{ nom: 'Zion', prenom: 'Axel', email: 'zion.axel@gmail.com' }], loyerHC: 890, charges: 60, dateDebut: 42846, dateFin: 43169, actif: false },
  { bien: 'cailloux4', personnes: [
      { nom: 'Nabholtz', prenom: 'Justine', email: 'justine.nabholtz@gmail.com', telephone: '06.59.98.24.81' },
      { nom: 'Charles', prenom: 'Thibault', email: 'tibcharles@hotmail.fr' },
    ], loyerHC: 890, charges: 60, dateDebut: 43169, dateFin: '21/12/2020', actif: false },
  { bien: 'cailloux4', personnes: [{ nom: 'Pauget', prenom: 'Laura', email: 'laura.pauget@hotmail.fr', telephone: '06.42.06.21.25' }], loyerHC: 890, charges: 70, dateDebut: 44186, dateFin: '20/03/2022', actif: false },
  { bien: 'cailloux4', personnes: [
      { nom: 'Bondini', prenom: 'Guillaume', email: 'guillaume.bondini@gmail.com', telephone: '06.69.01.40.07' },
      { nom: 'Marchal', prenom: 'Manon' },
    ], loyerHC: 900, charges: 75, dateDebut: 44640, dateFin: '18/05/2025', actif: false },
  { bien: 'cailloux4', personnes: [{ nom: 'Ratelade', prenom: 'Camille', email: 'c.ratelade@orange.fr', telephone: '06.51.45.76.32' }], loyerHC: 915, charges: 75, dateDebut: 45795, dateFin: '19/09/2026', actif: false },
  { bien: 'cailloux4', personnes: [{ nom: 'Mazard', prenom: 'Alexi', email: 'alexi.mazard@gmail.com', telephone: '06.52.48.53.80' }], loyerHC: 930, charges: 75, dateDebut: 46284, actif: true },

  // --- 11 rue des Cailloux - 5ème ---
  { bien: 'cailloux5', personnes: [{ nom: 'Fiori', prenom: 'Francesco', email: 'francescofiori91an@gmail.com', telephone: '393470654424' }], loyerHC: 880, charges: 75, dateDebut: 44772, actif: true },

  // --- 22 rue Chance Milly ---
  { bien: 'chanceMilly', personnes: [{ nom: 'Drumel', prenom: 'Marion', email: 'drumelm@gmail.com', telephone: '06.76.89.16.04' }], loyerHC: 730, charges: 50, dateDebut: 43556, dateFin: '18/12/2021', actif: false },
  { bien: 'chanceMilly', personnes: [{ nom: 'Bruno', prenom: 'Lucie', email: 'lucie.bruno@gmail.com', telephone: '06.78.52.05.20' }], loyerHC: 730, charges: 50, dateDebut: 43143, dateFin: 43448, actif: false },
  { bien: 'chanceMilly', personnes: [{ nom: 'Garrault', prenom: 'Salomé', email: 'garrault.salome@gmail.com', telephone: '06.78.52.05.20' }], loyerHC: 730, charges: 50, dateDebut: 43449, dateFin: 43555, actif: false },
  { bien: 'chanceMilly', personnes: [{ nom: 'Vandrome', prenom: 'Camille', email: 'camille.vandrome@gmail.com', telephone: '06.22.43.20.24' }], loyerHC: 730, charges: 65, dateDebut: 44548, dateFin: '25/08/2022', actif: false },
  { bien: 'chanceMilly', personnes: [{ nom: 'Hilaire', prenom: 'Mélanie', email: 'm.hilaire@tbs-education.org', telephone: '06.06.66.11.27' }], loyerHC: 730, charges: 65, dateDebut: 44798, dateFin: '26/09/2024', actif: false },
  { bien: 'chanceMilly', personnes: [{ nom: 'Gosselin', prenom: 'Camille', email: 'camille50120@hotmail.fr', telephone: '06.64.75.71.68' }], loyerHC: 760, charges: 65, dateDebut: 45561, dateFin: 45904, actif: false },
  { bien: 'chanceMilly', personnes: [{ nom: 'Debec', prenom: 'Fanny', email: 'fanny.debec@gmail.com', telephone: '06.58.51.40.88' }], loyerHC: 770, charges: 65, dateDebut: 45904, actif: true },

  // --- 94 rue Michelet - Foyer Sainte-Marie ---
  { bien: 'foyer', personnes: [{ nom: 'Mares', prenom: 'Capucine' }], loyerHC: 355, charges: 80, dateDebut: 44872, dateFin: 45107, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Tirant de Bury', prenom: 'Charlotte' }], loyerHC: 355, charges: 80, dateDebut: 44872, dateFin: 45107, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Lacassagne', prenom: 'Blandine' }], loyerHC: 355, charges: 80, dateDebut: 44872, dateFin: 45107, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Pinon', prenom: 'Bénédicte' }], loyerHC: 355, charges: 80, dateDebut: 44872, dateFin: 45107, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Grauvogel', prenom: 'Clémence' }], loyerHC: 355, charges: 80, dateDebut: 44872, dateFin: 45107, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Chombart', prenom: 'Alix' }], loyerHC: 355, charges: 80, dateDebut: 45170, dateFin: 45473, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Bertrand', prenom: 'Capucine' }], loyerHC: 355, charges: 80, dateDebut: 45170, dateFin: 45473, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Combeuil', prenom: 'Philomène' }], loyerHC: 355, charges: 80, dateDebut: 45170, dateFin: 45473, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Pinon', prenom: 'Bénédicte' }], loyerHC: 355, charges: 80, dateDebut: 45170, dateFin: 45473, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Blaise', prenom: 'Margaux' }], loyerHC: 355, charges: 80, dateDebut: 45170, dateFin: 45473, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Chombart', prenom: 'Alix' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Thery', prenom: 'Blanche' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Porte', prenom: 'Daphné' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Tierny', prenom: 'Ombeline' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Delafon', prenom: 'Sophie' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Paturle', prenom: 'Athanaïs' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Saison', prenom: 'Augustine' }], loyerHC: 355, charges: 80, dateDebut: 45536, dateFin: 45838, actif: false },
  { bien: 'foyer', personnes: [{ nom: 'Pasquier', prenom: 'Anne-Lys', email: 'annelyspasquier@gmail.com' }], loyerHC: 375, charges: 80, dateDebut: 46266, actif: true },
];

async function main() {
  const scope = await prisma.scope.findFirst({ where: { nom: 'Anne & Pierre' } });
  if (!scope) throw new Error('Périmètre introuvable.');

  const biens = await prisma.bien.findMany({ where: { scopeId: scope.id } });
  const bienId = {
    cailloux4: biens.find((b) => b.adresse === '11 rue des Cailloux' && b.complement === 'Appt 4ème')!.id,
    cailloux5: biens.find((b) => b.adresse === '11 rue des Cailloux' && b.complement === 'Appt 5ème')!.id,
    chanceMilly: biens.find((b) => b.adresse === '22 rue Chance Milly' && b.complement === 'Studio')!.id,
    foyer: biens.find((b) => b.adresse === '94 rue Michelet' && b.complement === 'Foyer Sainte-Marie')!.id,
  };

  // Purge complète des locataires existants sur ces 4 biens (reconstruction propre)
  for (const id of Object.values(bienId)) {
    const locations = await prisma.location.findMany({ where: { bienId: id }, include: { locataires: true } });
    const locataireIds = [...new Set(locations.flatMap((l) => l.locataires.map((x) => x.locataireId)))];
    for (const lid of locataireIds) {
      await prisma.documentGenere.deleteMany({ where: { locataireId: lid } });
      await prisma.eDLItem.deleteMany({ where: { piece: { edl: { locataireId: lid } } } });
      await prisma.eDLPiece.deleteMany({ where: { edl: { locataireId: lid } } });
      await prisma.eDLPhoto.deleteMany({ where: { edl: { locataireId: lid } } });
      await prisma.etatDesLieux.deleteMany({ where: { locataireId: lid } });
      await prisma.documentLocataire.deleteMany({ where: { locataireId: lid } });
    }
    await prisma.location.deleteMany({ where: { bienId: id } });
    for (const lid of locataireIds) {
      await prisma.locataire.delete({ where: { id: lid } }).catch(() => undefined);
    }
  }
  console.log('Anciens locataires purgés.');

  // Cache pour réutiliser la même fiche Locataire entre deux baux successifs (ex: Bénédicte Pinon, Alix Chombart)
  const locataireCache = new Map<string, string>();

  for (const e of DONNEES) {
    const locataireIds: string[] = [];
    for (const p of e.personnes) {
      const key = `${p.nom}|${p.prenom}`;
      let id = locataireCache.get(key);
      if (!id) {
        const locataire = await prisma.locataire.create({
          data: {
            scopeId: scope.id,
            nom: p.nom,
            prenom: p.prenom,
            email: p.email,
            telephone: p.telephone,
            statut: e.actif ? 'ACTIF' : 'INACTIF',
            documents: {
              create: [
                { type: 'CNI', statut: 'MANQUANT' },
                { type: 'AVIS_IMPOSITION', statut: 'MANQUANT' },
                { type: 'CONTRAT_TRAVAIL', statut: 'MANQUANT' },
              ],
            },
          },
        });
        id = locataire.id;
        locataireCache.set(key, id);
      } else if (e.actif) {
        // Le dernier bail actif détermine le statut du locataire (utile pour les renouvellements)
        await prisma.locataire.update({ where: { id }, data: { statut: 'ACTIF' } });
      }
      locataireIds.push(id);
    }

    await prisma.location.create({
      data: {
        bienId: bienId[e.bien],
        loyerHC: e.loyerHC,
        charges: e.charges,
        dateDebut: excelDate(e.dateDebut),
        dateFin: e.dateFin !== undefined ? excelDate(e.dateFin) : null,
        statut: e.actif ? 'ACTIF' : 'INACTIF',
        locataires: { create: locataireIds.map((locataireId) => ({ locataireId })) },
      },
    });
  }

  console.log(`Import terminé : ${DONNEES.length} baux, ${locataireCache.size} locataires uniques.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Import ponctuel des vraies données extraites de "Gestion locative v13.xlsm" :
 * - remplace les 4 locataires fictifs (issus de la maquette) par les vrais
 *   locataires actuels retrouvés dans l'historique bancaire par bien ;
 * - importe l'historique complet des transactions (2017-2025) par bien.
 *
 * Usage : npx tsx scripts/import-real-data.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { deviner } from '../src/lib/postes-defaults';

const prisma = new PrismaClient();
const EXTRACT_DIR = path.join(__dirname, 'extracted');

type Row = Record<string, string>;

function parseFile(fileName: string): Row[] {
  const content = fs.readFileSync(path.join(EXTRACT_DIR, fileName), 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const rows: Row[] = [];
  for (const line of lines) {
    const m = line.match(/^R\d+:\s*(.+)$/);
    if (!m) continue;
    const cells: Row = {};
    for (const part of m[1].split(' | ')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const col = part.slice(0, eq).replace(/\d+$/, '');
      const val = part.slice(eq + 1);
      cells[col] = val;
    }
    rows.push(cells);
  }
  return rows.slice(1); // skip header row
}

function parseMontant(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function parseDateFr(raw: string): Date | null {
  const cleaned = raw.replace(/^'/, '').trim();
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

const VIREMENT_INTERNE_PATTERNS = [
  /virt cpte a cpte/i,
  /vir cpte a cpte/i,
  /virement interne/i,
  /eurocompte serenite/i,
  /vir compte courant/i,
  /vir mensualite vanxains/i,
  /virement solde de votre cpte/i,
  /vir de 94 rue michelet/i,
  /vir sepa avance tresorerie/i,
];

const POINTAGE_TO_POSTE: Record<string, string> = {
  Loyers: 'Loyer',
  Mensualités: 'Emprunt',
  'Charges copropriété': 'Charges de copropriété',
  'Frais bancaires': 'Frais bancaires',
  'Taxe foncière': 'Taxe foncière',
  'Assurance logement': 'Assurance PNO',
  'Assurance prêt': 'Assurance emprunteur',
  'Encaissement caution': 'Dépôt de garantie',
  'Remboursement caution': 'Dépôt de garantie',
  Locations: 'Locations courte durée',
  Travaux: 'Travaux / entretien',
};

async function importTransactionsForBien(opts: {
  fileName: string;
  bienId: string;
  compteId: string;
  postesByNom: Map<string, string>;
  postesForDeviner: { id: string; motsCles: string | null }[];
}) {
  const rows = parseFile(opts.fileName);

  // Repart : purge les transactions IMPORT précédentes pour ce bien (ré-import idempotent)
  await prisma.transaction.deleteMany({ where: { bienId: opts.bienId, source: 'IMPORT' } });

  const importRecord = await prisma.relevBancaireImport.create({
    data: { compteId: opts.compteId, fileName: `Historique ${opts.fileName} (import initial)`, nbLignes: 0 },
  });

  let imported = 0;
  let ignored = 0;
  const data: {
    compteId: string;
    bienId: string;
    posteId: string | null;
    importId: string;
    date: Date;
    libelle: string;
    montant: number;
    source: 'IMPORT';
  }[] = [];

  for (const row of rows) {
    const dateRaw = row['A'];
    const libelle = row['B'];
    const montantRaw = row['D'];
    const pointage = row['J'] || row['I'];

    if (!dateRaw || !libelle || !montantRaw) {
      ignored++;
      continue;
    }
    const date = parseDateFr(dateRaw);
    const montant = parseMontant(montantRaw);
    if (!date || montant === null) {
      ignored++;
      continue;
    }

    let posteId: string | null = null;
    if (VIREMENT_INTERNE_PATTERNS.some((re) => re.test(libelle))) {
      posteId = opts.postesByNom.get('Virement interne') ?? null;
    } else if (pointage && POINTAGE_TO_POSTE[pointage]) {
      posteId = opts.postesByNom.get(POINTAGE_TO_POSTE[pointage]) ?? null;
    } else {
      posteId = deviner(libelle, opts.postesForDeviner) ?? null;
    }

    data.push({
      compteId: opts.compteId,
      bienId: opts.bienId,
      posteId,
      importId: importRecord.id,
      date,
      libelle: libelle.replace(/\n/g, ' ').trim(),
      montant,
      source: 'IMPORT',
    });
    imported++;
  }

  for (let i = 0; i < data.length; i += 50) {
    await prisma.transaction.createMany({ data: data.slice(i, i + 50) });
  }
  await prisma.relevBancaireImport.update({ where: { id: importRecord.id }, data: { nbLignes: imported } });

  console.log(`  ${opts.fileName} : ${imported} transactions importées, ${ignored} lignes ignorées`);
}

async function purgeLocatairesActifsDuBien(bienId: string) {
  const locations = await prisma.location.findMany({
    where: { bienId, statut: 'ACTIF' },
    include: { locataires: true },
  });
  const locataireIds = [...new Set(locations.flatMap((l) => l.locataires.map((x) => x.locataireId)))];
  for (const id of locataireIds) {
    const docsGeneres = await prisma.documentGenere.findMany({ where: { locataireId: id } });
    for (const dg of docsGeneres) {
      await prisma.emailLog.deleteMany({ where: { documentGenereId: dg.id } });
    }
    await prisma.documentGenere.deleteMany({ where: { locataireId: id } });
    await prisma.eDLItem.deleteMany({ where: { piece: { edl: { locataireId: id } } } });
    await prisma.eDLPiece.deleteMany({ where: { edl: { locataireId: id } } });
    await prisma.eDLPhoto.deleteMany({ where: { edl: { locataireId: id } } });
    await prisma.etatDesLieux.deleteMany({ where: { locataireId: id } });
    await prisma.documentLocataire.deleteMany({ where: { locataireId: id } });
  }
  await prisma.location.deleteMany({ where: { bienId, statut: 'ACTIF' } });
  for (const id of locataireIds) {
    await prisma.locataire.delete({ where: { id } }).catch(() => undefined);
  }
}

async function replaceLocataire(
  scopeId: string,
  bienId: string,
  nouveau: { nom: string; prenom: string; loyerHC: number; charges: number; dateDebut: Date },
) {
  // Purge tout locataire actuellement rattaché à un bail actif de ce bien
  // (rend le script idempotent, sans dépendre des anciens noms fictifs).
  await purgeLocatairesActifsDuBien(bienId);

  const locataire = await prisma.locataire.create({
    data: {
      scopeId,
      nom: nouveau.nom,
      prenom: nouveau.prenom,
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
      loyerHC: nouveau.loyerHC,
      charges: nouveau.charges,
      dateDebut: nouveau.dateDebut,
      locataires: { create: [{ locataireId: locataire.id }] },
    },
  });
  return locataire;
}

async function main() {
  const scope = await prisma.scope.findFirst({ where: { nom: 'Anne & Pierre' } });
  if (!scope) throw new Error('Périmètre "Anne & Pierre" introuvable — lancez d\'abord `npm run seed`.');

  const biens = await prisma.bien.findMany({ where: { scopeId: scope.id } });
  const findBien = (adresse: string, complement: string) =>
    biens.find((b) => b.adresse === adresse && b.complement === complement);

  const cailloux4 = findBien('11 rue des Cailloux', 'Appt 4ème');
  const cailloux5 = findBien('11 rue des Cailloux', 'Appt 5ème');
  const chanceMilly = findBien('22 rue Chance Milly', 'Studio');
  const foyer = findBien('94 rue Michelet', 'Foyer Sainte-Marie');
  if (!cailloux4 || !cailloux5 || !chanceMilly || !foyer) {
    throw new Error('Un des 4 biens loués est introuvable — vérifiez le seed initial.');
  }

  const comptes = await prisma.compteBancaire.findMany({ where: { scopeId: scope.id } });
  const compteBnp = comptes.find((c) => c.banque === 'BNP Paribas');
  const compteCm = comptes.find((c) => c.banque === 'Crédit Mutuel');
  if (!compteBnp || !compteCm) throw new Error('Comptes bancaires BNP/Crédit Mutuel introuvables.');

  console.log('--- 1. Remplacement des locataires fictifs par les vrais locataires ---');

  await replaceLocataire(scope.id, cailloux4.id, {
    nom: 'Ratelade',
    prenom: 'Camille',
    loyerHC: 990,
    charges: 0,
    dateDebut: new Date(2025, 4, 16),
  });
  console.log('  11 rue des Cailloux — Appt 4ème : Camille Ratelade (990 €/mois, depuis le 16/05/2025)');

  await replaceLocataire(scope.id, cailloux5.id, {
    nom: 'Fiori',
    prenom: 'Francesco',
    loyerHC: 955,
    charges: 0,
    dateDebut: new Date(2025, 5, 3),
  });
  console.log('  11 rue des Cailloux — Appt 5ème : Francesco Fiori (955 €/mois, depuis le 03/06/2025 constaté)');

  await replaceLocataire(scope.id, chanceMilly.id, {
    nom: 'Gosselin',
    prenom: 'Camille',
    loyerHC: 825,
    charges: 0,
    dateDebut: new Date(2025, 5, 2),
  });
  console.log('  22 rue Chance Milly — Studio : Camille Gosselin (825 €/mois, depuis le 02/06/2025 constaté)');

  // Foyer Sainte-Marie : plusieurs chambres/locataires simultanés (résidence, pas un logement unique)
  await purgeLocatairesActifsDuBien(foyer.id);

  const chambresFoyer: { prenom: string; nom: string; loyerHC: number; dateDebut: Date }[] = [
    { prenom: 'Athanaïs', nom: 'Paturle', loyerHC: 455, dateDebut: new Date(2025, 6, 21) },
    { prenom: 'Eric', nom: 'Delafon', loyerHC: 455, dateDebut: new Date(2025, 0, 1) },
    { prenom: '', nom: 'Thery', loyerHC: 455, dateDebut: new Date(2025, 0, 1) },
    { prenom: 'Fanny', nom: 'Debec', loyerHC: 723, dateDebut: new Date(2025, 8, 5) },
    { prenom: 'Patrick', nom: 'Chombar', loyerHC: 455, dateDebut: new Date(2025, 0, 1) },
    { prenom: '', nom: 'Saison Brun', loyerHC: 455, dateDebut: new Date(2025, 7, 29) },
  ];
  for (const ch of chambresFoyer) {
    const locataire = await prisma.locataire.create({
      data: {
        scopeId: scope.id,
        nom: ch.nom,
        prenom: ch.prenom || '—',
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
        bienId: foyer.id,
        loyerHC: ch.loyerHC,
        charges: 0,
        dateDebut: ch.dateDebut,
        locataires: { create: [{ locataireId: locataire.id }] },
      },
    });
  }
  console.log(`  94 rue Michelet — Foyer Sainte-Marie : ${chambresFoyer.length} chambres/locataires importés`);

  console.log('\n--- 2. Import de l\'historique complet des transactions bancaires ---');

  const postes = await prisma.poste.findMany({ where: { scopeId: scope.id } });
  const postesByNom = new Map(postes.map((p) => [p.nom, p.id]));
  const postesForDeviner = postes.map((p) => ({ id: p.id, motsCles: p.motsCles }));

  await importTransactionsForBien({
    fileName: 'cailloux4.txt',
    bienId: cailloux4.id,
    compteId: compteBnp.id,
    postesByNom,
    postesForDeviner,
  });
  await importTransactionsForBien({
    fileName: 'cailloux5.txt',
    bienId: cailloux5.id,
    compteId: compteCm.id,
    postesByNom,
    postesForDeviner,
  });
  await importTransactionsForBien({
    fileName: 'chancemilly.txt',
    bienId: chanceMilly.id,
    compteId: compteBnp.id,
    postesByNom,
    postesForDeviner,
  });
  await importTransactionsForBien({
    fileName: 'foyersaintemarie.txt',
    bienId: foyer.id,
    compteId: compteCm.id,
    postesByNom,
    postesForDeviner,
  });

  // Retire les 4 transactions d'exemple créées par le seed initial (remplacées par le véritable historique)
  await prisma.transaction.deleteMany({ where: { compteId: { in: [compteBnp.id, compteCm.id] }, source: 'MANUEL' } });

  console.log('\nImport terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Reconstruction des locataires du Foyer Sainte-Marie à partir du fichier
 * "docs contrats.xlsx" fourni par l'utilisateur — remplace entièrement les
 * données précédentes (issues de "Locataire data", moins précises/à jour
 * pour ce bien spécifique).
 *
 * Usage : npx tsx scripts/rebuild-foyer.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function excelDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

function parseCaution(v?: string): { montant?: number; date?: Date } {
  if (!v) return {};
  const m = v.match(/(\d+)\s*€\s*le\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (m) {
    return { montant: Number(m[1]), date: new Date(Date.UTC(Number(m[4]), Number(m[3]) - 1, Number(m[2]))) };
  }
  return {};
}

const OUI = (v?: string) => (v ?? '').trim().toLowerCase() === 'oui';

type Row = {
  entree: number;
  sortie?: number;
  nom: string;
  prenom: string;
  contrat?: string;
  cni?: string;
  assurance?: string;
  caution?: string;
  remboursement?: string;
  naissance?: number;
  lieuNaissance?: string;
  telephone?: string;
};

const ROWS: Row[] = [
  { entree: 44841, sortie: 45107, nom: 'Tirant de Bury', prenom: 'Charlotte', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38289, lieuNaissance: 'Reims' },
  { entree: 44841, sortie: 45107, nom: 'Grauvogel', prenom: 'Clémence', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38126, lieuNaissance: 'Pierre-Bénite (69)' },
  { entree: 44841, sortie: 45107, nom: 'Pinon', prenom: 'Bénédicte', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 37537, lieuNaissance: 'Châteauroux' },
  { entree: 44841, sortie: 45107, nom: 'Mares', prenom: 'Capucine', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38211, lieuNaissance: 'Bourges' },
  { entree: 44841, sortie: 45107, nom: 'Lacassagne', prenom: 'Blandine', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38045, lieuNaissance: 'Chatellerault' },
  { entree: 45170, sortie: 45473, nom: 'Pinon', prenom: 'Bénédicte', naissance: 37537, lieuNaissance: 'Châteauroux' },
  { entree: 45170, sortie: 45473, nom: 'Blaise', prenom: 'Margaux', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38578, lieuNaissance: 'Angers (49)' },
  { entree: 45170, sortie: 45473, nom: 'Chombart', prenom: 'Alix', contrat: 'Oui', assurance: 'Non', caution: 'Oui', naissance: 38113, lieuNaissance: 'Versailles' },
  { entree: 45170, sortie: 45473, nom: 'Combeuil', prenom: 'Philomène', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38791, lieuNaissance: 'Vendôme' },
  { entree: 45170, sortie: 45473, nom: 'Bertrand', prenom: 'Capucine', contrat: 'Oui', assurance: 'Oui', caution: 'Oui', naissance: 38562, lieuNaissance: 'Clamard (92)' },
  { entree: 45536, sortie: 45838, nom: 'Thery', prenom: 'Blanche', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', caution: '750€ le 28/09/2024', naissance: 38565, lieuNaissance: 'Le Mans', telephone: '06 52 90 88 62' },
  { entree: 45536, sortie: 45838, nom: 'Tierny', prenom: 'Ombeline', contrat: 'Oui', cni: 'Oui', assurance: 'En attente', caution: '710€ le 20/07/2024', naissance: 38767, lieuNaissance: 'Levallois Perret', telephone: '06 11 45 38 58' },
  { entree: 45536, sortie: 45838, nom: 'Porte', prenom: 'Daphné', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', caution: '750€ le 12/08/2024', naissance: 38605, lieuNaissance: 'Le Mans', telephone: '06 95 22 52 36' },
  { entree: 45536, sortie: 45838, nom: 'Delafon', prenom: 'Sophie', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', caution: '750€ le 03/07/2024', naissance: 39014, lieuNaissance: 'Albi (81)', telephone: '07 49 44 56 85' },
  { entree: 45536, sortie: 45838, nom: 'Chombart', prenom: 'Alix', contrat: 'En attente', cni: 'Oui', assurance: 'En attente', caution: '710€ le 04/09/2023', naissance: 38113, lieuNaissance: 'Versailles', telephone: '07 69 87 66 55' },
  { entree: 45901, sortie: 46203, nom: 'Thery', prenom: 'Blanche', caution: '750€ le 28/09/2024', naissance: 38565, lieuNaissance: 'Le Mans', telephone: '06 52 90 88 62' },
  { entree: 45901, sortie: 46203, nom: 'Paturle', prenom: 'Athanaïs', caution: '750€ le 22/07/2025', naissance: 37966, lieuNaissance: 'Paris (14)' },
  { entree: 45901, sortie: 46203, nom: 'Saison', prenom: 'Augustine', caution: '750€ le 29/08/2025' },
  { entree: 45901, sortie: 46203, nom: 'Delafon', prenom: 'Sophie', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', caution: '750€ le 03/07/2024', naissance: 39014, lieuNaissance: 'Albi (81)', telephone: '07 49 44 56 85' },
  { entree: 45901, sortie: 46203, nom: 'Chombart', prenom: 'Alix', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', caution: '710€ le 04/09/2023', naissance: 38113, lieuNaissance: 'Versailles', telephone: '07 69 87 66 55' },
  // Période actuelle (depuis le 01/09/2026)
  { entree: 46266, nom: 'Chevillard', prenom: 'Elise', contrat: 'Oui', cni: 'Oui', assurance: 'Non', naissance: 39284, lieuNaissance: 'Angers (49)', telephone: '07 86 80 81 35' },
  { entree: 46266, nom: 'Pasquier', prenom: 'Anne-Lys', contrat: 'Oui', cni: 'Oui', assurance: 'Non', naissance: 39387, lieuNaissance: 'Dublin', telephone: '07 81 13 87 18' },
  { entree: 46266, nom: 'Saison', prenom: 'Augustine', contrat: 'Oui', cni: 'Oui', assurance: 'Non', naissance: 39528, lieuNaissance: 'St Cloud (92)' },
  { entree: 46266, nom: 'Delafon', prenom: 'Sophie', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', naissance: 39014, lieuNaissance: 'Albi (81)', telephone: '07 49 44 56 85' },
  { entree: 46266, nom: 'Chombart', prenom: 'Alix', contrat: 'Oui', cni: 'Oui', assurance: 'Oui', naissance: 38113, lieuNaissance: 'Versailles', telephone: '07 69 87 66 55' },
];

async function main() {
  const scope = await prisma.scope.findFirst({ where: { nom: 'Anne & Pierre' } });
  if (!scope) throw new Error('Périmètre introuvable.');
  const foyer = await prisma.bien.findFirst({ where: { adresse: '94 rue Michelet', complement: 'Foyer Sainte-Marie' } });
  if (!foyer) throw new Error('Foyer introuvable.');

  // Purge complète des locataires existants sur ce bien
  const anciennes = await prisma.location.findMany({ where: { bienId: foyer.id }, include: { locataires: true } });
  const anciensIds = [...new Set(anciennes.flatMap((l) => l.locataires.map((x) => x.locataireId)))];
  for (const lid of anciensIds) {
    await prisma.documentGenere.deleteMany({ where: { locataireId: lid } });
    await prisma.eDLItem.deleteMany({ where: { piece: { edl: { locataireId: lid } } } });
    await prisma.eDLPiece.deleteMany({ where: { edl: { locataireId: lid } } });
    await prisma.eDLPhoto.deleteMany({ where: { edl: { locataireId: lid } } });
    await prisma.etatDesLieux.deleteMany({ where: { locataireId: lid } });
    await prisma.documentLocataire.deleteMany({ where: { locataireId: lid } });
  }
  await prisma.location.deleteMany({ where: { bienId: foyer.id } });
  for (const lid of anciensIds) {
    await prisma.locataire.delete({ where: { id: lid } }).catch(() => undefined);
  }
  console.log(`Purgé : ${anciensIds.length} anciens locataires du Foyer.`);

  const cache = new Map<string, string>();
  const LOYER_HC = 355;
  const CHARGES = 80;

  for (const row of ROWS) {
    const key = `${row.nom}|${row.prenom}`;
    const actif = !row.sortie;
    let locataireId = cache.get(key);

    const caution = parseCaution(row.caution);
    const remboursement = parseCaution(row.remboursement);

    if (!locataireId) {
      const locataire = await prisma.locataire.create({
        data: {
          scopeId: scope.id,
          nom: row.nom,
          prenom: row.prenom,
          telephone: row.telephone,
          dateNaissance: row.naissance ? excelDate(row.naissance) : undefined,
          lieuNaissance: row.lieuNaissance,
          statut: actif ? 'ACTIF' : 'INACTIF',
          documents: {
            create: [
              { type: 'CONTRAT_SIGNE', statut: OUI(row.contrat) ? 'RECU' : 'MANQUANT' },
              { type: 'CNI', statut: OUI(row.cni) ? 'RECU' : 'MANQUANT' },
              { type: 'ATTESTATION_ASSURANCE', statut: OUI(row.assurance) ? 'RECU' : 'MANQUANT' },
            ],
          },
        },
      });
      locataireId = locataire.id;
      cache.set(key, locataireId);
    } else if (actif) {
      await prisma.locataire.update({ where: { id: locataireId }, data: { statut: 'ACTIF' } });
      // Met à jour le statut des documents avec les valeurs les plus récentes connues
      if (row.contrat) await prisma.documentLocataire.updateMany({ where: { locataireId, type: 'CONTRAT_SIGNE' }, data: { statut: OUI(row.contrat) ? 'RECU' : 'MANQUANT' } });
      if (row.cni) await prisma.documentLocataire.updateMany({ where: { locataireId, type: 'CNI' }, data: { statut: OUI(row.cni) ? 'RECU' : 'MANQUANT' } });
      if (row.assurance) await prisma.documentLocataire.updateMany({ where: { locataireId, type: 'ATTESTATION_ASSURANCE' }, data: { statut: OUI(row.assurance) ? 'RECU' : 'MANQUANT' } });
    }

    await prisma.location.create({
      data: {
        bienId: foyer.id,
        loyerHC: LOYER_HC,
        charges: CHARGES,
        dateDebut: excelDate(row.entree),
        dateFin: row.sortie ? excelDate(row.sortie) : null,
        statut: actif ? 'ACTIF' : 'INACTIF',
        depotGarantie: caution.montant,
        depotGarantieDateReglement: caution.date,
        depotGarantieRembourse: remboursement.montant,
        depotGarantieDateRemboursement: remboursement.date,
        locataires: { create: [{ locataireId }] },
      },
    });
  }

  console.log(`Import terminé : ${ROWS.length} baux, ${cache.size} locataires uniques.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

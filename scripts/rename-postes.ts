/**
 * Aligne le libellé des postes comptables sur celui utilisé dans l'onglet
 * "Comptabilite" du fichier Excel (Mensualités, Assurance prêt, Charges
 * copropriété, Assurance logement, Taxe foncière, Loyers, Locations, Autres...).
 *
 * Usage : npx tsx scripts/rename-postes.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RENAMES: Record<string, string> = {
  Loyer: 'Loyers',
  Emprunt: 'Mensualités',
  'Assurance emprunteur': 'Assurance prêt',
  'Assurance PNO': 'Assurance logement',
  'Charges de copropriété': 'Charges copropriété',
  'Locations courte durée': 'Locations',
  Autre: 'Autres',
  'Dépôt de garantie': 'Caution (encaissement / remboursement)',
};

async function main() {
  for (const [ancien, nouveau] of Object.entries(RENAMES)) {
    const res = await prisma.poste.updateMany({ where: { nom: ancien }, data: { nom: nouveau } });
    if (res.count > 0) console.log(`${ancien} -> ${nouveau} (${res.count})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

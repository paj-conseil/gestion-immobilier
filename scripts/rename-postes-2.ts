/**
 * Deuxième vague de renommage des postes comptables :
 * - "Charges locatives reçues" (revenu, quasi inutilisé) devient
 *   "Charges énergie (EDF, eau, internet...)" (charge), avec des mots-clés
 *   adaptés pour la catégorisation automatique future.
 * - Ajout d'un nouveau poste "Autres charges".
 * - Les 2 transactions Intermarché qui avaient été mal rangées sous
 *   "Charges locatives reçues" (courses, sans rapport avec le bien) sont
 *   repassées en non catégorisé.
 *
 * Usage : npx tsx scripts/rename-postes-2.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const scopes = await prisma.scope.findMany();

  for (const scope of scopes) {
    const ancien = await prisma.poste.findFirst({ where: { scopeId: scope.id, nom: 'Charges locatives reçues' } });
    if (ancien) {
      await prisma.poste.update({
        where: { id: ancien.id },
        data: {
          nom: 'Charges énergie (EDF, eau, internet...)',
          type: 'CHARGE',
          motsCles: 'edf,electricite,gaz,eau,veolia,suez,bouygues,orange,free,sfr,internet,energie',
        },
      });
      console.log(`[${scope.nom}] Charges locatives reçues -> Charges énergie (EDF, eau, internet...)`);

      const misClasses = await prisma.transaction.findMany({
        where: { posteId: ancien.id, libelle: { contains: 'INTERMARCHE' } },
      });
      for (const t of misClasses) {
        await prisma.transaction.update({ where: { id: t.id }, data: { posteId: null } });
        console.log(`  - transaction recatégorisée (retour non catégorisé) : ${t.libelle.slice(0, 60)}...`);
      }
    }

    const existeDeja = await prisma.poste.findFirst({ where: { scopeId: scope.id, nom: 'Autres charges' } });
    if (!existeDeja) {
      await prisma.poste.create({
        data: { scopeId: scope.id, nom: 'Autres charges', type: 'CHARGE', motsCles: '' },
      });
      console.log(`[${scope.nom}] Poste "Autres charges" créé.`);
    }
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

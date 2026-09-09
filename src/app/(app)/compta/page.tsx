import { subDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { bienLabel } from '@/lib/format';
import { ComptaView } from '@/components/ComptaView';

export default async function ComptaPage() {
  const ctx = await getCurrentContext();

  const [comptes, operations, postes, biens, locationsActives] = await Promise.all([
    prisma.compteBancaire.findMany({ where: { scopeId: ctx.scopeId }, orderBy: { banque: 'asc' } }),
    prisma.transaction.findMany({
      where: { compte: { scopeId: ctx.scopeId } },
      select: {
        id: true,
        date: true,
        libelle: true,
        montant: true,
        bienId: true,
        bien: { select: { adresse: true, complement: true } },
        posteId: true,
        poste: { select: { id: true, nom: true, type: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.poste.findMany({ where: { scopeId: ctx.scopeId }, orderBy: { nom: 'asc' } }),
    prisma.bien.findMany({ where: { scopeId: ctx.scopeId }, orderBy: { adresse: 'asc' } }),
    prisma.location.findMany({ where: { bien: { scopeId: ctx.scopeId }, statut: 'ACTIF' }, include: { bien: true } }),
  ]);

  // Recommandations simples basées sur des règles
  const recommandations: { titre: string; detail: string }[] = [];

  const nonCategorisees = operations.filter((t) => !t.posteId).length;
  if (nonCategorisees > 0) {
    recommandations.push({
      titre: `${nonCategorisees} transaction${nonCategorisees > 1 ? 's' : ''} non catégorisée${nonCategorisees > 1 ? 's' : ''}`,
      detail: 'Associez un poste à chaque transaction pour fiabiliser le suivi par bien.',
    });
  }

  const seuilRetard = subDays(new Date(), 45);
  for (const loc of locationsActives) {
    const dernierLoyer = operations.find(
      (t) => t.bienId === loc.bienId && t.montant > 0 && t.poste?.nom.toLowerCase().includes('loyer'),
    );
    if (!dernierLoyer || dernierLoyer.date < seuilRetard) {
      recommandations.push({
        titre: `Loyer non constaté récemment — ${bienLabel(loc.bien)}`,
        detail: "Aucune entrée de loyer identifiée sur les 45 derniers jours pour ce bien loué.",
      });
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Comptabilité</h1>
          <p>Relevés bancaires, suivi par poste et recommandations</p>
        </div>
      </div>

      <ComptaView
        comptes={JSON.parse(JSON.stringify(comptes))}
        operations={JSON.parse(JSON.stringify(operations))}
        postes={JSON.parse(JSON.stringify(postes))}
        biens={JSON.parse(JSON.stringify(biens))}
        recommandations={recommandations}
      />
    </>
  );
}

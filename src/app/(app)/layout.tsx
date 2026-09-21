import { addDays } from 'date-fns';
import { getCurrentContext } from '@/lib/scope';
import { prisma } from '@/lib/db';
import { Sidebar } from '@/components/Sidebar';
import { synchroniserStatutsExpires } from '@/lib/statuts-auto';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentContext();
  const horizon = addDays(new Date(), 60);

  // Baux dont la date de sortie est passée -> inactifs, ainsi que leurs locataires.
  await synchroniserStatutsExpires(ctx.scopeId);

  const [documentsManquants, echeancesProches] = await Promise.all([
    prisma.documentLocataire.count({
      where: { statut: 'MANQUANT', locataire: { scopeId: ctx.scopeId } },
    }),
    prisma.location.count({
      where: {
        bien: { scopeId: ctx.scopeId },
        statut: 'ACTIF',
        OR: [
          { dateFin: { lte: horizon, gte: new Date() } },
          { dateProchaineRevision: { lte: horizon, gte: new Date() } },
        ],
      },
    }),
  ]);

  return (
    <div className="app">
      <Sidebar
        userNom={ctx.userNom}
        scopeId={ctx.scopeId}
        scopeNom={ctx.scopeNom}
        memberships={ctx.memberships}
        badges={{ documents: documentsManquants, echeances: echeancesProches }}
      />
      <main className="main">{children}</main>
    </div>
  );
}

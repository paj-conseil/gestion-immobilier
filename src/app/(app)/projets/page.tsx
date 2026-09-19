import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { ProjetsListView } from '@/components/ProjetsListView';

export default async function ProjetsPage() {
  const ctx = await getCurrentContext();
  const projets = await prisma.projet.findMany({ where: { scopeId: ctx.scopeId }, orderBy: { createdAt: 'desc' } });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Projets</h1>
          <p>Simuler l&apos;achat et la gestion d&apos;un nouveau bien</p>
        </div>
      </div>
      <ProjetsListView projets={JSON.parse(JSON.stringify(projets))} />
    </>
  );
}

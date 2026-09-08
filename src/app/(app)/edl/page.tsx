import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { EdlListView } from '@/components/EdlListView';

export default async function EdlPage() {
  const ctx = await getCurrentContext();

  const [edls, biens] = await Promise.all([
    prisma.etatDesLieux.findMany({
      where: { bien: { scopeId: ctx.scopeId } },
      include: { bien: true, location: { include: { locataires: { include: { locataire: true } } } } },
      orderBy: { date: 'desc' },
    }),
    prisma.bien.findMany({ where: { scopeId: ctx.scopeId }, orderBy: { adresse: 'asc' } }),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>États des lieux</h1>
          <p>Entrée ou sortie, pièce par pièce, avec photos</p>
        </div>
      </div>
      <EdlListView edls={JSON.parse(JSON.stringify(edls))} biens={JSON.parse(JSON.stringify(biens))} />
    </>
  );
}

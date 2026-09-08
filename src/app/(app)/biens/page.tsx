import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { BienFormModal } from '@/components/BienFormModal';
import { BiensView } from '@/components/BiensView';

export default async function BiensPage() {
  const ctx = await getCurrentContext();

  const biens = await prisma.bien.findMany({
    where: { scopeId: ctx.scopeId },
    include: {
      photos: { orderBy: { ordre: 'asc' } },
      locations: {
        include: {
          locataires: {
            include: {
              locataire: {
                include: {
                  documents: true,
                  locations: { include: { location: { include: { bien: true } } } },
                },
              },
            },
          },
        },
        orderBy: { dateDebut: 'desc' },
      },
      etatsDesLieux: {
        include: { locataire: true },
        orderBy: { date: 'desc' },
      },
      prets: { orderBy: { ordre: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Biens</h1>
          <p>
            {biens.length} bien{biens.length > 1 ? 's' : ''} · cliquez sur une fiche pour voir le détail
          </p>
        </div>
        <BienFormModal />
      </div>

      <BiensView biens={JSON.parse(JSON.stringify(biens))} />
    </>
  );
}

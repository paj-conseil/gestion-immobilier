import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { LocatairesView } from '@/components/LocatairesView';

export default async function LocatairesPage() {
  const ctx = await getCurrentContext();

  const [locataires, biens] = await Promise.all([
    prisma.locataire.findMany({
      where: { scopeId: ctx.scopeId },
      include: {
        documents: true,
        locations: {
          include: { location: { include: { bien: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bien.findMany({ where: { scopeId: ctx.scopeId }, orderBy: { adresse: 'asc' } }),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Locataires</h1>
          <p>Dossiers et pièces justificatives par locataire</p>
        </div>
      </div>

      <LocatairesView
        locataires={JSON.parse(JSON.stringify(locataires))}
        biens={JSON.parse(JSON.stringify(biens))}
      />
    </>
  );
}

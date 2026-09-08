import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { DocumentsView } from '@/components/DocumentsView';

export default async function DocumentsPage() {
  const ctx = await getCurrentContext();

  const [biens, envois] = await Promise.all([
    prisma.bien.findMany({
      where: { scopeId: ctx.scopeId },
      include: {
        locations: {
          where: { statut: 'ACTIF' },
          include: { locataires: { include: { locataire: true } } },
        },
      },
      orderBy: { adresse: 'asc' },
    }),
    prisma.emailLog.findMany({
      where: { documentGenere: { scopeId: ctx.scopeId } },
      include: { documentGenere: true },
      orderBy: { envoyeLe: 'desc' },
      take: 15,
    }),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Documents</h1>
          <p>Générer un document et l&apos;envoyer depuis pierrejaubert@yahoo.com</p>
        </div>
      </div>

      <DocumentsView biens={JSON.parse(JSON.stringify(biens))} envois={JSON.parse(JSON.stringify(envois))} />
    </>
  );
}

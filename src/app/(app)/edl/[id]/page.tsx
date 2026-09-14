import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { EdlEditor } from '@/components/EdlEditor';

export default async function EdlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();

  const edl = await prisma.etatDesLieux.findFirst({
    where: { id, bien: { scopeId: ctx.scopeId } },
    include: {
      bien: true,
      location: { include: { locataires: { include: { locataire: true } } } },
      pieces: { orderBy: { ordre: 'asc' }, include: { items: { orderBy: { ordre: 'asc' } } } },
      photos: { orderBy: { ordre: 'asc' } },
    },
  });

  if (!edl) notFound();

  const documentGenere = await prisma.documentGenere.findFirst({ where: { edlId: id } });
  const locataireEmail = edl.location?.locataires[0]?.locataire.email ?? null;

  return (
    <EdlEditor
      edl={JSON.parse(JSON.stringify(edl))}
      documentGenereId={documentGenere?.id ?? null}
      pdfUrlInitial={documentGenere?.fileUrl ?? null}
      locataireEmail={locataireEmail}
    />
  );
}

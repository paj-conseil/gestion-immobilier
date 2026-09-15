import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { EdlEditor } from '@/components/EdlEditor';
import { DEFAULT_EMAIL_TEMPLATE } from '@/lib/email-template';

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

  const [documentGenere, scope] = await Promise.all([
    prisma.documentGenere.findFirst({ where: { edlId: id } }),
    prisma.scope.findUnique({ where: { id: ctx.scopeId } }),
  ]);
  const locataireEmail = edl.location?.locataires[0]?.locataire.email ?? null;
  const locatairePrenom = edl.location?.locataires[0]?.locataire.prenom ?? null;

  return (
    <EdlEditor
      edl={JSON.parse(JSON.stringify(edl))}
      documentGenereId={documentGenere?.id ?? null}
      pdfUrlInitial={documentGenere?.fileUrl ?? null}
      locataireEmail={locataireEmail}
      locatairePrenom={locatairePrenom}
      emailTemplate={scope?.emailTemplateCorps ?? DEFAULT_EMAIL_TEMPLATE}
      expediteurNom={ctx.userNom}
    />
  );
}

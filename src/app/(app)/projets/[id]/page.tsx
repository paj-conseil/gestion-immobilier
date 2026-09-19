import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { ProjetEditor } from '@/components/ProjetEditor';

export default async function ProjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  const projet = await prisma.projet.findFirst({ where: { id, scopeId: ctx.scopeId } });
  if (!projet) notFound();

  return <ProjetEditor projet={JSON.parse(JSON.stringify(projet))} scopeId={ctx.scopeId} />;
}

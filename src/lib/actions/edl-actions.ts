'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { saveFile } from '@/lib/storage';
import { bienLabel } from '@/lib/format';
import { renderPdf } from '@/lib/documents/render';
import { EtatLieuxDoc } from '@/lib/documents/pdf/EtatLieuxDoc';
import { EDL_TEMPLATE } from '@/lib/edl-templates';
import type { EtatItem, TypeEDL } from '@/lib/enums';

export async function createEtatDesLieux(formData: FormData): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();
  const bienId = String(formData.get('bienId') ?? '');
  const type = String(formData.get('type') ?? 'ENTREE') as 'ENTREE' | 'SORTIE';

  const bien = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
  if (!bien) return { error: 'Bien introuvable' };

  const location = await prisma.location.findFirst({ where: { bienId, statut: 'ACTIF' } });

  const edl = await prisma.etatDesLieux.create({
    data: {
      bienId,
      locationId: location?.id,
      type,
      pieces: {
        create: EDL_TEMPLATE.map((piece, pi) => ({
          nom: piece.nom,
          ordre: pi,
          items: { create: piece.items.map((label, ii) => ({ label, ordre: ii, etat: 'BON' as const })) },
        })),
      },
    },
  });

  revalidatePath('/edl');
  return { id: edl.id };
}

export async function updateEDLItem(
  itemId: string,
  data: { etat?: EtatItem; commentaire?: string },
): Promise<void> {
  const ctx = await getCurrentContext();
  const item = await prisma.eDLItem.findFirst({
    where: { id: itemId, piece: { edl: { bien: { scopeId: ctx.scopeId } } } },
    include: { piece: true },
  });
  if (!item) return;
  await prisma.eDLItem.update({ where: { id: itemId }, data });
  revalidatePath(`/edl/${item.piece.edlId}`);
}

export async function addEDLPiece(edlId: string, nom: string): Promise<void> {
  const ctx = await getCurrentContext();
  const edl = await prisma.etatDesLieux.findFirst({ where: { id: edlId, bien: { scopeId: ctx.scopeId } } });
  if (!edl || !nom.trim()) return;
  const count = await prisma.eDLPiece.count({ where: { edlId } });
  await prisma.eDLPiece.create({ data: { edlId, nom: nom.trim(), ordre: count } });
  revalidatePath(`/edl/${edlId}`);
}

export async function addEDLItem(pieceId: string, label: string): Promise<void> {
  const ctx = await getCurrentContext();
  const piece = await prisma.eDLPiece.findFirst({ where: { id: pieceId, edl: { bien: { scopeId: ctx.scopeId } } } });
  if (!piece || !label.trim()) return;
  const count = await prisma.eDLItem.count({ where: { pieceId } });
  await prisma.eDLItem.create({ data: { pieceId, label: label.trim(), ordre: count, etat: 'BON' } });
  revalidatePath(`/edl/${piece.edlId}`);
}

export async function addEDLPhoto(edlId: string, formData: FormData): Promise<void> {
  const ctx = await getCurrentContext();
  const edl = await prisma.etatDesLieux.findFirst({ where: { id: edlId, bien: { scopeId: ctx.scopeId } } });
  if (!edl) return;
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) return;
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveFile(buffer, { scopeId: ctx.scopeId, category: 'edl', filename: file.name });
  const count = await prisma.eDLPhoto.count({ where: { edlId } });
  await prisma.eDLPhoto.create({ data: { edlId, url: key, ordre: count } });
  revalidatePath(`/edl/${edlId}`);
}

export async function generateEtatDesLieuxPdf(edlId: string): Promise<{ fileUrl: string } | { error: string }> {
  const ctx = await getCurrentContext();
  const edl = await prisma.etatDesLieux.findFirst({
    where: { id: edlId, bien: { scopeId: ctx.scopeId } },
    include: {
      bien: true,
      pieces: { orderBy: { ordre: 'asc' }, include: { items: { orderBy: { ordre: 'asc' } } } },
      location: { include: { locataires: { include: { locataire: true } } } },
    },
  });
  if (!edl) return { error: 'État des lieux introuvable' };

  const locatairesNoms =
    edl.location?.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(' et ') || '—';

  const pdfBuffer = await renderPdf(
    EtatLieuxDoc({
      data: {
        type: edl.type as TypeEDL,
        date: edl.date,
        bienAdresse: bienLabel(edl.bien),
        bienCodePostal: edl.bien.codePostal,
        bienVille: edl.bien.ville,
        locatairesNoms,
        numeroCompteur: edl.bien.numeroCompteur,
        pieces: edl.pieces.map((p) => ({
          nom: p.nom,
          items: p.items.map((i) => ({ label: i.label, etat: i.etat as EtatItem, commentaire: i.commentaire })),
        })),
      },
    }),
  );

  const key = await saveFile(pdfBuffer, {
    scopeId: ctx.scopeId,
    category: 'generated',
    filename: `edl-${edl.type.toLowerCase()}-${edl.bien.adresse}.pdf`,
  });

  await prisma.documentGenere.create({
    data: {
      scopeId: ctx.scopeId,
      type: 'ETAT_LIEUX',
      bienId: edl.bienId,
      locationId: edl.locationId,
      locataireId: edl.location?.locataires[0]?.locataireId,
      fileUrl: key,
    },
  });

  revalidatePath('/edl');
  revalidatePath('/documents');
  return { fileUrl: key };
}

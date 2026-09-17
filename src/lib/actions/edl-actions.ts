'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { saveFile, readStoredFile, deleteStoredFile } from '@/lib/storage';
import { bienLabel } from '@/lib/format';
import { renderPdf } from '@/lib/documents/render';
import { EtatLieuxDoc } from '@/lib/documents/pdf/EtatLieuxDoc';
import { EDL_TEMPLATE } from '@/lib/edl-templates';
import type { EtatItem, TypeEDL, TypeItemEDL } from '@/lib/enums';

function readEdlDate(formData: FormData): Date {
  const raw = String(formData.get('date') ?? '');
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Le bail actif du bien qui concerne le locataire choisi, le cas échéant —
 * un bien peut avoir plusieurs locataires (colocation) voire, en théorie,
 * plusieurs baux actifs ; sans locataire précisé, on retombe sur le premier
 * bail actif du bien (comportement historique).
 */
async function findLocationPourEdl(bienId: string, locataireId?: string) {
  return prisma.location.findFirst({
    where: {
      bienId,
      statut: 'ACTIF',
      ...(locataireId ? { locataires: { some: { locataireId } } } : {}),
    },
  });
}

export async function createEtatDesLieux(formData: FormData): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();
  const bienId = String(formData.get('bienId') ?? '');
  const locataireId = String(formData.get('locataireId') ?? '') || undefined;
  const type = String(formData.get('type') ?? 'ENTREE') as 'ENTREE' | 'SORTIE';
  const date = readEdlDate(formData);

  const bien = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
  if (!bien) return { error: 'Bien introuvable' };

  const location = await findLocationPourEdl(bienId, locataireId);

  const edl = await prisma.etatDesLieux.create({
    data: {
      bienId,
      locationId: location?.id,
      locataireId,
      type,
      date,
      pieces: {
        create: EDL_TEMPLATE.map((piece, pi) => ({
          nom: piece.nom,
          ordre: pi,
          items: {
            create: piece.items.map((it, ii) => ({
              label: it.label,
              type: it.type ?? 'ETAT',
              ordre: ii,
            })),
          },
        })),
      },
    },
  });

  revalidatePath('/edl');
  return { id: edl.id };
}

/**
 * Attache directement un document d'état des lieux déjà existant (scan/PDF),
 * sans passer par la saisie structurée — pour un dossier déjà en cours dont
 * l'état des lieux n'a pas été fait via l'application. Le fichier est déjà
 * envoyé vers le stockage côté navigateur avant cet appel (voir
 * /api/upload/edl-photo) — un PDF scanné dépasse facilement la limite de
 * taille de requête d'une Server Action — seule sa clé transite ici.
 */
export async function importEtatDesLieux(formData: FormData): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();
  const bienId = String(formData.get('bienId') ?? '');
  const locataireId = String(formData.get('locataireId') ?? '') || undefined;
  const type = String(formData.get('type') ?? 'ENTREE') as 'ENTREE' | 'SORTIE';
  const date = readEdlDate(formData);
  const key = String(formData.get('fichierUrl') ?? '');
  if (!key) return { error: 'Aucun fichier sélectionné' };

  const bien = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
  if (!bien) return { error: 'Bien introuvable' };

  const location = await findLocationPourEdl(bienId, locataireId);

  const edl = await prisma.etatDesLieux.create({
    data: { bienId, locationId: location?.id, locataireId, type, date, fileUrl: key },
  });

  revalidatePath('/edl');
  return { id: edl.id };
}

export async function updateEDLItem(
  itemId: string,
  data: { etat?: EtatItem | null; commentaire?: string | null; quantite?: number | null },
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

export async function addEDLItem(pieceId: string, label: string, type: TypeItemEDL = 'ETAT'): Promise<void> {
  const ctx = await getCurrentContext();
  const piece = await prisma.eDLPiece.findFirst({ where: { id: pieceId, edl: { bien: { scopeId: ctx.scopeId } } } });
  if (!piece || !label.trim()) return;
  const count = await prisma.eDLItem.count({ where: { pieceId } });
  await prisma.eDLItem.create({ data: { pieceId, label: label.trim(), type, ordre: count } });
  revalidatePath(`/edl/${piece.edlId}`);
}

/**
 * Rattache une ou plusieurs photos déjà envoyées vers le stockage (upload
 * direct navigateur → Vercel Blob, voir /api/upload/edl-photo — une photo de
 * smartphone dépasse vite la limite de taille de requête d'une Server
 * Action) à l'état des lieux dans son ensemble, et optionnellement aussi à
 * une pièce précise et/ou un élément précis — sinon elles comptent comme
 * photos générales du rapport.
 */
export async function addEDLPhotosFromKeys(
  edlId: string,
  keys: string[],
  scope?: { pieceId?: string; itemId?: string },
): Promise<void> {
  const ctx = await getCurrentContext();
  const edl = await prisma.etatDesLieux.findFirst({ where: { id: edlId, bien: { scopeId: ctx.scopeId } } });
  if (!edl || keys.length === 0) return;

  let pieceId: string | undefined;
  let itemId: string | undefined;
  if (scope?.itemId) {
    const item = await prisma.eDLItem.findFirst({ where: { id: scope.itemId, piece: { edlId } }, include: { piece: true } });
    if (item) {
      itemId = item.id;
      pieceId = item.pieceId;
    }
  } else if (scope?.pieceId) {
    const piece = await prisma.eDLPiece.findFirst({ where: { id: scope.pieceId, edlId } });
    if (piece) pieceId = piece.id;
  }

  const count = await prisma.eDLPhoto.count({ where: { edlId } });
  await prisma.eDLPhoto.createMany({
    data: keys.map((url, i) => ({ edlId, pieceId, itemId, url, ordre: count + i })),
  });
  revalidatePath(`/edl/${edlId}`);
}

export async function deleteEDLPhoto(photoId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const photo = await prisma.eDLPhoto.findFirst({
    where: { id: photoId, edl: { bien: { scopeId: ctx.scopeId } } },
  });
  if (!photo) return { error: 'Photo introuvable' };

  await deleteStoredFile(photo.url).catch(() => undefined);
  await prisma.eDLPhoto.delete({ where: { id: photoId } });

  revalidatePath(`/edl/${photo.edlId}`);
  return { ok: true };
}

export async function generateEtatDesLieuxPdf(
  edlId: string,
): Promise<{ fileUrl: string; documentGenereId: string } | { error: string }> {
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
  if (edl.fileUrl) return { error: 'Ce document a été importé directement, il n\'y a rien à générer.' };

  const locatairesNoms =
    edl.location?.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(' et ') || '—';

  // Les signatures (bailleur/locataire), si déjà capturées, sont lues depuis
  // le stockage et incrustées dans le PDF à chaque (re)génération.
  const [signatureBailleur, signatureLocataire] = await Promise.all([
    edl.signatureBailleurUrl
      ? readStoredFile(edl.signatureBailleurUrl).then((b) => `data:image/png;base64,${b.toString('base64')}`)
      : Promise.resolve(null),
    edl.signatureLocataireUrl
      ? readStoredFile(edl.signatureLocataireUrl).then((b) => `data:image/png;base64,${b.toString('base64')}`)
      : Promise.resolve(null),
  ]);

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
          items: p.items.map((i) => ({
            label: i.label,
            type: i.type as TypeItemEDL,
            etat: i.etat as EtatItem | null,
            quantite: i.quantite,
            commentaire: i.commentaire,
          })),
        })),
        signatureBailleur,
        signatureLocataire,
      },
    }),
  );

  const key = await saveFile(pdfBuffer, {
    scopeId: ctx.scopeId,
    category: 'generated',
    filename: `edl-${edl.type.toLowerCase()}-${edl.bien.adresse}.pdf`,
  });

  // Un même état des lieux ne doit produire qu'un seul DocumentGenere : on
  // met à jour celui déjà lié plutôt que d'en recréer un à chaque
  // régénération (ex. après chaque signature).
  const existant = await prisma.documentGenere.findFirst({ where: { edlId: edl.id } });
  const documentGenere = existant
    ? await prisma.documentGenere.update({ where: { id: existant.id }, data: { fileUrl: key, genereLe: new Date() } })
    : await prisma.documentGenere.create({
        data: {
          scopeId: ctx.scopeId,
          type: 'ETAT_LIEUX',
          bienId: edl.bienId,
          locationId: edl.locationId,
          locataireId: edl.location?.locataires[0]?.locataireId,
          edlId: edl.id,
          fileUrl: key,
        },
      });

  revalidatePath('/edl');
  revalidatePath(`/edl/${edl.id}`);
  revalidatePath('/documents');
  return { fileUrl: key, documentGenereId: documentGenere.id };
}

/**
 * Capture la signature (bailleur ou locataire) d'un état des lieux et
 * régénère aussitôt le PDF pour l'incruster — pas de snapshot de données à
 * gérer ici (contrairement à Contrat/Cautionnement) puisque les
 * pièces/éléments de l'EDL ne changent pas après coup.
 */
export async function signerEtatDesLieux(
  edlId: string,
  formData: FormData,
): Promise<{ fileUrl: string; documentGenereId: string } | { error: string }> {
  const ctx = await getCurrentContext();
  const edl = await prisma.etatDesLieux.findFirst({ where: { id: edlId, bien: { scopeId: ctx.scopeId } } });
  if (!edl) return { error: 'État des lieux introuvable' };
  if (edl.fileUrl) return { error: "Ce document a été importé directement, la signature électronique ne s'applique pas." };

  const role = String(formData.get('role') ?? '');
  const signature = String(formData.get('signature') ?? '');
  const signePar = String(formData.get('signePar') ?? '').trim();
  if (role !== 'BAILLEUR' && role !== 'LOCATAIRE') return { error: 'Rôle invalide' };
  if (!signature.startsWith('data:image/')) return { error: 'Signature invalide' };
  if (!signePar) return { error: 'Le nom du signataire est requis' };

  const sigBuffer = Buffer.from(signature.split(',')[1] ?? '', 'base64');
  const sigKey = await saveFile(sigBuffer, {
    scopeId: ctx.scopeId,
    category: 'signatures',
    filename: `edl-${edlId}-${role.toLowerCase()}.png`,
  });

  await prisma.etatDesLieux.update({
    where: { id: edlId },
    data:
      role === 'BAILLEUR'
        ? { signatureBailleurUrl: sigKey, signatureBailleurLe: new Date(), signatureBailleurPar: signePar }
        : { signatureLocataireUrl: sigKey, signatureLocataireLe: new Date(), signatureLocatairePar: signePar },
  });

  return generateEtatDesLieuxPdf(edlId);
}

export async function deleteEtatDesLieux(edlId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const edl = await prisma.etatDesLieux.findFirst({
    where: { id: edlId, bien: { scopeId: ctx.scopeId } },
    include: { photos: true },
  });
  if (!edl) return { error: 'État des lieux introuvable' };

  const documentGenere = await prisma.documentGenere.findFirst({ where: { edlId } });

  // Les lignes en base (pièces/éléments/photos) sont supprimées en cascade
  // par Prisma, mais pas les fichiers correspondants dans le stockage.
  const filesToDelete = [
    edl.fileUrl,
    edl.signatureBailleurUrl,
    edl.signatureLocataireUrl,
    ...edl.photos.map((p) => p.url),
    documentGenere?.fileUrl,
  ].filter((key): key is string => !!key);
  await Promise.all(filesToDelete.map((key) => deleteStoredFile(key).catch(() => undefined)));

  if (documentGenere) {
    await prisma.documentGenere.delete({ where: { id: documentGenere.id } });
  }
  await prisma.etatDesLieux.delete({ where: { id: edlId } });

  revalidatePath('/edl');
  revalidatePath('/documents');
  return { ok: true };
}

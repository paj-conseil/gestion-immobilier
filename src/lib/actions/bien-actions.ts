'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { saveFile, deleteStoredFile } from '@/lib/storage';

function cleanMontant(v: unknown): unknown {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v !== 'string') return v;
  const cleaned = v.replace(/\s/g, '').replace(',', '.');
  return cleaned === '' ? undefined : Number(cleaned);
}

const numOrUndef = z.preprocess(cleanMontant, z.number().optional());
const dateOrUndef = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : new Date(String(v))),
  z.date().optional(),
);
// Pour l'édition d'un prêt : un champ vidé doit explicitement effacer la
// donnée (null) plutôt que d'être ignoré (undefined ferait que Prisma laisse
// l'ancienne valeur inchangée dans un update()).
function cleanMontantNull(v: unknown): unknown {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v !== 'string') return v;
  const cleaned = v.replace(/\s/g, '').replace(',', '.');
  return cleaned === '' ? null : Number(cleaned);
}
const numOrNull = z.preprocess(cleanMontantNull, z.number().nullable());
const intOrNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Math.round(Number(v))),
  z.number().nullable(),
);
const dateOrNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : new Date(String(v))),
  z.date().nullable(),
);

const pretSchema = z.object({
  banque: z.string().optional(),
  montant: numOrNull,
  tauxInteret: numOrNull,
  mensualite: numOrNull,
  dureeMois: intOrNull,
  dateDebut: dateOrNull,
  dateFin: dateOrNull,
});

const bienSchema = z.object({
  adresse: z.string().min(1, 'Adresse requise'),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  complement: z.string().optional(),
  type: z.enum(['APPARTEMENT', 'STUDIO', 'MAISON', 'FOYER', 'AUTRE']).default('APPARTEMENT'),
  statut: z.enum(['LOUE', 'VACANT', 'PERSO']).default('VACANT'),
  surface: numOrUndef,
  description: z.string().optional(),
  telephone: z.string().optional(),
  numeroCompteur: z.string().optional(),
  couleur: z.string().optional(),
  prixAchat: numOrUndef,
  fraisNotaire: numOrUndef,
  montantTravaux: numOrUndef,
  apportPersonnel: numOrUndef,
});

function extract(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return bienSchema.parse(raw);
}

export async function createBien(formData: FormData): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();

  let data;
  try {
    data = extract(formData);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  const bien = await prisma.bien.create({
    data: { ...data, scopeId: ctx.scopeId },
  });

  const photos = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  for (const [i, file] of photos.entries()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = await saveFile(buffer, { scopeId: ctx.scopeId, category: 'photos', filename: file.name });
    await prisma.bienPhoto.create({ data: { bienId: bien.id, url: key, ordre: i } });
  }

  revalidatePath('/biens');
  revalidatePath('/dashboard');
  return { id: bien.id };
}

export async function updateBien(bienId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();

  const existing = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
  if (!existing) return { error: 'Bien introuvable' };

  let data;
  try {
    data = extract(formData);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  await prisma.bien.update({ where: { id: bienId }, data });

  const photos = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > 0) {
    const currentMax = await prisma.bienPhoto.count({ where: { bienId } });
    for (const [i, file] of photos.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = await saveFile(buffer, { scopeId: ctx.scopeId, category: 'photos', filename: file.name });
      await prisma.bienPhoto.create({ data: { bienId, url: key, ordre: currentMax + i } });
    }
  }

  revalidatePath('/biens');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function createPret(bienId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const bien = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
  if (!bien) return { error: 'Bien introuvable' };

  const raw = Object.fromEntries(formData.entries());
  let data;
  try {
    data = pretSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  const ordre = await prisma.pret.count({ where: { bienId } });
  await prisma.pret.create({ data: { ...data, banque: data.banque || null, bienId, ordre } });

  revalidatePath('/biens');
  return { ok: true };
}

export async function updatePret(pretId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const pret = await prisma.pret.findFirst({ where: { id: pretId, bien: { scopeId: ctx.scopeId } } });
  if (!pret) return { error: 'Prêt introuvable' };

  const raw = Object.fromEntries(formData.entries());
  let data;
  try {
    data = pretSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  await prisma.pret.update({ where: { id: pretId }, data: { ...data, banque: data.banque || null } });

  revalidatePath('/biens');
  return { ok: true };
}

export async function deletePret(pretId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const pret = await prisma.pret.findFirst({ where: { id: pretId, bien: { scopeId: ctx.scopeId } } });
  if (!pret) return { error: 'Prêt introuvable' };
  await prisma.pret.delete({ where: { id: pretId } });
  revalidatePath('/biens');
  return { ok: true };
}

export async function deleteBienPhoto(photoId: string): Promise<void> {
  const ctx = await getCurrentContext();
  const photo = await prisma.bienPhoto.findFirst({
    where: { id: photoId, bien: { scopeId: ctx.scopeId } },
  });
  if (!photo) return;
  await prisma.bienPhoto.delete({ where: { id: photoId } });
  await deleteStoredFile(photo.url);
  revalidatePath('/biens');
}

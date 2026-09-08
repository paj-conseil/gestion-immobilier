'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { saveFile, deleteStoredFile } from '@/lib/storage';

const numOrUndef = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().optional(),
);
const dateOrUndef = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : new Date(String(v))),
  z.date().optional(),
);
// Pour les formulaires d'édition qui soumettent toujours le champ : une valeur
// vide doit explicitement effacer la donnée (null), pas être ignorée
// (undefined ferait que Prisma laisse l'ancienne valeur inchangée).
const numOrNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().nullable(),
);
const dateOrNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : new Date(String(v))),
  z.date().nullable(),
);

const locataireSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  email: z.string().email().optional().or(z.literal('')),
  telephone: z.string().optional(),
  dateNaissance: dateOrNull,
  lieuNaissance: z.string().optional(),
  statut: z.enum(['ACTIF', 'INACTIF']).default('ACTIF'),
});

const bailSchema = z.object({
  bienId: z.string().min(1),
  loyerHC: z.number(),
  charges: z.number().default(0),
  depotGarantie: numOrUndef,
  dateDebut: z.date(),
  dateFin: dateOrUndef,
  dateProchaineRevision: dateOrUndef,
});

const bailUpdateSchema = z.object({
  loyerHC: z.number(),
  charges: z.number().default(0),
  dateDebut: z.date(),
  dateFin: dateOrNull,
  depotGarantie: numOrNull,
  depotGarantieDateReglement: dateOrNull,
  depotGarantieRembourse: numOrNull,
  depotGarantieDateRemboursement: dateOrNull,
});

export async function createLocataire(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();
  const raw = Object.fromEntries(formData.entries());

  let data;
  try {
    data = locataireSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  const locataire = await prisma.locataire.create({
    data: {
      scopeId: ctx.scopeId,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email || undefined,
      telephone: data.telephone || undefined,
      dateNaissance: data.dateNaissance ?? undefined,
      lieuNaissance: data.lieuNaissance || undefined,
      documents: {
        create: [
          { type: 'CONTRAT_SIGNE', statut: 'MANQUANT' },
          { type: 'CNI', statut: 'MANQUANT' },
          { type: 'ATTESTATION_ASSURANCE', statut: 'MANQUANT' },
        ],
      },
    },
  });

  const bienId = String(raw.bienId ?? '');
  if (bienId) {
    const bien = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
    if (bien) {
      const bail = bailSchema.parse({
        bienId,
        loyerHC: Number(raw.loyerHC),
        charges: raw.charges ? Number(raw.charges) : 0,
        depotGarantie: raw.depotGarantie,
        dateDebut: raw.dateDebut ? new Date(String(raw.dateDebut)) : new Date(),
        dateFin: raw.dateFin,
        dateProchaineRevision: raw.dateProchaineRevision,
      });
      await prisma.location.create({
        data: {
          ...bail,
          locataires: { create: [{ locataireId: locataire.id }] },
        },
      });
      await prisma.bien.update({ where: { id: bienId }, data: { statut: 'LOUE' } });
    }
  }

  revalidatePath('/locataires');
  revalidatePath('/biens');
  revalidatePath('/dashboard');
  return { id: locataire.id };
}

export async function updateLocataire(
  locataireId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const existing = await prisma.locataire.findFirst({ where: { id: locataireId, scopeId: ctx.scopeId } });
  if (!existing) return { error: 'Locataire introuvable' };

  const raw = Object.fromEntries(formData.entries());
  let data;
  try {
    data = locataireSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  await prisma.locataire.update({
    where: { id: locataireId },
    data: {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email || null,
      telephone: data.telephone || null,
      dateNaissance: data.dateNaissance,
      lieuNaissance: data.lieuNaissance || null,
      statut: data.statut,
    },
  });

  revalidatePath('/locataires');
  return { ok: true };
}

export async function uploadLocataireDocument(
  locataireId: string,
  type: 'CONTRAT_SIGNE' | 'CNI' | 'ATTESTATION_ASSURANCE' | 'RIB' | 'AUTRE',
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const locataire = await prisma.locataire.findFirst({ where: { id: locataireId, scopeId: ctx.scopeId } });
  if (!locataire) return { error: 'Locataire introuvable' };

  const file = formData.get('fichier');
  if (!(file instanceof File) || file.size === 0) return { error: 'Aucun fichier sélectionné' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveFile(buffer, { scopeId: ctx.scopeId, category: 'locataires', filename: file.name });

  const existingDoc = await prisma.documentLocataire.findFirst({ where: { locataireId, type } });
  if (existingDoc) {
    if (existingDoc.fileUrl) await deleteStoredFile(existingDoc.fileUrl);
    await prisma.documentLocataire.update({
      where: { id: existingDoc.id },
      data: { fileUrl: key, statut: 'RECU', uploadedAt: new Date() },
    });
  } else {
    await prisma.documentLocataire.create({
      data: { locataireId, type, fileUrl: key, statut: 'RECU', uploadedAt: new Date() },
    });
  }

  revalidatePath('/locataires');
  return { ok: true };
}

export async function createBail(
  locataireId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const locataire = await prisma.locataire.findFirst({ where: { id: locataireId, scopeId: ctx.scopeId } });
  if (!locataire) return { error: 'Locataire introuvable' };

  const raw = Object.fromEntries(formData.entries());
  const bien = await prisma.bien.findFirst({ where: { id: String(raw.bienId), scopeId: ctx.scopeId } });
  if (!bien) return { error: 'Bien introuvable' };

  let bail;
  try {
    bail = bailSchema.parse({
      bienId: bien.id,
      loyerHC: Number(raw.loyerHC),
      charges: raw.charges ? Number(raw.charges) : 0,
      depotGarantie: raw.depotGarantie,
      dateDebut: raw.dateDebut ? new Date(String(raw.dateDebut)) : new Date(),
      dateFin: raw.dateFin,
      dateProchaineRevision: raw.dateProchaineRevision,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  await prisma.location.create({
    data: { ...bail, locataires: { create: [{ locataireId }] } },
  });
  await prisma.bien.update({ where: { id: bien.id }, data: { statut: 'LOUE' } });

  revalidatePath('/locataires');
  revalidatePath('/biens');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function updateBail(
  locationId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const location = await prisma.location.findFirst({
    where: { id: locationId, bien: { scopeId: ctx.scopeId } },
    include: { locataires: true },
  });
  if (!location) return { error: 'Bail introuvable' };

  const raw = Object.fromEntries(formData.entries());
  let data;
  try {
    data = bailUpdateSchema.parse({
      loyerHC: Number(raw.loyerHC),
      charges: raw.charges ? Number(raw.charges) : 0,
      dateDebut: raw.dateDebut ? new Date(String(raw.dateDebut)) : new Date(),
      dateFin: raw.dateFin,
      depotGarantie: raw.depotGarantie,
      depotGarantieDateReglement: raw.depotGarantieDateReglement,
      depotGarantieRembourse: raw.depotGarantieRembourse,
      depotGarantieDateRemboursement: raw.depotGarantieDateRemboursement,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.errors[0]?.message ?? 'Formulaire invalide' };
    return { error: 'Formulaire invalide' };
  }

  // La date de sortie fait automatiquement passer le bail et le(s) locataire(s) en inactif
  // (et inversement si la date de sortie est retirée).
  const nouveauStatut = data.dateFin ? 'INACTIF' : 'ACTIF';

  await prisma.location.update({
    where: { id: locationId },
    data: { ...data, statut: nouveauStatut },
  });

  const locataireIds = location.locataires.map((x) => x.locataireId);
  await prisma.locataire.updateMany({
    where: { id: { in: locataireIds } },
    data: { statut: nouveauStatut },
  });

  revalidatePath('/locataires');
  revalidatePath('/biens');
  revalidatePath('/dashboard');
  return { ok: true };
}

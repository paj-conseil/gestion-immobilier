'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { deleteStoredFile } from '@/lib/storage';
import { chargesSuggerees } from '@/lib/projet-calc';

const num = z.number().finite();

const projetSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom du projet est requis'),
  adresse: z.string().trim().nullable(),
  codePostal: z.string().trim().nullable(),
  ville: z.string().trim().nullable(),
  type: z.string().min(1),
  surface: num.nullable(),
  prixAchat: num.min(0),
  fraisAgence: num.min(0),
  tauxNotaire: num.min(0).max(0.2),
  montantTravaux: num.min(0),
  apport: num.min(0),
  dureeAns: num.int().min(1).max(40),
  tauxCredit: num.min(0).max(0.3),
  tauxAssurance: num.min(0).max(0.1),
  loyerMensuel: num.min(0),
  chargesRecuperablesMensuel: num.min(0),
  revenuNetMensuel: num.min(0),
  endettementMax: num.min(0).max(1),
  regimeFiscal: z.enum(['MICRO_BIC', 'MICRO_FONCIER']),
  tmi: num.min(0).max(0.6),
  charges: z.array(z.object({ id: z.string(), label: z.string(), montantAnnuel: num })),
  photoUrl: z.string().nullable(),
});

export type ProjetData = z.infer<typeof projetSchema>;

export async function createProjet(nom: string): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();
  if (!nom.trim()) return { error: 'Le nom du projet est requis' };
  const projet = await prisma.projet.create({
    data: { scopeId: ctx.scopeId, nom: nom.trim(), charges: chargesSuggerees(null, 0) },
  });
  revalidatePath('/projets');
  return { id: projet.id };
}

export async function updateProjet(id: string, data: ProjetData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const parsed = projetSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Formulaire invalide' };

  const existing = await prisma.projet.findFirst({ where: { id, scopeId: ctx.scopeId } });
  if (!existing) return { error: 'Projet introuvable' };

  const d = parsed.data;
  if (d.photoUrl && !d.photoUrl.startsWith(`projets/${ctx.scopeId}/`)) return { error: 'Photo invalide' };

  await prisma.projet.update({ where: { id }, data: { ...d, adresse: d.adresse || null, codePostal: d.codePostal || null, ville: d.ville || null } });
  if (existing.photoUrl && existing.photoUrl !== d.photoUrl) {
    await deleteStoredFile(existing.photoUrl).catch(() => undefined);
  }
  revalidatePath('/projets');
  revalidatePath(`/projets/${id}`);
  return { ok: true };
}

export async function deleteProjet(id: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const existing = await prisma.projet.findFirst({ where: { id, scopeId: ctx.scopeId } });
  if (!existing) return { error: 'Projet introuvable' };
  if (existing.photoUrl) await deleteStoredFile(existing.photoUrl).catch(() => undefined);
  await prisma.projet.delete({ where: { id } });
  revalidatePath('/projets');
  return { ok: true };
}

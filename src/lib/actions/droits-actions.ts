'use server';

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { seedDefaultPostes } from '@/lib/postes-defaults';
import type { Role } from '@/lib/enums';

function generateTempPassword(): string {
  return randomBytes(6).toString('base64url');
}

async function canManageScope(userId: string, scopeId: string): Promise<boolean> {
  const scope = await prisma.scope.findUnique({ where: { id: scopeId } });
  if (scope?.ownerId === userId) return true;
  const membership = await prisma.membership.findUnique({ where: { userId_scopeId: { userId, scopeId } } });
  return membership?.role === 'ADMIN' && membership.statut === 'ACTIF';
}

export async function createScope(nom: string): Promise<{ id: string } | { error: string }> {
  const ctx = await getCurrentContext();
  if (!nom.trim()) return { error: 'Nom du périmètre requis' };

  const scope = await prisma.scope.create({ data: { nom: nom.trim(), ownerId: ctx.userId } });
  await seedDefaultPostes(scope.id);
  revalidatePath('/droits');
  return { id: scope.id };
}

export async function inviteToScope(
  scopeId: string,
  formData: FormData,
): Promise<{ ok: true; tempPassword?: string; email: string } | { error: string }> {
  const ctx = await getCurrentContext();
  if (!(await canManageScope(ctx.userId, scopeId))) return { error: 'Action non autorisée sur ce périmètre' };

  const email = String(formData.get('email') ?? '').toLowerCase().trim();
  const nom = String(formData.get('nom') ?? '').trim();
  const role = String(formData.get('role') ?? 'EDITEUR') as Role;
  if (!email || !nom) return { error: 'Nom et email requis' };

  let user = await prisma.user.findUnique({ where: { email } });
  let tempPassword: string | undefined;

  if (!user) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await prisma.user.create({ data: { email, nom, passwordHash } });
  }

  await prisma.membership.upsert({
    where: { userId_scopeId: { userId: user.id, scopeId } },
    update: { role, statut: 'ACTIF' },
    create: { userId: user.id, scopeId, role, statut: 'ACTIF' },
  });

  revalidatePath('/droits');
  return { ok: true, tempPassword, email };
}

export async function changeMembershipRole(membershipId: string, role: Role): Promise<void> {
  const ctx = await getCurrentContext();
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership) return;
  if (!(await canManageScope(ctx.userId, membership.scopeId))) return;
  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath('/droits');
}

export async function updateScopeParametres(
  scopeId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  if (!(await canManageScope(ctx.userId, scopeId))) return { error: 'Action non autorisée sur ce périmètre' };

  const exigerSignatureDocuments = formData.get('exigerSignatureDocuments') === 'on';
  const emailTemplateCorps = String(formData.get('emailTemplateCorps') ?? '').trim() || null;

  await prisma.scope.update({
    where: { id: scopeId },
    data: { exigerSignatureDocuments, emailTemplateCorps },
  });

  revalidatePath('/droits');
  revalidatePath('/documents');
  revalidatePath('/edl');
  return { ok: true };
}

export async function updateDocumentTypeParametre(
  scopeId: string,
  type: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  if (!(await canManageScope(ctx.userId, scopeId))) return { error: 'Action non autorisée sur ce périmètre' };

  const data = {
    nomAffichage: String(formData.get('nomAffichage') ?? '').trim() || null,
    texteIntro: String(formData.get('texteIntro') ?? '').trim() || null,
    texteClausesAdditionnelles: String(formData.get('texteClausesAdditionnelles') ?? '').trim() || null,
    emailSujet: String(formData.get('emailSujet') ?? '').trim() || null,
    emailCorps: String(formData.get('emailCorps') ?? '').trim() || null,
    signataireLocataire: formData.get('signataireLocataire') === 'on',
    signataireProprietaire: formData.get('signataireProprietaire') === 'on',
  };

  await prisma.documentTypeParametre.upsert({
    where: { scopeId_type: { scopeId, type } },
    update: data,
    create: { scopeId, type, ...data },
  });

  revalidatePath('/droits');
  revalidatePath('/documents');
  return { ok: true };
}

export async function removeMembership(membershipId: string): Promise<void> {
  const ctx = await getCurrentContext();
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership) return;
  if (!(await canManageScope(ctx.userId, membership.scopeId))) return;
  if (membership.userId === ctx.userId) return; // ne pas se retirer soi-même par erreur
  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath('/droits');
}

export async function changerMotDePasse(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const actuel = String(formData.get('motDePasseActuel') ?? '');
  const nouveau = String(formData.get('nouveauMotDePasse') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  if (!actuel || !nouveau || !confirmation) return { error: 'Tous les champs sont requis' };
  if (nouveau.length < 8) return { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' };
  if (nouveau !== confirmation) return { error: 'La confirmation ne correspond pas au nouveau mot de passe' };

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) return { error: 'Utilisateur introuvable' };

  const valid = await bcrypt.compare(actuel, user.passwordHash);
  if (!valid) return { error: 'Mot de passe actuel incorrect' };

  const passwordHash = await bcrypt.hash(nouveau, 10);
  await prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash } });

  return { ok: true };
}

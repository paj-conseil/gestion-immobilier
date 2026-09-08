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

export async function removeMembership(membershipId: string): Promise<void> {
  const ctx = await getCurrentContext();
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership) return;
  if (!(await canManageScope(ctx.userId, membership.scopeId))) return;
  if (membership.userId === ctx.userId) return; // ne pas se retirer soi-même par erreur
  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath('/droits');
}

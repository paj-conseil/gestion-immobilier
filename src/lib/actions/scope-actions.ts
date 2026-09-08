'use server';

import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SCOPE_COOKIE } from '@/lib/scope';

export async function setActiveScope(scopeId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const membership = await prisma.membership.findUnique({
    where: { userId_scopeId: { userId: session.user.id, scopeId } },
  });
  if (!membership || membership.statut !== 'ACTIF') return;

  (await cookies()).set(SCOPE_COOKIE, scopeId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

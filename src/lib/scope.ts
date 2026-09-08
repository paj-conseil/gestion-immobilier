import 'server-only';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Role } from '@/lib/enums';

const SCOPE_COOKIE = 'scopeId';

export type CurrentContext = {
  userId: string;
  userNom: string;
  scopeId: string;
  scopeNom: string;
  role: Role;
  memberships: { scopeId: string; scopeNom: string; role: Role }[];
};

/**
 * Résout l'utilisateur connecté + son périmètre actif (cookie, ou premier
 * périmètre disponible à défaut). Redirige vers /login si non authentifié.
 * À utiliser dans les Server Components / Server Actions / Route Handlers.
 */
export async function getCurrentContext(): Promise<CurrentContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, statut: 'ACTIF' },
    include: { scope: true },
    orderBy: { createdAt: 'asc' },
  });

  if (memberships.length === 0) {
    redirect('/login?erreur=aucun-perimetre');
  }

  const cookieStore = await cookies();
  const requested = cookieStore.get(SCOPE_COOKIE)?.value;
  const active = memberships.find((m) => m.scopeId === requested) ?? memberships[0];

  return {
    userId: session.user.id,
    userNom: session.user.name ?? session.user.email ?? '',
    scopeId: active.scopeId,
    scopeNom: active.scope.nom,
    role: active.role as Role,
    memberships: memberships.map((m) => ({
      scopeId: m.scopeId,
      scopeNom: m.scope.nom,
      role: m.role as Role,
    })),
  };
}

export { SCOPE_COOKIE };

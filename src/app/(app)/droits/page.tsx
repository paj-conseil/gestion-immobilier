import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { DroitsView } from '@/components/DroitsView';

export default async function DroitsPage() {
  const ctx = await getCurrentContext();
  const myScopeIds = ctx.memberships.map((m) => m.scopeId);

  const [myScopes, ownedScopes] = await Promise.all([
    prisma.scope.findMany({
      where: { id: { in: myScopeIds } },
      include: { memberships: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
    }),
    prisma.scope.findMany({
      where: { ownerId: ctx.userId, id: { notIn: myScopeIds } },
      include: { memberships: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
    }),
  ]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Droits &amp; accès</h1>
          <p>Chaque périmètre ne voit que ses propres biens</p>
        </div>
      </div>
      <DroitsView
        currentUserId={ctx.userId}
        myScopes={JSON.parse(JSON.stringify(myScopes))}
        administeredScopes={JSON.parse(JSON.stringify(ownedScopes))}
      />
    </>
  );
}

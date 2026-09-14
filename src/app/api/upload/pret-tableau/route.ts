import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Génère un jeton d'upload client pour les tableaux d'amortissement, qui
 * peuvent peser plusieurs Mo (PDF scannés par la banque) — au-delà de la
 * limite de taille de requête imposée par les fonctions serverless Vercel,
 * bien plus basse que la limite `bodySizeLimit` de Next.js. Le navigateur
 * envoie donc le fichier directement à Vercel Blob, sans passer par une
 * Server Action.
 *
 * N'utilise PAS getCurrentContext() (lib/scope.ts) : ce helper appelle
 * redirect('/login') en cas d'échec, pensé pour les Server Components/
 * Actions — dans un Route Handler appelé via fetch() par le SDK Blob, ça
 * produit une redirection HTML plutôt qu'une réponse JSON d'erreur propre,
 * que le client Blob ne sait pas interpréter ("Failed to retrieve the
 * client token"). On réplique donc ici la résolution du périmètre actif
 * (session + cookie scopeId) sans effet de redirection.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, statut: 'ACTIF' },
    orderBy: { createdAt: 'asc' },
  });
  if (memberships.length === 0) {
    return NextResponse.json({ error: 'Aucun périmètre associé à ce compte' }, { status: 403 });
  }
  const cookieStore = await cookies();
  const requested = cookieStore.get('scopeId')?.value;
  const scopeId = (memberships.find((m) => m.scopeId === requested) ?? memberships[0]).scopeId;

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Même convention `<category>/<scopeId>/...` que le reste du
        // stockage — /api/files/[...key] vérifie le périmètre à partir de
        // ce même chemin.
        if (!pathname.startsWith(`prets/${scopeId}/`)) {
          throw new Error('Chemin de fichier invalide');
        }
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 20 * 1024 * 1024,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    console.error('Échec de la génération du jeton d\'upload (tableau amortissement) :', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec de l'upload" },
      { status: 400 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Génère un jeton d'upload client pour les photos d'état des lieux. Une
 * photo de smartphone pèse facilement plusieurs Mo, et plusieurs photos
 * envoyées d'un coup dans une même Server Action dépassaient la limite de
 * taille de requête des fonctions serverless Vercel (bien plus basse que le
 * `bodySizeLimit` de Next.js) — l'envoi échouait silencieusement, sans
 * qu'aucune erreur ne remonte à l'écran. Le navigateur envoie donc chaque
 * photo directement à Vercel Blob (voir /api/upload/pret-tableau pour le
 * même principe, déjà utilisé pour les tableaux d'amortissement).
 *
 * N'utilise pas getCurrentContext() (lib/scope.ts) : ce helper redirige vers
 * /login en cas d'échec, ce qui casse l'appel fetch() du SDK Blob.
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
        if (!pathname.startsWith(`edl/${scopeId}/`)) {
          throw new Error('Chemin de fichier invalide');
        }
        return {
          allowedContentTypes: ['image/*'],
          maximumSizeInBytes: 20 * 1024 * 1024,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    console.error("Échec de la génération du jeton d'upload (photo EDL) :", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec de l'upload" },
      { status: 400 },
    );
  }
}

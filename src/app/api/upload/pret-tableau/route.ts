import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentContext } from '@/lib/scope';

/**
 * Génère un jeton d'upload client pour les tableaux d'amortissement, qui
 * peuvent peser plusieurs Mo (PDF scannés par la banque) — au-delà de la
 * limite de taille de requête imposée par les fonctions serverless Vercel,
 * bien plus basse que la limite `bodySizeLimit` de Next.js. Le navigateur
 * envoie donc le fichier directement à Vercel Blob, sans passer par une
 * Server Action.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Non autorisé', { status: 401 });

  const ctx = await getCurrentContext();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Même convention `<category>/<scopeId>/...` que le reste du
        // stockage — /api/files/[...key] vérifie le périmètre à partir de
        // ce même chemin.
        if (!pathname.startsWith(`prets/${ctx.scopeId}/`)) {
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec de l'upload" },
      { status: 400 },
    );
  }
}

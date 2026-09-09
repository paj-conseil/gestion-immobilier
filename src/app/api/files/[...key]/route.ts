import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { readStoredFile, scopeIdFromKey } from '@/lib/storage';

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyParts.join('/');
  const scopeId = scopeIdFromKey(key);
  if (!scopeId) {
    return new NextResponse('Fichier introuvable', { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_scopeId: { userId: session.user.id, scopeId } },
  });
  if (!membership || membership.statut !== 'ACTIF') {
    return new NextResponse('Accès refusé à ce périmètre', { status: 403 });
  }

  try {
    const buffer = await readStoredFile(key);
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('readStoredFile a échoué pour', key, e);
    return new NextResponse('Fichier introuvable', { status: 404 });
  }
}

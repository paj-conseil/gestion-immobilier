import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { list } from '@vercel/blob';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Route de diagnostic temporaire (à supprimer une fois le bug d'affichage des
 * photos résolu) : liste les chemins réellement présents dans le store Blob,
 * en face des clés attendues côté base de données (table BienPhoto), pour
 * repérer un éventuel écart entre les deux.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Non autorisé', { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { blobs } = await list({ prefix: 'photos/', token });

  const photosEnBase = await prisma.bienPhoto.findMany({
    select: { id: true, bienId: true, url: true },
  });

  return NextResponse.json({
    blobReadWriteTokenPresent: !!token,
    blobStoreIdPresent: !!process.env.BLOB_STORE_ID,
    vercelOidcTokenPresent: !!process.env.VERCEL_OIDC_TOKEN,
    blobsDansLeStore: blobs.map((b) => ({ pathname: b.pathname, size: b.size, url: b.url })),
    photosEnBase,
  });
}

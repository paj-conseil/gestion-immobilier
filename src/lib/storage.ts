import 'server-only';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile, readFile as fsReadFile, unlink } from 'node:fs/promises';
import { put, del as blobDel, get as blobGet } from '@vercel/blob';

const STORAGE_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR ?? './storage');

/**
 * Deux backends selon l'environnement :
 * - Vercel Blob quand le code tourne sur Vercel (`process.env.VERCEL`,
 *   toujours défini par la plateforme) — Vercel n'a pas de disque persistant
 *   pour les fonctions serverless, donc le disque local n'y fonctionne
 *   jamais. On ne teste pas la présence de BLOB_READ_WRITE_TOKEN car les
 *   projets connectés en OIDC (le mode par défaut désormais) peuvent
 *   authentifier le SDK sans cette variable précise.
 * - Disque local sinon (dev, plus simple, aucun compte à configurer).
 * Dans les deux cas la "clé" retournée/stockée en base a le même format
 * `<category>/<scopeId>/<uuid>-<nom>` — l'accès passe toujours par
 * /api/files/[...key] qui vérifie le périmètre de l'utilisateur avant de
 * streamer le contenu (les blobs sont en accès `private`, jamais publics).
 */
const useBlob = !!process.env.VERCEL;

export type StorageCategory = 'photos' | 'locataires' | 'generated' | 'edl' | 'compta';

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export async function saveFile(
  buffer: Buffer,
  opts: { scopeId: string; category: StorageCategory; filename: string },
): Promise<string> {
  const key = `${opts.category}/${opts.scopeId}/${randomUUID()}-${sanitize(opts.filename)}`;

  if (useBlob) {
    await put(key, buffer, { access: 'private', addRandomSuffix: false });
    return key;
  }

  const fullPath = path.join(/*turbopackIgnore: true*/ STORAGE_DIR, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  if (useBlob) {
    const result = await blobGet(key, { access: 'private' });
    if (!result || result.statusCode !== 200) throw new Error('Fichier introuvable');
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  const fullPath = resolveSafePath(key);
  return fsReadFile(fullPath);
}

export async function deleteStoredFile(key: string): Promise<void> {
  if (useBlob) {
    await blobDel(key).catch(() => undefined);
    return;
  }

  const fullPath = resolveSafePath(key);
  await unlink(fullPath).catch(() => undefined);
}

/** Empêche toute traversée de répertoire (../..) depuis une clé stockée en base (backend disque uniquement). */
function resolveSafePath(key: string): string {
  const fullPath = path.join(/*turbopackIgnore: true*/ STORAGE_DIR, key);
  const normalizedRoot = path.normalize(STORAGE_DIR + path.sep);
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error('Chemin de fichier invalide');
  }
  return normalizedPath;
}

/** La clé stockée en base commence par "<category>/<scopeId>/..." — utilisé pour vérifier l'accès. */
export function scopeIdFromKey(key: string): string | null {
  const parts = key.split('/');
  return parts.length >= 2 ? parts[1] : null;
}

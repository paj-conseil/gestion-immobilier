import 'server-only';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile, readFile as fsReadFile, unlink } from 'node:fs/promises';

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? './storage');

export type StorageCategory = 'photos' | 'locataires' | 'generated' | 'edl' | 'compta';

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

/**
 * Enregistre un fichier sur disque sous storage/<category>/<scopeId>/<uuid>-<nom>
 * et renvoie la "clé" à stocker en base (jamais un chemin absolu ni une URL
 * publique — l'accès passe toujours par /api/files/[...key] qui vérifie le
 * périmètre de l'utilisateur).
 */
export async function saveFile(
  buffer: Buffer,
  opts: { scopeId: string; category: StorageCategory; filename: string },
): Promise<string> {
  const key = `${opts.category}/${opts.scopeId}/${randomUUID()}-${sanitize(opts.filename)}`;
  const fullPath = path.join(STORAGE_DIR, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const fullPath = resolveSafePath(key);
  return fsReadFile(fullPath);
}

export async function deleteStoredFile(key: string): Promise<void> {
  const fullPath = resolveSafePath(key);
  await unlink(fullPath).catch(() => undefined);
}

/** Empêche toute traversée de répertoire (../..) depuis une clé stockée en base. */
function resolveSafePath(key: string): string {
  const fullPath = path.join(STORAGE_DIR, key);
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

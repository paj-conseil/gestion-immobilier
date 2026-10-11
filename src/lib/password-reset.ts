import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Jetons de réinitialisation de mot de passe, sans table en base.
 *
 * Jeton = base64url("<userId>.<expiration>") + "." + signature HMAC.
 * La signature inclut le hash du mot de passe actuel : dès que le mot de passe
 * change, tous les liens déjà envoyés deviennent invalides (usage unique).
 */

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('NEXTAUTH_SECRET manquant');
  return s;
}

function sign(payload: string, passwordHash: string) {
  return createHmac('sha256', secret()).update(`${payload}.${passwordHash}`).digest('base64url');
}

export function createResetToken(userId: string, passwordHash: string) {
  const payload = `${userId}.${Date.now() + RESET_TOKEN_TTL_MS}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload, passwordHash)}`;
}

/** Lit le jeton sans le vérifier (pour retrouver l'utilisateur). */
export function parseResetToken(token: string): { userId: string; expires: number; payload: string; sig: string } | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const payload = Buffer.from(encoded, 'base64url').toString('utf8');
  const [userId, exp] = payload.split('.');
  const expires = Number(exp);
  if (!userId || !Number.isFinite(expires)) return null;
  return { userId, expires, payload, sig };
}

export function verifyResetToken(token: string, passwordHash: string): boolean {
  const parsed = parseResetToken(token);
  if (!parsed || parsed.expires < Date.now()) return false;
  const expected = Buffer.from(sign(parsed.payload, passwordHash));
  const given = Buffer.from(parsed.sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

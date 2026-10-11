'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { createResetToken, parseResetToken, verifyResetToken } from '@/lib/password-reset';

async function appBaseUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export type ForgotResult = { ok: true } | { ok: false; error: string };

/**
 * Envoie un lien de réinitialisation. Répond toujours « ok » si l'email est bien
 * formé, pour ne pas révéler quels comptes existent.
 */
export async function requestPasswordReset(emailRaw: string): Promise<ForgotResult> {
  const email = emailRaw.toLowerCase().trim();
  if (!email || !email.includes('@')) return { ok: false, error: 'Adresse email invalide.' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: true };

  const token = createResetToken(user.id, user.passwordHash);
  const link = `${await appBaseUrl()}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;

  const res = await sendMail({
    to: user.email,
    subject: 'Gestion immo : réinitialisation de votre mot de passe',
    html: `<p>Bonjour ${user.nom},</p>
<p>Une demande de réinitialisation de mot de passe a été faite pour votre compte Gestion immo.</p>
<p><a href="${link}">Choisir un nouveau mot de passe</a></p>
<p>Ce lien est valable 1 heure et ne peut servir qu'une fois.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : votre mot de passe actuel reste valable.</p>`,
  });

  if (!res.ok) {
    console.error('[reset] envoi impossible :', res.error);
    return { ok: false, error: "L'email n'a pas pu être envoyé. Réessayez dans quelques minutes." };
  }
  return { ok: true };
}

export type ResetResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(token: string, password: string): Promise<ResetResult> {
  if (password.length < 8) return { ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' };

  const parsed = parseResetToken(token);
  const user = parsed ? await prisma.user.findUnique({ where: { id: parsed.userId } }) : null;
  if (!user || !verifyResetToken(token, user.passwordHash)) {
    return { ok: false, error: 'Ce lien est invalide ou a expiré. Faites une nouvelle demande.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true };
}

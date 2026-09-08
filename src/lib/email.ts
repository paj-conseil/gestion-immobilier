import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export type SendMailResult = { ok: true } | { ok: false; error: string };

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<SendMailResult> {
  const t = getTransporter();
  if (!t) {
    console.warn(
      `[email] SMTP non configuré (SMTP_PASSWORD manquant) — email simulé vers ${opts.to} : "${opts.subject}"`,
    );
    return { ok: false, error: 'SMTP non configuré — ajoutez SMTP_PASSWORD dans .env (mot de passe d\'application Yahoo)' };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec de l'envoi" };
  }
}

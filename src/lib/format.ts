import { format, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatMontant(n: number | null | undefined, opts?: { decimals?: boolean }): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: opts?.decimals ? 2 : 0,
    minimumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(n);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return format(new Date(d), 'dd/MM/yyyy', { locale: fr });
}

export function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return format(new Date(d), 'd MMMM yyyy', { locale: fr });
}

/** Valeur pour un <input type="date"> à partir d'une date/ISO string — utilise
 * les composants LOCAUX (getFullYear/getMonth/getDate), pas un slice(0,10)
 * naïf sur l'ISO (qui est en UTC et peut décaler d'un jour selon le fuseau). */
export function toDateInputValue(d?: Date | string | null): string {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function joursRestants(d: Date | string): number {
  return differenceInCalendarDays(new Date(d), new Date());
}

export function bienLabel(b: { adresse: string; complement?: string | null }): string {
  return b.complement ? `${b.adresse} — ${b.complement}` : b.adresse;
}

export function initiales(nom: string, prenom?: string): string {
  const a = prenom?.[0] ?? '';
  const b = nom?.[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIX_A_SEIZE = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];

/** 0-99 en toutes lettres, avec les irrégularités du français (70, 80, 90). */
function deuxChiffresEnLettres(n: number): string {
  if (n < 10) return UNITES[n];
  if (n < 17) return DIX_A_SEIZE[n - 10];
  if (n < 20) return 'dix-' + UNITES[n - 10];
  if (n < 70) {
    const dizaine = Math.floor(n / 10);
    const unite = n % 10;
    const mots = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    if (unite === 0) return mots[dizaine];
    if (unite === 1) return `${mots[dizaine]} et un`;
    return `${mots[dizaine]}-${UNITES[unite]}`;
  }
  if (n < 80) {
    // 70-79 : soixante-dix..soixante-dix-neuf (soixante + 10..19)
    const reste = n - 60;
    if (reste === 11) return 'soixante et onze';
    return 'soixante-' + deuxChiffresEnLettres(reste);
  }
  // 80-99 : quatre-vingt(s)..quatre-vingt-dix-neuf
  const reste = n - 80;
  if (reste === 0) return 'quatre-vingts';
  return 'quatre-vingt-' + deuxChiffresEnLettres(reste);
}

function centaineEnLettres(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const reste = n % 100;
  let out = '';
  if (c > 0) {
    out += c > 1 ? `${UNITES[c]} cent` : 'cent';
    if (c > 1 && reste === 0) out += 's';
    if (reste > 0) out += ' ';
  }
  if (reste > 0) out += deuxChiffresEnLettres(reste);
  return out;
}

/** Nombre entier en toutes lettres (français), utilisé pour les quittances de loyer. */
export function nombreEnLettres(n: number): string {
  const entier = Math.round(n);
  if (entier === 0) return 'zéro';
  let reste = entier;
  const parts: string[] = [];

  const millions = Math.floor(reste / 1_000_000);
  reste %= 1_000_000;
  if (millions > 0) parts.push(`${millions > 1 ? centaineEnLettres(millions) + ' millions' : 'un million'}`);

  const milliers = Math.floor(reste / 1000);
  reste %= 1000;
  if (milliers > 0) parts.push(`${milliers > 1 ? centaineEnLettres(milliers) + ' mille' : 'mille'}`);

  if (reste > 0) parts.push(centaineEnLettres(reste));

  return parts.join(' ').trim();
}

export function montantEnLettres(n: number): string {
  const entier = Math.floor(n);
  const centimes = Math.round((n - entier) * 100);
  const base = `${nombreEnLettres(entier)} euro${entier > 1 ? 's' : ''}`;
  if (centimes === 0) return base;
  return `${base} et ${nombreEnLettres(centimes)} centime${centimes > 1 ? 's' : ''}`;
}

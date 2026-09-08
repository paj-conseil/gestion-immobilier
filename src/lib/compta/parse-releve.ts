import 'server-only';
import Papa from 'papaparse';

export type LigneReleve = { date: Date; libelle: string; montant: number };

function parseMontantFr(raw: string): number | null {
  const cleaned = raw
    .replace(/[€\s]/g, '')
    .replace(/ /g, '')
    .trim();
  if (!cleaned) return null;
  // Format français "1 234,56" -> "1234.56" ; garde le signe -
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const asIs = Number(cleaned.replace(',', '.'));
  const asFr = Number(normalized);
  const n = !Number.isNaN(asFr) && cleaned.includes(',') ? asFr : asIs;
  return Number.isNaN(n) ? null : n;
}

function parseDateFr(raw: string): Date | null {
  const s = raw.trim();
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(year, Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function findColumn(headers: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const found = headers.find((h) => pattern.test(h));
    if (found) return found;
  }
  return undefined;
}

export function parseCsvReleve(content: string): { lignes: LigneReleve[]; ignorees: number } {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: '',
  });
  const rows = result.data;
  if (rows.length === 0) return { lignes: [], ignorees: 0 };

  const headers = Object.keys(rows[0]).map((h) => h.trim());
  const headersLower = headers.map((h) => h.toLowerCase());
  const findIn = (patterns: RegExp[]) => {
    const idx = findColumn(headersLower, patterns);
    return idx ? headers[headersLower.indexOf(idx)] : undefined;
  };

  const colDate = findIn([/date.*op[ée]ration/, /date.*valeur/, /^date$/, /date/]);
  const colLibelle = findIn([/libell[ée]/, /description/, /nature/, /intitul[ée]/, /communication/]);
  const colMontant = findIn([/^montant$/, /amount/, /montant/]);
  const colDebit = findIn([/d[ée]bit/]);
  const colCredit = findIn([/cr[ée]dit/]);

  const lignes: LigneReleve[] = [];
  let ignorees = 0;

  for (const row of rows) {
    const dateRaw = colDate ? row[colDate] : undefined;
    const libelleRaw = colLibelle ? row[colLibelle] : Object.values(row).join(' ');
    let montant: number | null = null;

    if (colMontant && row[colMontant]) {
      montant = parseMontantFr(row[colMontant]);
    } else if (colDebit || colCredit) {
      const debit = colDebit && row[colDebit] ? parseMontantFr(row[colDebit]) : null;
      const credit = colCredit && row[colCredit] ? parseMontantFr(row[colCredit]) : null;
      if (credit) montant = Math.abs(credit);
      else if (debit) montant = -Math.abs(debit);
    }

    const date = dateRaw ? parseDateFr(dateRaw) : null;

    if (!date || montant === null || !libelleRaw) {
      ignorees++;
      continue;
    }
    lignes.push({ date, libelle: libelleRaw.trim(), montant });
  }

  return { lignes, ignorees };
}

/** Extraction heuristique depuis le texte d'un relevé PDF : une ligne par
 * transaction au format approximatif "JJ/MM/AAAA libellé ... montant". Les
 * lignes qui ne correspondent pas au motif sont ignorées (comptées) — le
 * relevé PDF étant peu structuré, une relecture manuelle reste recommandée.
 */
export function parsePdfText(text: string): { lignes: LigneReleve[]; ignorees: number } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lignes: LigneReleve[] = [];
  let ignorees = 0;

  const ligneRegex = /^(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})\s+(.+?)\s+(-?[\d\s]+[.,]\d{2})\s*€?$/;

  for (const line of lines) {
    const m = line.match(ligneRegex);
    if (!m) {
      continue;
    }
    const date = parseDateFr(m[1]);
    const montant = parseMontantFr(m[3]);
    if (!date || montant === null) {
      ignorees++;
      continue;
    }
    lignes.push({ date, libelle: m[2].trim(), montant });
  }

  return { lignes, ignorees };
}

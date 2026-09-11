import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: '48 50',
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#1C241E',
    lineHeight: 1.45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
    paddingBottom: 14,
    borderBottom: '1.5 solid #1E5631',
  },
  brand: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0F3D24',
  },
  brandSub: {
    fontSize: 8.5,
    color: '#5B665C',
    marginTop: 2,
  },
  docTitleBox: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0F3D24',
    textTransform: 'uppercase',
  },
  docSub: {
    fontSize: 9,
    color: '#5B665C',
    marginTop: 2,
  },
  h2: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0F3D24',
    marginTop: 16,
    marginBottom: 8,
  },
  p: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  small: {
    fontSize: 8.5,
    color: '#5B665C',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col: {
    flex: 1,
  },
  box: {
    border: '0.75 solid #DEE3DA',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  boxLabel: {
    fontSize: 8,
    color: '#5B665C',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  boxValue: {
    fontSize: 10.5,
  },
  table: {
    marginTop: 4,
    marginBottom: 4,
  },
  tr: {
    flexDirection: 'row',
    borderBottom: '0.5 solid #DEE3DA',
    paddingVertical: 5,
  },
  th: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#5B665C',
  },
  td: {
    flex: 1,
    fontSize: 10,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLine: {
    marginTop: 44,
    borderTop: '0.75 solid #1C241E',
    paddingTop: 4,
    fontSize: 8.5,
    color: '#5B665C',
  },
  signatureImg: {
    height: 46,
    maxWidth: '100%',
    marginTop: 8,
    objectFit: 'contain',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 50,
    right: 50,
    fontSize: 7.5,
    color: '#9AA59B',
    borderTop: '0.5 solid #DEE3DA',
    paddingTop: 6,
    textAlign: 'center',
  },
  legal: {
    fontSize: 8,
    color: '#5B665C',
    marginTop: 16,
  },
});

// Coordonnées du bailleur : lues depuis les variables d'environnement (voir
// .env.example) plutôt que codées en dur, pour ne jamais faire apparaître de
// données bancaires réelles dans le code source (dépôt Git notamment).
export const PROPRIETAIRE = {
  nom: process.env.BAILLEUR_NOM ?? 'Bailleur',
  emailContact: process.env.SMTP_USER ?? '',
};

export const RIB = {
  titulaire: process.env.BAILLEUR_RIB_TITULAIRE ?? '',
  adresse: process.env.BAILLEUR_RIB_ADRESSE ?? '',
  iban: process.env.BAILLEUR_RIB_IBAN ?? '',
  bic: process.env.BAILLEUR_RIB_BIC ?? '',
  domiciliation: process.env.BAILLEUR_RIB_DOMICILIATION ?? '',
};

/**
 * Formatage monétaire pour les PDF : `Intl.NumberFormat('fr-FR', ...)` insère
 * une espace fine insécable (U+202F) comme séparateur de milliers, glyphe
 * absent des polices de base (Helvetica/WinAnsi) utilisées par react-pdf —
 * elle s'affichait comme "/". On formate donc ici à la main avec une espace
 * normale.
 */
export function formatMontantPdf(n: number | null | undefined, opts?: { decimals?: boolean }): string {
  if (n === null || n === undefined) return '—';
  const decimals = opts?.decimals ?? false;
  const sign = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(decimals ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${withSeparators}${decPart ? ',' + decPart : ''} €`;
}

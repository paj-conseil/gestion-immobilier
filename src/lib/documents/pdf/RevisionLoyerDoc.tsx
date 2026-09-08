import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE, formatMontantPdf } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate } from '@/lib/format';

export type RevisionLoyerData = {
  locatairesNoms: string;
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  loyerActuel: number;
  indiceReference: string;
  indiceRefValeur: number;
  indiceNouveauValeur: number;
  dateEffet: Date;
  dateEmission: Date;
};

export function RevisionLoyerDoc({ data }: { data: RevisionLoyerData }) {
  const nouveauLoyer = Math.round((data.loyerActuel * (data.indiceNouveauValeur / data.indiceRefValeur)) * 100) / 100;
  const adresseComplete = [data.bienAdresse, [data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader title="Révision de loyer" sub={`Prise d'effet le ${formatDate(data.dateEffet)}`} />

        <Text style={styles.p}>
          Madame, Monsieur {data.locatairesNoms},
        </Text>
        <Text style={styles.p}>
          Conformément à la clause de révision prévue à votre contrat de location du logement situé{' '}
          {adresseComplete}, et en application de l&apos;indice de référence des loyers ({data.indiceReference})
          publié par l&apos;INSEE, le loyer mensuel hors charges de votre logement est révisé comme suit à compter
          du {formatDate(data.dateEffet)}.
        </Text>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.th}>Loyer actuel (hors charges)</Text>
            <Text style={[styles.td, { textAlign: 'right' }]}>{formatMontantPdf(data.loyerActuel, { decimals: true })}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.th}>Indice de référence (base)</Text>
            <Text style={[styles.td, { textAlign: 'right' }]}>{data.indiceRefValeur}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.th}>Nouvel indice publié</Text>
            <Text style={[styles.td, { textAlign: 'right' }]}>{data.indiceNouveauValeur}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.bold]}>Nouveau loyer hors charges</Text>
            <Text style={[styles.td, styles.bold, { textAlign: 'right' }]}>{formatMontantPdf(nouveauLoyer, { decimals: true })}</Text>
          </View>
        </View>

        <Text style={styles.p}>
          Calcul : loyer actuel × (nouvel indice / indice de référence) = {formatMontantPdf(data.loyerActuel, { decimals: true })} ×
          ({data.indiceNouveauValeur} / {data.indiceRefValeur}) = {formatMontantPdf(nouveauLoyer, { decimals: true })}.
        </Text>

        <Text style={styles.p}>
          Je vous prie de bien vouloir tenir compte de ce nouveau montant pour vos prochains règlements. N&apos;hésitez
          pas à me contacter pour toute question.
        </Text>

        <Text style={[styles.p, { marginTop: 20 }]}>Fait à Tours, le {formatDate(data.dateEmission)}</Text>
        <Text style={styles.signatureLine}>{PROPRIETAIRE.nom}</Text>

        <DocFooter text="Gestion immo — document généré automatiquement" />
      </Page>
    </Document>
  );
}

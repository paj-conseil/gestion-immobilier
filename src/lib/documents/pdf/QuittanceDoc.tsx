import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE, formatMontantPdf } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate, montantEnLettres } from '@/lib/format';

export type QuittanceData = {
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  locatairesNoms: string;
  loyerHC: number;
  charges: number;
  periodeDebut: Date;
  periodeFin: Date;
  dateEmission: Date;
  lieuEmission?: string;
};

export function QuittanceDoc({ data }: { data: QuittanceData }) {
  const total = data.loyerHC + data.charges;
  const adresseComplete = [data.bienAdresse, [data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' — ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader
          title="Quittance de loyer"
          sub={`Période du ${formatDate(data.periodeDebut)} au ${formatDate(data.periodeFin)}`}
        />

        <View style={styles.box}>
          <Text style={styles.boxLabel}>Logement</Text>
          <Text style={styles.boxValue}>{adresseComplete}</Text>
        </View>

        <Text style={styles.p}>
          Je soussigné {PROPRIETAIRE.nom}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de{' '}
          {data.locatairesNoms} la somme de {montantEnLettres(total).toUpperCase()} ({formatMontantPdf(total, { decimals: true })}
          ) au titre du paiement du loyer et des charges pour la période de location citée en objet et lui en
          donne quittance, sous réserve de tous mes droits.
        </Text>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.th}>Loyer hors charges</Text>
            <Text style={[styles.td, { textAlign: 'right' }]}>{formatMontantPdf(data.loyerHC, { decimals: true })}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.th}>Charges</Text>
            <Text style={[styles.td, { textAlign: 'right' }]}>{formatMontantPdf(data.charges, { decimals: true })}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.bold]}>Total réglé</Text>
            <Text style={[styles.td, styles.bold, { textAlign: 'right' }]}>{formatMontantPdf(total, { decimals: true })}</Text>
          </View>
        </View>

        <Text style={[styles.p, { marginTop: 24 }]}>
          Fait à {data.lieuEmission ?? 'Tours'}, le {formatDate(data.dateEmission)}
        </Text>

        <Text style={styles.legal}>
          Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas de paiement
          partiel du montant du présent terme. Elle est à conserver pendant trois ans par le locataire (article
          7-1 de la loi n° 89-462 du 6 juillet 1989).
        </Text>

        <DocFooter text="Gestion immo — document généré automatiquement" />
      </Page>
    </Document>
  );
}

import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE, RIB, formatMontantPdf } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate, montantEnLettres } from '@/lib/format';

export type DepotGarantieData = {
  locatairesNoms: string;
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  montant: number;
  loyerHC?: number | null;
  dateVersement: Date;
};

export function DepotGarantieDoc({ data }: { data: DepotGarantieData }) {
  const adresseComplete = [data.bienAdresse, [data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' - ');
  const moisDepot = data.loyerHC ? Math.round((data.montant / data.loyerHC) * 10) / 10 : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader title="Reçu dépôt de garantie" />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={styles.bold}>{PROPRIETAIRE.nom}</Text>
            <Text>{RIB.adresse}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.bold}>{data.locatairesNoms}</Text>
            <Text>{data.bienAdresse}</Text>
            <Text>{[data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')}</Text>
          </View>
        </View>

        <Text style={styles.p}>
          Je soussigné {PROPRIETAIRE.nom}, bailleur du bien situé au {adresseComplete}, déclare sur l&apos;honneur
          avoir reçu ce jour la somme de {montantEnLettres(data.montant)} ({formatMontantPdf(data.montant, { decimals: true })}) de
          la part de <Text style={styles.bold}>{data.locatairesNoms}</Text> au titre de dépôt de garantie
          {moisDepot ? ` correspondant à ${moisDepot} mois de loyer hors charges.` : '.'}
        </Text>

        <Text style={styles.p}>
          Ce dépôt de garantie sera conservé par le propriétaire pendant toute la durée de la location. Il sera
          alors restitué sous deux mois suivant l&apos;état des lieux de sortie.
        </Text>

        <Text style={styles.p}>
          À noter que celui-ci pourra être réduit d&apos;éventuels impayés et frais de remise en état selon la
          législation en vigueur.
        </Text>

        <Text style={styles.p}>Je vous prie d&apos;agréer, Madame, Monsieur, l&apos;expression de mes salutations distinguées.</Text>

        <Text style={[styles.p, { marginTop: 24 }]}>Fait à Tours, le {formatDate(data.dateVersement)}</Text>

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le bailleur</Text>
            <Text style={styles.signatureLine}>{PROPRIETAIRE.nom}</Text>
          </View>
        </View>

        <DocFooter text="Pilotage locatif — document généré automatiquement" />
      </Page>
    </Document>
  );
}

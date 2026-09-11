import { Document, Page, Text, Image } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE, RIB, formatMontantPdf } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate, montantEnLettres } from '@/lib/format';

export type CautionnementData = {
  garantNom: string;
  garantDateNaissance?: string | null;
  garantLieuNaissance?: string | null;
  garantAdresse: string;
  locatairesNoms: string;
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  loyerHC: number;
  charges: number;
  dateDebut: Date;
  dateEmission: Date;
  /** Signature manuscrite du garant, capturée à l'écran (data URI PNG). */
  signatureGarant?: string | null;
};

export function CautionnementDoc({ data }: { data: CautionnementData }) {
  const total = data.loyerHC + data.charges;
  const adresseComplete = [data.bienAdresse, [data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' - ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader title="Acte de cautionnement" sub={`Bail du ${formatDate(data.dateDebut)}`} />

        <Text style={styles.p}>Monsieur,</Text>

        <Text style={styles.p}>
          Je soussigné <Text style={styles.bold}>{data.garantNom}</Text>
          {data.garantDateNaissance ? `, né(e) le ${data.garantDateNaissance}` : ''}
          {data.garantLieuNaissance ? ` à ${data.garantLieuNaissance}` : ''}, résidant à l&apos;adresse suivante :{' '}
          {data.garantAdresse},
        </Text>
        <Text style={styles.p}>
          déclare me porter caution solidaire de <Text style={styles.bold}>{data.locatairesNoms}</Text> pour les
          obligations résultant du bail qui lui a été consenti par le bailleur {PROPRIETAIRE.nom}, demeurant au{' '}
          {RIB.adresse}, pour la location du logement situé {adresseComplete}.
        </Text>

        <Text style={styles.p}>
          J&apos;ai pris connaissance du montant du loyer de {formatMontantPdf(total, { decimals: true })} (
          {montantEnLettres(total)}) par mois. Il sera révisé annuellement à la date anniversaire du contrat selon
          la variation de l&apos;indice de référence des loyers publié par l&apos;INSEE d&apos;une année sur
          l&apos;autre.
        </Text>

        <Text style={styles.p}>
          Cet engagement pour une caution solidaire est valable pour une durée indéterminée pour le paiement
          notamment des loyers, des indemnités d&apos;occupation, des charges, des réparations et dégradations
          locatives, des impôts et taxes et tous frais éventuels de procédure dus en vertu de ce bail.
        </Text>

        <Text style={styles.p}>
          Je reconnais également avoir pris connaissance de l&apos;avant-dernier alinéa de l&apos;article 22-1 de
          la loi du 6 juillet 1989 : « Lorsque le cautionnement d&apos;obligations résultant d&apos;un contrat de
          location conclu en application du présent titre ne comporte aucune indication de durée ou lorsque la
          durée du cautionnement est stipulée indéterminée, la caution peut le résilier unilatéralement. La
          résiliation prend effet au terme du contrat de location, qu&apos;il s&apos;agisse du contrat initial ou
          d&apos;un contrat reconduit ou renouvelé au cours duquel le bailleur reçoit notification de la
          résiliation. »
        </Text>

        <Text style={[styles.p, { marginTop: 20 }]}>Fait à Tours, le {formatDate(data.dateEmission)}</Text>
        <Text style={[styles.small, { marginTop: data.signatureGarant ? 10 : 30 }]}>Signature</Text>
        {data.signatureGarant && <Image src={data.signatureGarant} style={styles.signatureImg} />}

        <DocFooter text="Gestion immo — document généré automatiquement, à faire relire avant signature" />
      </Page>
    </Document>
  );
}

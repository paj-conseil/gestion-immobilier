import { Document, Page, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import { DocHeader, DocFooter } from './Header';
import { TexteLibre, SignatureBlock } from './Fragments';
import { formatDate } from '@/lib/format';

export type QuittanceData = {
  locatairesNoms: string;
  periodeDebut: Date;
  periodeFin: Date;
  dateEmission: Date;
  lieuEmission?: string;
  /** Corps entier du document (voir DocumentTypeParametre.texteDocument). */
  texteDocument: string;
  /** Signature manuscrite du locataire, capturée à l'écran (data URI PNG). */
  signatureLocataire?: string | null;
  signatureProprietaire?: string | null;
  nomAffichage?: string | null;
  signataireLocataireRequis?: boolean;
  signataireProprietaireRequis?: boolean;
};

export function QuittanceDoc({ data }: { data: QuittanceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader
          title={data.nomAffichage || 'Quittance de loyer'}
          sub={`Période du ${formatDate(data.periodeDebut)} au ${formatDate(data.periodeFin)}`}
        />

        <TexteLibre texte={data.texteDocument} />

        <Text style={[styles.p, { marginTop: 24 }]}>
          Fait à {data.lieuEmission ?? 'Tours'}, le {formatDate(data.dateEmission)}
        </Text>

        <SignatureBlock
          libelleSignataire="Le locataire"
          nomSignataire={data.locatairesNoms}
          signature={data.signatureLocataire}
          requisSignataire={data.signataireLocataireRequis ?? true}
          requisProprietaire={data.signataireProprietaireRequis ?? false}
          signatureProprietaire={data.signatureProprietaire}
        />

        <DocFooter text="Gestion immo — document généré automatiquement" />
      </Page>
    </Document>
  );
}

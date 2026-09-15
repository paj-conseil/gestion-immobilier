import { Document, Page, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import { DocHeader, DocFooter } from './Header';
import { TexteLibre, SignatureBlock } from './Fragments';
import { formatDate } from '@/lib/format';

export type CautionnementData = {
  garantNom: string;
  dateDebut: Date;
  dateEmission: Date;
  /** Corps entier du document (voir DocumentTypeParametre.texteDocument). */
  texteDocument: string;
  /** Signature manuscrite du garant, capturée à l'écran (data URI PNG). */
  signatureGarant?: string | null;
  signatureProprietaire?: string | null;
  nomAffichage?: string | null;
  signataireLocataireRequis?: boolean;
  signataireProprietaireRequis?: boolean;
};

export function CautionnementDoc({ data }: { data: CautionnementData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader title={data.nomAffichage || 'Acte de cautionnement'} sub={`Bail du ${formatDate(data.dateDebut)}`} />

        <TexteLibre texte={data.texteDocument} />

        <Text style={[styles.p, { marginTop: 20 }]}>Fait à Tours, le {formatDate(data.dateEmission)}</Text>

        <SignatureBlock
          libelleSignataire="La caution"
          nomSignataire={data.garantNom}
          signature={data.signatureGarant}
          requisSignataire={data.signataireLocataireRequis ?? true}
          requisProprietaire={data.signataireProprietaireRequis ?? false}
          signatureProprietaire={data.signatureProprietaire}
        />

        <DocFooter text="Gestion immo — document généré automatiquement, à faire relire avant signature" />
      </Page>
    </Document>
  );
}

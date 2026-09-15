import { Document, Page, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import { DocHeader, DocFooter } from './Header';
import { TexteLibre, SignatureBlock } from './Fragments';
import { formatDate } from '@/lib/format';

export type RevisionLoyerData = {
  locatairesNoms: string;
  dateEffet: Date;
  dateEmission: Date;
  /** Corps entier du document (voir DocumentTypeParametre.texteDocument). */
  texteDocument: string;
  /** Signature manuscrite du locataire, capturée à l'écran (data URI PNG). */
  signatureLocataire?: string | null;
  signatureProprietaire?: string | null;
  nomAffichage?: string | null;
  signataireLocataireRequis?: boolean;
  signataireProprietaireRequis?: boolean;
};

export function RevisionLoyerDoc({ data }: { data: RevisionLoyerData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocHeader title={data.nomAffichage || 'Révision de loyer'} sub={`Prise d'effet le ${formatDate(data.dateEffet)}`} />

        <TexteLibre texte={data.texteDocument} />

        <Text style={[styles.p, { marginTop: 20 }]}>Fait à Tours, le {formatDate(data.dateEmission)}</Text>

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

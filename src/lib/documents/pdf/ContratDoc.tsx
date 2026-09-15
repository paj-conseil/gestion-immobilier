import { Document, Page, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import { DocHeader, DocFooter } from './Header';
import { TexteLibre, SignatureBlock } from './Fragments';
import { formatDate } from '@/lib/format';

export type ContratData = {
  /** Adresse affichée en sous-titre du document. */
  bienAdresse: string;
  locatairesNoms: string;
  dateEmission: Date;
  /** Corps entier du document (voir DocumentTypeParametre.texteDocument). */
  texteDocument: string;
  /** Signature manuscrite du/des locataire(s), capturée à l'écran (data URI PNG). */
  signatureLocataire?: string | null;
  signatureProprietaire?: string | null;
  nomAffichage?: string | null;
  signataireLocataireRequis?: boolean;
  signataireProprietaireRequis?: boolean;
};

export function ContratDoc({ data }: { data: ContratData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <DocHeader title={data.nomAffichage || 'Contrat de location meublée'} sub={data.bienAdresse} />

        <TexteLibre texte={data.texteDocument} />

        <Text style={[styles.p, { marginTop: 10 }]}>Fait à Tours, le {formatDate(data.dateEmission)}</Text>

        <SignatureBlock
          libelleSignataire="Le(s) locataire(s)"
          nomSignataire={data.locatairesNoms}
          signature={data.signatureLocataire}
          requisSignataire={data.signataireLocataireRequis ?? true}
          requisProprietaire={data.signataireProprietaireRequis ?? false}
          signatureProprietaire={data.signatureProprietaire}
        />

        <DocFooter text="Gestion immo — document généré automatiquement, à faire relire avant signature" />
      </Page>
    </Document>
  );
}

import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate } from '@/lib/format';

export type EDLItemData = {
  label: string;
  etat: 'BON' | 'USURE' | 'MAUVAIS';
  commentaire?: string | null;
  photoDataUri?: string | null;
};
export type EDLPieceData = { nom: string; items: EDLItemData[] };
export type EtatLieuxData = {
  type: 'ENTREE' | 'SORTIE';
  date: Date;
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  locatairesNoms: string;
  numeroCompteur?: string | null;
  pieces: EDLPieceData[];
};

const ETAT_LABEL: Record<string, string> = { BON: 'Bon état', USURE: 'Usure normale', MAUVAIS: 'Mauvais état' };

export function EtatLieuxDoc({ data }: { data: EtatLieuxData }) {
  const adresseComplete = [data.bienAdresse, [data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <DocHeader
          title={`État des lieux — ${data.type === 'ENTREE' ? "d'entrée" : 'de sortie'}`}
          sub={formatDate(data.date)}
        />

        <View style={styles.box}>
          <Text style={styles.boxLabel}>Logement</Text>
          <Text style={styles.boxValue}>{adresseComplete}</Text>
          <Text style={[styles.small, { marginTop: 6 }]}>Locataire(s) : {data.locatairesNoms}</Text>
          {data.numeroCompteur && <Text style={styles.small}>N° compteur électrique : {data.numeroCompteur}</Text>}
        </View>

        {data.pieces.map((piece) => (
          <View key={piece.nom} wrap={false} style={{ marginBottom: 12 }}>
            <Text style={styles.h2}>{piece.nom}</Text>
            {piece.items.map((item, i) => (
              <View key={i} style={styles.tr}>
                <Text style={styles.td}>{item.label}</Text>
                <Text style={[styles.td, { flex: 0.6 }]}>{ETAT_LABEL[item.etat]}</Text>
                {item.commentaire ? <Text style={[styles.small, { flex: 1 }]}>{item.commentaire}</Text> : <View style={{ flex: 1 }} />}
                {item.photoDataUri && <Image src={item.photoDataUri} style={{ width: 50, height: 50, borderRadius: 3 }} />}
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.legal}>
          Le présent état des lieux, établi contradictoirement entre les parties, fait foi jusqu&apos;à preuve du
          contraire. Il est établi conformément à l&apos;article 3-2 de la loi n° 89-462 du 6 juillet 1989 et au
          décret n° 2016-382 du 30 mars 2016.
        </Text>

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le bailleur</Text>
            <Text style={styles.signatureLine}>{PROPRIETAIRE.nom}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le(s) locataire(s)</Text>
            <Text style={styles.signatureLine}>{data.locatairesNoms}</Text>
          </View>
        </View>

        <DocFooter text="Pilotage locatif — document généré automatiquement" />
      </Page>
    </Document>
  );
}

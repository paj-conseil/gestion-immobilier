import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate } from '@/lib/format';

/** Photo prête pour le PDF : orientation déjà appliquée, taille finale en points. */
export type EdlPhotoData = { src: string; width: number; height: number };

export type EDLItemData = {
  label: string;
  type: 'ETAT' | 'QUANTITE';
  etat: 'BON' | 'USURE' | 'MAUVAIS' | null;
  quantite?: number | null;
  commentaire?: string | null;
  /** Photos de l'élément, en data URI (voir generateEtatDesLieuxPdf). */
  photos: EdlPhotoData[];
};
export type EDLPieceData = { nom: string; items: EDLItemData[]; photos: EdlPhotoData[] };
export type EtatLieuxData = {
  type: 'ENTREE' | 'SORTIE';
  date: Date;
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  locatairesNoms: string;
  numeroCompteur?: string | null;
  pieces: EDLPieceData[];
  /** Photos non rattachées à une pièce ou un élément précis. */
  photosGenerales: EdlPhotoData[];
  signatureBailleur?: string | null;
  signatureLocataire?: string | null;
};

function PhotoRow({ photos }: { photos: EdlPhotoData[] }) {
  if (photos.length === 0) return null;
  return (
    <View style={styles.edlPhotoRow}>
      {photos.map((p, i) => (
        <Image key={i} src={p.src} style={[styles.edlPhoto, { width: p.width, height: p.height }]} />
      ))}
    </View>
  );
}

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
          <View key={piece.nom} style={{ marginBottom: 12 }}>
            <Text style={styles.h2}>{piece.nom}</Text>
            <PhotoRow photos={piece.photos} />
            {piece.items.map((item, i) => (
              <View key={i} wrap={false} style={{ marginBottom: item.photos.length > 0 ? 8 : 0 }}>
                <View style={styles.tr}>
                  <Text style={styles.td}>{item.label}</Text>
                  <Text style={[styles.td, { flex: 0.6 }]}>
                    {item.type === 'QUANTITE'
                      ? `Quantité : ${item.quantite ?? 0}`
                      : item.etat
                        ? ETAT_LABEL[item.etat]
                        : 'Non évalué'}
                  </Text>
                  {item.commentaire ? <Text style={[styles.small, { flex: 1 }]}>{item.commentaire}</Text> : <View style={{ flex: 1 }} />}
                </View>
                <PhotoRow photos={item.photos} />
              </View>
            ))}
          </View>
        ))}

        {data.photosGenerales.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.h2}>Photos générales</Text>
            <PhotoRow photos={data.photosGenerales} />
          </View>
        )}

        <Text style={styles.legal}>
          Le présent état des lieux, établi contradictoirement entre les parties, fait foi jusqu&apos;à preuve du
          contraire. Il est établi conformément à l&apos;article 3-2 de la loi n° 89-462 du 6 juillet 1989 et au
          décret n° 2016-382 du 30 mars 2016.
        </Text>

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le bailleur</Text>
            {data.signatureBailleur && <Image src={data.signatureBailleur} style={styles.signatureImg} />}
            <Text style={[styles.signatureLine, data.signatureBailleur ? { marginTop: 4 } : {}]}>
              {PROPRIETAIRE.nom}
            </Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le(s) locataire(s)</Text>
            {data.signatureLocataire && <Image src={data.signatureLocataire} style={styles.signatureImg} />}
            <Text style={[styles.signatureLine, data.signatureLocataire ? { marginTop: 4 } : {}]}>
              {data.locatairesNoms}
            </Text>
          </View>
        </View>

        <DocFooter text="Gestion immo — document généré automatiquement" />
      </Page>
    </Document>
  );
}

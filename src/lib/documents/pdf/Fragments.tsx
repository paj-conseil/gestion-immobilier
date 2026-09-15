import { Text, View, Image } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE } from './styles';
import { SAUT_DE_PAGE } from './text-template';

export { SAUT_DE_PAGE };

/**
 * Rend le texte (éditable depuis le paramétrage) d'un document : chaque
 * ligne devient un paragraphe, une ligne commençant par "## " devient un
 * titre de section, et [SAUT_DE_PAGE] seul sur une ligne force un saut de
 * page à cet endroit.
 */
export function TexteLibre({ texte }: { texte?: string | null }) {
  if (!texte) return null;
  const blocs = texte.split(SAUT_DE_PAGE);
  return (
    <>
      {blocs.map((bloc, i) => (
        <View key={i} break={i > 0}>
          {bloc.split('\n').map((ligne, j) => {
            const t = ligne.trim();
            if (!t) return null;
            if (t.startsWith('## ')) {
              return (
                <Text key={j} style={styles.h2}>
                  {t.slice(3).trim()}
                </Text>
              );
            }
            return (
              <Text key={j} style={styles.p}>
                {t}
              </Text>
            );
          })}
        </View>
      ))}
    </>
  );
}

/**
 * Encart de signature(s), avec incrustation d'image le cas échéant. Les deux
 * colonnes (signataire principal — locataire ou garant — et propriétaire)
 * sont affichées selon le paramétrage du type de document (voir
 * DocumentTypeParametre.signataireLocataire / signataireProprietaire).
 */
export function SignatureBlock({
  libelleSignataire,
  nomSignataire,
  signature,
  requisSignataire = true,
  requisProprietaire = false,
  signatureProprietaire,
}: {
  libelleSignataire: string;
  nomSignataire: string;
  signature?: string | null;
  requisSignataire?: boolean;
  requisProprietaire?: boolean;
  signatureProprietaire?: string | null;
}) {
  if (!requisSignataire && !requisProprietaire) return null;
  return (
    <View style={styles.signatures}>
      {requisSignataire && (
        <View style={styles.signatureBlock}>
          <Text style={styles.small}>{libelleSignataire}</Text>
          {signature && <Image src={signature} style={styles.signatureImg} />}
          <Text style={[styles.signatureLine, signature ? { marginTop: 4 } : {}]}>{nomSignataire}</Text>
        </View>
      )}
      {requisProprietaire && (
        <View style={styles.signatureBlock}>
          <Text style={styles.small}>Le propriétaire</Text>
          {signatureProprietaire && <Image src={signatureProprietaire} style={styles.signatureImg} />}
          <Text style={[styles.signatureLine, signatureProprietaire ? { marginTop: 4 } : {}]}>{PROPRIETAIRE.nom}</Text>
        </View>
      )}
    </View>
  );
}

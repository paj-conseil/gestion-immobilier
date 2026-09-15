import { Text, View, Image } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE } from './styles';

/** Marqueur que l'utilisateur peut insérer dans un bloc de texte éditable
 * (paramétrage d'un type de document) pour forcer un saut de page. */
export const SAUT_DE_PAGE = '[SAUT_DE_PAGE]';

/** Rend un bloc de texte libre paramétré par l'utilisateur (intro ou clauses
 * additionnelles), en respectant les sauts de page manuels. */
export function TexteLibre({ texte }: { texte?: string | null }) {
  if (!texte) return null;
  const blocs = texte.split(SAUT_DE_PAGE);
  return (
    <>
      {blocs.map((bloc, i) => {
        const t = bloc.trim();
        if (!t) return null;
        return (
          <Text key={i} break={i > 0} style={styles.p}>
            {t}
          </Text>
        );
      })}
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

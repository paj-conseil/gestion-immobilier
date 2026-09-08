import { Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE } from './styles';

export function DocHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.brand}>Gestion immo</Text>
        <Text style={styles.brandSub}>{PROPRIETAIRE.nom} · {PROPRIETAIRE.emailContact}</Text>
      </View>
      <View style={styles.docTitleBox}>
        <Text style={styles.docTitle}>{title}</Text>
        {sub && <Text style={styles.docSub}>{sub}</Text>}
      </View>
    </View>
  );
}

export function DocFooter({ text }: { text: string }) {
  return (
    <Text style={styles.footer} fixed>
      {text}
    </Text>
  );
}

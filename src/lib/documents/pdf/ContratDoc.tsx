import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles, PROPRIETAIRE, RIB, formatMontantPdf } from './styles';
import { DocHeader, DocFooter } from './Header';
import { formatDate } from '@/lib/format';

export type ContratData = {
  bienAdresse: string;
  bienCodePostal?: string | null;
  bienVille?: string | null;
  bienSurface?: number | null;
  bienType: string;
  bienDescription?: string | null;
  bienNumeroCompteur?: string | null;
  bienTelephone?: string | null;
  locatairesNoms: string;
  loyerHC: number;
  charges: number;
  depotGarantie?: number | null;
  dateDebut: Date;
  dateFin?: Date | null;
  indiceIRLReference?: string | null;
  dateEmission: Date;
  garant?: { nom: string; adresse: string; nationalite?: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  APPARTEMENT: 'appartement',
  STUDIO: 'studio',
  MAISON: 'maison',
  FOYER: 'logement en résidence',
  AUTRE: 'logement',
};

function Article({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.h2}>{titre}</Text>
      {children}
    </>
  );
}

function Numero({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8 }} wrap={false}>
      <Text style={{ width: 16 }}>{n}.</Text>
      <Text style={{ flex: 1, textAlign: 'justify' }}>{children}</Text>
    </View>
  );
}

export function ContratDoc({ data }: { data: ContratData }) {
  const adresseComplete = [data.bienAdresse, [data.bienCodePostal, data.bienVille].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const dateFin = data.dateFin ?? new Date(data.dateDebut.getFullYear() + 1, data.dateDebut.getMonth(), data.dateDebut.getDate());
  const totalMensuel = data.loyerHC + data.charges;
  const moisDepot =
    data.depotGarantie && data.loyerHC ? Math.round((data.depotGarantie / data.loyerHC) * 10) / 10 : null;

  // Le texte de "Composition" / "Contenu du bien" est stocké avec des puces "- "
  // dans la description du bien (voir mise à jour des fiches biens).
  const [composition, contenu] = (data.bienDescription ?? '').split('Contenu du bien :');

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <DocHeader title="Contrat de location meublée" sub={adresseComplete} />

        <Text style={styles.h2}>Entre les soussignés</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>Monsieur et Madame {PROPRIETAIRE.nom.toUpperCase()}</Text>, demeurant au{' '}
          {RIB.adresse}, propriétaires du bien d&apos;habitation situé au {adresseComplete}, ci-après
          dénommés LE BAILLEUR,
        </Text>
        <Text style={styles.p}>ET</Text>
        <Text style={styles.p}>
          <Text style={styles.bold}>{data.locatairesNoms.toUpperCase()}</Text>, demeurant au {adresseComplete},
          ci-après dénommé(s) LE LOCATAIRE.
        </Text>
        <Text style={[styles.small, { marginBottom: 10 }]}>Date : {formatDate(data.dateEmission)}</Text>

        <Text style={styles.p}>
          Il a été convenu ce qui suit : le présent contrat est soumis aux dispositions de la loi n°89-462 du 6
          juillet 1989 tendant à améliorer les rapports locatifs, notamment ses articles 25-3 et suivants relatifs
          à la location meublée, ainsi qu&apos;aux dispositions du Code civil, et notamment les articles 1709 et
          suivants.
        </Text>

        {composition && (
          <>
            <Text style={styles.h2}>Le bien loué est composé de</Text>
            <Text style={styles.p}>{composition.replace('Composition :', '').trim()}</Text>
          </>
        )}
        {contenu && (
          <>
            <Text style={styles.h2}>
              Le bien dispose de tous les équipements de confort prévus dans le cadre d&apos;un logement meublé
            </Text>
            <Text style={styles.p}>{contenu.trim()}</Text>
          </>
        )}

        <Article titre="Informations utiles">
          <Text style={styles.p}>
            Numéro de compteur électrique (pour mise en place abonnement EDF) :{' '}
            <Text style={styles.bold}>{data.bienNumeroCompteur || '—'}</Text>
          </Text>
          <Text style={styles.p}>
            Numéro de téléphone (pour abonnement internet) :{' '}
            <Text style={styles.bold}>{data.bienTelephone || '—'}</Text>
          </Text>
        </Article>

        <Article titre="Durée du contrat">
          <Text style={styles.p}>
            Le présent contrat est conclu pour une durée de 1 an, renouvelable par tacite reconduction,
            conformément à l&apos;article 25-7 de la loi du 6 juillet 1989. Il prendra effet le{' '}
            {formatDate(data.dateDebut)} pour se terminer le {formatDate(dateFin)}.
          </Text>
        </Article>

        <Article titre="Préavis">
          <Text style={styles.p}>
            Le congé de location devra être signifié de part et d&apos;autre par lettre recommandée avec accusé de
            réception. Le locataire devra respecter un préavis d&apos;un mois à l&apos;égard du bailleur. Le délai
            de préavis à respecter par le bailleur pour prévenir le preneur est d&apos;un mois (partant de la date
            de réception de l&apos;acte).
          </Text>
        </Article>

        <Article titre="Montant du loyer et des charges">
          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={styles.th}>Loyer mensuel total</Text>
              <Text style={[styles.td, { textAlign: 'right' }]}>{formatMontantPdf(totalMensuel, { decimals: true })}</Text>
            </View>
            <View style={styles.tr}>
              <Text style={styles.th}>Loyer hors charges</Text>
              <Text style={[styles.td, { textAlign: 'right' }]}>{formatMontantPdf(data.loyerHC, { decimals: true })}</Text>
            </View>
            <View style={styles.tr}>
              <Text style={styles.th}>Charges</Text>
              <Text style={[styles.td, { textAlign: 'right' }]}>{formatMontantPdf(data.charges, { decimals: true })}</Text>
            </View>
          </View>
          <Text style={styles.p}>
            Le paiement du loyer se fera à échoir le 1er de chaque mois, par virement bancaire sur le compte du
            bailleur dont les coordonnées figurent ci-dessous. Charges complémentaires : les frais
            d&apos;électricité et d&apos;abonnement internet restent à la charge du locataire.
          </Text>
        </Article>

        <Article titre="Coordonnées bancaires du bailleur (RIB)">
          <View style={styles.box}>
            <Text style={styles.p}>Titulaire du compte : {RIB.titulaire}</Text>
            <Text style={styles.p}>Adresse : {RIB.adresse}</Text>
            <Text style={styles.p}>Domiciliation : {RIB.domiciliation}</Text>
            <Text style={styles.p}>IBAN : {RIB.iban}</Text>
            <Text style={styles.p}>BIC : {RIB.bic}</Text>
          </View>
        </Article>

        <Article titre="Révision du loyer">
          <Text style={styles.p}>
            Le loyer sera indexé automatiquement et sans préavis, à la date anniversaire du contrat. Pour calculer
            l&apos;indexation, les parties prendront l&apos;indice de référence des loyers (IRL) publié chaque
            trimestre par l&apos;INSEE{data.indiceIRLReference ? ` (référence : ${data.indiceIRLReference})` : ''}.
            L&apos;IRL correspond à la moyenne, sur l&apos;ensemble des mois depuis la date de la dernière révision
            de prix, de l&apos;évolution des prix à la consommation hors tabac et hors loyers.
          </Text>
        </Article>

        <Article titre="Dépôt de garantie">
          <Text style={styles.p}>
            Le dépôt de garantie est de {formatMontantPdf(data.depotGarantie ?? 0, { decimals: true })}
            {moisDepot ? ` et correspond à ${moisDepot} mois de loyer hors charges.` : '.'} Ce dépôt ne dispense
            en aucun cas le locataire du paiement du loyer et des charges aux dates fixées. Il sera restitué dans
            le délai maximum de deux mois (ou d&apos;un mois si l&apos;état des lieux de sortie est conforme à
            l&apos;état des lieux d&apos;entrée), conformément à l&apos;article 22 de la loi du 6 juillet 1989, à
            compter du départ du locataire, déduction faite, le cas échéant, des sommes restant dues au bailleur
            et des paiements dont ce dernier pourrait être tenu responsable aux lieu et place du locataire.
          </Text>
        </Article>

        <Article titre="Clauses résolutoires">
          <Text style={styles.p}>
            À défaut de paiement du loyer ou des charges aux termes convenus, ou à défaut de versement du dépôt de
            garantie, il est prévu que le bail sera résilié de plein droit sans qu&apos;il soit besoin d&apos;aucune
            formalité judiciaire. De même, en cas de non-respect d&apos;une des clauses du bail, celui-ci sera
            résilié de plein droit. Défaut d&apos;assurance : à défaut d&apos;assurance des risques locatifs par
            le locataire, il est prévu que le bail sera résilié de plein droit.
          </Text>
        </Article>

        <Article titre="Obligations du bailleur">
          <Text style={styles.p}>Le bailleur s&apos;oblige à :</Text>
          <Numero n={1}>
            Délivrer au locataire les locaux en bon état d&apos;usage et de réparations, ainsi que les équipements
            mentionnés au contrat en bon état de fonctionnement.
          </Numero>
          <Numero n={2}>
            Assurer au locataire la jouissance paisible des locaux loués ; toutefois, sa responsabilité ne pourra
            pas être recherchée en raison des voies de fait dont les autres locataires ou des tiers se rendraient
            coupables à l&apos;égard du locataire.
          </Numero>
          <Numero n={3}>
            Entretenir les locaux en état de servir à l&apos;usage prévu et y faire toutes les réparations
            nécessaires autres que locatives.
          </Numero>
          <Numero n={4}>
            Ne pas s&apos;opposer aux aménagements réalisés par le locataire, dès lors que ceux-ci ne constituent
            pas une transformation de la chose louée.
          </Numero>
          <Numero n={5}>Remettre gratuitement une quittance au locataire lorsqu&apos;il en fait la demande.</Numero>
        </Article>

        <Article titre="Obligations du locataire">
          <Text style={styles.p}>Le locataire s&apos;oblige à :</Text>
          <Numero n={1}>
            Payer le loyer et les charges récupérables aux termes convenus. Le paiement mensuel est de droit
            s&apos;il en fait la demande.
          </Numero>
          <Numero n={2}>
            User paisiblement des locaux et équipements loués suivant la destination prévue au contrat. En
            particulier, il s&apos;engage à respecter les stipulations prévues à cet égard par le règlement
            intérieur de l&apos;immeuble et par le règlement de copropriété, dont il déclare avoir pris
            connaissance. Il s&apos;engage également à respecter toutes les décisions, prises à compter de son
            entrée en jouissance, par l&apos;assemblée générale des copropriétaires.
          </Numero>
          <Numero n={3}>
            Répondre des dégradations et pertes survenant pendant la durée du contrat dans les locaux dont il a
            la jouissance exclusive, à moins qu&apos;il ne prouve qu&apos;elles aient eu lieu par cas de force
            majeure, par la faute du bailleur ou par le fait d&apos;un tiers qu&apos;il n&apos;a pas introduit
            dans le logement.
          </Numero>
          <Numero n={4}>
            Prendre à sa charge l&apos;entretien courant du logement, des équipements mentionnés au contrat et les
            menues réparations ainsi que l&apos;ensemble des réparations locatives, sauf si elles sont
            occasionnées par vétusté, malfaçon, vice de construction, cas fortuit ou force majeure.
          </Numero>
          <Numero n={5}>
            Ne pas céder le contrat de location, ni sous-louer le local, sauf avec l&apos;accord écrit du
            bailleur, y compris sur le prix du loyer. En cas de cessation du contrat principal, le sous-locataire
            ne pourra se prévaloir d&apos;aucun droit à l&apos;encontre du bailleur, ni d&apos;aucun titre
            d&apos;occupation.
          </Numero>
          <Numero n={6}>
            Laisser exécuter dans les lieux loués les travaux d&apos;amélioration des parties communes ou des
            parties privatives du même immeuble, ainsi que les travaux nécessaires au maintien en état et à
            l&apos;entretien normal des locaux loués, les dispositions des deuxième et troisième alinéas de
            l&apos;article 1724 du Code civil étant applicables à ces travaux.
          </Numero>
          <Numero n={7}>
            Ne pas transformer les locaux et équipements loués sans l&apos;accord écrit du propriétaire, lequel
            pourra subordonner cet accord et l&apos;exécution des travaux à l&apos;avis et à la surveillance
            d&apos;un architecte de son choix, dont les honoraires seront payés par le locataire. En cas de
            méconnaissance par le locataire de cette obligation, le bailleur pourra exiger la remise en état des
            lieux ou des équipements au départ du locataire ou conserver les transformations effectuées, sans que
            le locataire puisse réclamer une indemnisation pour les frais engagés. Si les transformations opérées
            mettent en péril le bon fonctionnement des équipements ou la sécurité du local, le bailleur pourra
            exiger, aux frais du locataire, la remise immédiate des lieux en l&apos;état.
          </Numero>
          <Numero n={8}>
            S&apos;assurer contre les risques locatifs dont il doit répondre en sa qualité de locataire : incendie,
            dégât des eaux, et en justifier au bailleur à la remise des clés, en lui transmettant l&apos;attestation
            émise par son assureur ou son représentant. Il devra en justifier ainsi chaque année, à la demande du
            bailleur.
          </Numero>
          <Numero n={9}>
            Accepter la réalisation par le bailleur des réparations urgentes et qui ne peuvent être différées
            jusqu&apos;à la fin du contrat de location, conformément à l&apos;article 1724 du Code civil. Si ces
            réparations durent plus de 40 jours, le loyer, à l&apos;exclusion des charges, sera diminué en
            proportion du temps et de la partie de la chose louée dont le locataire aura été privé.
          </Numero>
          <Numero n={10}>
            Informer immédiatement le bailleur de tout sinistre et des dégradations se produisant dans les lieux
            loués, même s&apos;il n&apos;en résulte aucun dommage apparent.
          </Numero>
          <Numero n={12}>
            Acquitter toutes les contributions et taxes lui incombant personnellement (notamment la taxe
            d&apos;habitation) de manière que le bailleur ne soit pas inquiété à ce sujet. Le locataire devra,
            avant tout déménagement, justifier du paiement des impôts dont le bailleur pourrait être tenu
            responsable.
          </Numero>
          <Numero n={13}>
            Ne pas déménager sans s&apos;être conformé à ses obligations, ni sans avoir auparavant présenté au
            bailleur les quittances justifiant du paiement de la taxe d&apos;habitation (article 1686 du CGI).
          </Numero>
          <Numero n={14}>
            Remettre au bailleur, dès son départ, toutes les clés des locaux loués et lui faire connaître sa
            nouvelle adresse.
          </Numero>
        </Article>

        {data.garant && (
          <Article titre="Cautionnement">
            <Text style={styles.p}>L&apos;exécution du présent bail est garantie par :</Text>
            <Text style={styles.p}>
              <Text style={styles.bold}>{data.garant.nom.toUpperCase()}</Text>, demeurant au {data.garant.adresse},
              de nationalité {data.garant.nationalite || 'Française'}, en qualité de caution.
            </Text>
            <Text style={styles.p}>
              Il s&apos;agit d&apos;un cautionnement solidaire par lequel la caution renonce aux bénéfices de
              discussion et de division pour les obligations que le locataire a contractées en signant le présent
              bail. Son engagement est à durée déterminée et prendra fin à la date d&apos;expiration dudit bail,
              ou de son renouvellement éventuel. L&apos;engagement de caution est annexé aux présentes.
            </Text>
          </Article>
        )}

        <Article titre="Pièces jointes">
          <Text style={styles.p}>
            - RIB pour le versement du loyer{'\n'}- État des lieux d&apos;entrée{'\n'}- Reçu de dépôt de garantie
            {data.garant ? '\n- Engagement de la caution' : ''}
          </Text>
        </Article>

        <Text style={[styles.p, { marginTop: 10 }]}>Fait à Tours, le {formatDate(data.dateEmission)}</Text>

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le(s) locataire(s)</Text>
            <Text style={styles.small}>« Bon pour accord, lu et approuvé »</Text>
            <Text style={styles.signatureLine}>{data.locatairesNoms}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.small}>Le bailleur</Text>
            <Text style={styles.small}>« Bon pour accord, lu et approuvé »</Text>
            <Text style={styles.signatureLine}>{PROPRIETAIRE.nom}</Text>
          </View>
        </View>

        <DocFooter text="Gestion immo — document généré automatiquement, à faire relire avant signature" />
      </Page>
    </Document>
  );
}

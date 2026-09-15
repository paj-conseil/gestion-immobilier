/**
 * Modèles de texte par défaut pour chaque type de document généré, et liste
 * des placeholders disponibles pour le paramétrage (Droits & accès). Fichier
 * sans dépendance à @react-pdf/renderer pour rester importable côté client
 * (formulaire de paramétrage) comme côté serveur (génération du PDF).
 */

/** Inséré seul sur une ligne dans un texte de document pour forcer un saut de page. */
export const SAUT_DE_PAGE = '[SAUT_DE_PAGE]';

export const DEFAULT_DOC_TEXT: Record<string, string> = {
  CONTRAT: `{{bailleurNom}}, demeurant au {{bailleurAdresse}}, propriétaire(s) du bien d'habitation situé au {{bienAdresse}}, ci-après dénommé(s) LE BAILLEUR,
ET
{{locataire}}, demeurant au {{bienAdresse}}, ci-après dénommé(s) LE LOCATAIRE.
Date : {{dateEmission}}
Il a été convenu ce qui suit : le présent contrat est soumis aux dispositions de la loi n°89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs, notamment ses articles 25-3 et suivants relatifs à la location meublée, ainsi qu'aux dispositions du Code civil, et notamment les articles 1709 et suivants.

## Le bien loué est composé de
{{composition}}

## Équipements
{{equipements}}

## Informations utiles
Numéro de compteur électrique (pour mise en place abonnement EDF) : {{bienNumeroCompteur}}
Numéro de téléphone (pour abonnement internet) : {{bienTelephone}}

## Durée du contrat
Le présent contrat est conclu pour une durée de 1 an, renouvelable par tacite reconduction, conformément à l'article 25-7 de la loi du 6 juillet 1989. Il prendra effet le {{dateDebut}} pour se terminer le {{dateFin}}.

## Préavis
Le congé de location devra être signifié de part et d'autre par lettre recommandée avec accusé de réception. Le locataire devra respecter un préavis d'un mois à l'égard du bailleur. Le délai de préavis à respecter par le bailleur pour prévenir le preneur est d'un mois (partant de la date de réception de l'acte).

## Montant du loyer et des charges
Loyer hors charges : {{loyerHC}}
Charges : {{charges}}
Loyer mensuel total : {{totalMensuel}}
Le paiement du loyer se fera à échoir le 1er de chaque mois, par virement bancaire sur le compte du bailleur dont les coordonnées figurent ci-dessous. Charges complémentaires : les frais d'électricité et d'abonnement internet restent à la charge du locataire.

## Coordonnées bancaires du bailleur (RIB)
Titulaire du compte : {{ribTitulaire}}
Adresse : {{ribAdresse}}
Domiciliation : {{ribDomiciliation}}
IBAN : {{ribIban}}
BIC : {{ribBic}}

## Révision du loyer
Le loyer sera indexé automatiquement et sans préavis, à la date anniversaire du contrat. Pour calculer l'indexation, les parties prendront l'indice de référence des loyers (IRL) publié chaque trimestre par l'INSEE{{indiceIRLRefTexte}}. L'IRL correspond à la moyenne, sur l'ensemble des mois depuis la date de la dernière révision de prix, de l'évolution des prix à la consommation hors tabac et hors loyers.

## Dépôt de garantie
Le dépôt de garantie est de {{depotGarantie}}{{depotGarantiePhrase}} Ce dépôt ne dispense en aucun cas le locataire du paiement du loyer et des charges aux dates fixées. Il sera restitué dans le délai maximum de deux mois (ou d'un mois si l'état des lieux de sortie est conforme à l'état des lieux d'entrée), conformément à l'article 22 de la loi du 6 juillet 1989, à compter du départ du locataire, déduction faite, le cas échéant, des sommes restant dues au bailleur et des paiements dont ce dernier pourrait être tenu responsable aux lieu et place du locataire.

## Clauses résolutoires
À défaut de paiement du loyer ou des charges aux termes convenus, ou à défaut de versement du dépôt de garantie, il est prévu que le bail sera résilié de plein droit sans qu'il soit besoin d'aucune formalité judiciaire. De même, en cas de non-respect d'une des clauses du bail, celui-ci sera résilié de plein droit. Défaut d'assurance : à défaut d'assurance des risques locatifs par le locataire, il est prévu que le bail sera résilié de plein droit.

## Obligations du bailleur
Le bailleur s'oblige à :
1. Délivrer au locataire les locaux en bon état d'usage et de réparations, ainsi que les équipements mentionnés au contrat en bon état de fonctionnement.
2. Assurer au locataire la jouissance paisible des locaux loués ; toutefois, sa responsabilité ne pourra pas être recherchée en raison des voies de fait dont les autres locataires ou des tiers se rendraient coupables à l'égard du locataire.
3. Entretenir les locaux en état de servir à l'usage prévu et y faire toutes les réparations nécessaires autres que locatives.
4. Ne pas s'opposer aux aménagements réalisés par le locataire, dès lors que ceux-ci ne constituent pas une transformation de la chose louée.
5. Remettre gratuitement une quittance au locataire lorsqu'il en fait la demande.

## Obligations du locataire
Le locataire s'oblige à :
1. Payer le loyer et les charges récupérables aux termes convenus. Le paiement mensuel est de droit s'il en fait la demande.
2. User paisiblement des locaux et équipements loués suivant la destination prévue au contrat. En particulier, il s'engage à respecter les stipulations prévues à cet égard par le règlement intérieur de l'immeuble et par le règlement de copropriété, dont il déclare avoir pris connaissance. Il s'engage également à respecter toutes les décisions, prises à compter de son entrée en jouissance, par l'assemblée générale des copropriétaires.
3. Répondre des dégradations et pertes survenant pendant la durée du contrat dans les locaux dont il a la jouissance exclusive, à moins qu'il ne prouve qu'elles aient eu lieu par cas de force majeure, par la faute du bailleur ou par le fait d'un tiers qu'il n'a pas introduit dans le logement.
4. Prendre à sa charge l'entretien courant du logement, des équipements mentionnés au contrat et les menues réparations ainsi que l'ensemble des réparations locatives, sauf si elles sont occasionnées par vétusté, malfaçon, vice de construction, cas fortuit ou force majeure.
5. Ne pas céder le contrat de location, ni sous-louer le local, sauf avec l'accord écrit du bailleur, y compris sur le prix du loyer. En cas de cessation du contrat principal, le sous-locataire ne pourra se prévaloir d'aucun droit à l'encontre du bailleur, ni d'aucun titre d'occupation.
6. Laisser exécuter dans les lieux loués les travaux d'amélioration des parties communes ou des parties privatives du même immeuble, ainsi que les travaux nécessaires au maintien en état et à l'entretien normal des locaux loués, les dispositions des deuxième et troisième alinéas de l'article 1724 du Code civil étant applicables à ces travaux.
7. Ne pas transformer les locaux et équipements loués sans l'accord écrit du propriétaire, lequel pourra subordonner cet accord et l'exécution des travaux à l'avis et à la surveillance d'un architecte de son choix, dont les honoraires seront payés par le locataire. En cas de méconnaissance par le locataire de cette obligation, le bailleur pourra exiger la remise en état des lieux ou des équipements au départ du locataire ou conserver les transformations effectuées, sans que le locataire puisse réclamer une indemnisation pour les frais engagés. Si les transformations opérées mettent en péril le bon fonctionnement des équipements ou la sécurité du local, le bailleur pourra exiger, aux frais du locataire, la remise immédiate des lieux en l'état.
8. S'assurer contre les risques locatifs dont il doit répondre en sa qualité de locataire : incendie, dégât des eaux, et en justifier au bailleur à la remise des clés, en lui transmettant l'attestation émise par son assureur ou son représentant. Il devra en justifier ainsi chaque année, à la demande du bailleur.
9. Accepter la réalisation par le bailleur des réparations urgentes et qui ne peuvent être différées jusqu'à la fin du contrat de location, conformément à l'article 1724 du Code civil. Si ces réparations durent plus de 40 jours, le loyer, à l'exclusion des charges, sera diminué en proportion du temps et de la partie de la chose louée dont le locataire aura été privé.
10. Informer immédiatement le bailleur de tout sinistre et des dégradations se produisant dans les lieux loués, même s'il n'en résulte aucun dommage apparent.
11. Acquitter toutes les contributions et taxes lui incombant personnellement (notamment la taxe d'habitation) de manière que le bailleur ne soit pas inquiété à ce sujet. Le locataire devra, avant tout déménagement, justifier du paiement des impôts dont le bailleur pourrait être tenu responsable.
12. Ne pas déménager sans s'être conformé à ses obligations, ni sans avoir auparavant présenté au bailleur les quittances justifiant du paiement de la taxe d'habitation (article 1686 du CGI).
13. Remettre au bailleur, dès son départ, toutes les clés des locaux loués et lui faire connaître sa nouvelle adresse.

{{clauseCautionnement}}
## Pièces jointes
{{piecesJointes}}`,

  CAUTIONNEMENT: `Monsieur,

Je soussigné {{garantNom}}{{garantIdentite}}, résidant à l'adresse suivante : {{garantAdresse}},
déclare me porter caution solidaire de {{locataire}} pour les obligations résultant du bail qui lui a été consenti par le bailleur {{bailleurNom}}, demeurant au {{bailleurAdresse}}, pour la location du logement situé {{bienAdresse}}.

J'ai pris connaissance du montant du loyer de {{loyerMontant}} ({{loyerMontantLettres}}) par mois. Il sera révisé annuellement à la date anniversaire du contrat selon la variation de l'indice de référence des loyers publié par l'INSEE d'une année sur l'autre.

Cet engagement pour une caution solidaire est valable pour une durée indéterminée pour le paiement notamment des loyers, des indemnités d'occupation, des charges, des réparations et dégradations locatives, des impôts et taxes et tous frais éventuels de procédure dus en vertu de ce bail.

Je reconnais également avoir pris connaissance de l'avant-dernier alinéa de l'article 22-1 de la loi du 6 juillet 1989 : « Lorsque le cautionnement d'obligations résultant d'un contrat de location conclu en application du présent titre ne comporte aucune indication de durée ou lorsque la durée du cautionnement est stipulée indéterminée, la caution peut le résilier unilatéralement. La résiliation prend effet au terme du contrat de location, qu'il s'agisse du contrat initial ou d'un contrat reconduit ou renouvelé au cours duquel le bailleur reçoit notification de la résiliation. »`,

  DEPOT_GARANTIE: `{{bailleurNom}}
{{bailleurAdresse}}

{{locataire}}
{{bienAdresse}}

Je soussigné {{bailleurNom}}, bailleur du bien situé au {{bienAdresse}}, déclare sur l'honneur avoir reçu ce jour la somme de {{montantLettres}} ({{montant}}) de la part de {{locataire}} au titre de dépôt de garantie{{moisDepotPhrase}}

Ce dépôt de garantie sera conservé par le propriétaire pendant toute la durée de la location. Il sera alors restitué sous deux mois suivant l'état des lieux de sortie.

À noter que celui-ci pourra être réduit d'éventuels impayés et frais de remise en état selon la législation en vigueur.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`,

  QUITTANCE: `## Logement
{{bienAdresse}}

Je soussigné {{bailleurNom}}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de {{locataire}} la somme de {{montantLettres}} ({{montant}}) au titre du paiement du loyer et des charges pour la période de location citée en objet et lui en donne quittance, sous réserve de tous mes droits.

Loyer hors charges : {{loyerHC}}
Charges : {{charges}}
Total réglé : {{total}}

Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas de paiement partiel du montant du présent terme. Elle est à conserver pendant trois ans par le locataire (article 7-1 de la loi n° 89-462 du 6 juillet 1989).`,

  REVISION_LOYER: `Madame, Monsieur {{locataire}},

Conformément à la clause de révision prévue à votre contrat de location du logement situé {{bienAdresse}}, et en application de l'indice de référence des loyers ({{indiceReference}}) publié par l'INSEE, le loyer mensuel hors charges de votre logement est révisé comme suit à compter du {{dateEffet}}.

Loyer actuel (hors charges) : {{loyerActuel}}
Indice de référence (base) : {{indiceRefValeur}}
Nouvel indice publié : {{indiceNouveauValeur}}
Nouveau loyer hors charges : {{nouveauLoyer}}

Calcul : loyer actuel × (nouvel indice / indice de référence) = {{loyerActuel}} × ({{indiceNouveauValeur}} / {{indiceRefValeur}}) = {{nouveauLoyer}}.

Je vous prie de bien vouloir tenir compte de ce nouveau montant pour vos prochains règlements. N'hésitez pas à me contacter pour toute question.`,
};

export const PLACEHOLDERS_PAR_TYPE: Record<string, { cle: string; description: string }[]> = {
  CONTRAT: [
    { cle: 'bailleurNom', description: 'nom du/des propriétaire(s)' },
    { cle: 'bailleurAdresse', description: 'adresse du/des propriétaire(s)' },
    { cle: 'bienAdresse', description: 'adresse complète du logement' },
    { cle: 'locataire', description: 'nom du/des locataire(s)' },
    { cle: 'dateEmission', description: "date d'émission du document" },
    { cle: 'dateDebut', description: 'date de début du bail' },
    { cle: 'dateFin', description: 'date de fin du bail' },
    { cle: 'loyerHC', description: 'loyer hors charges' },
    { cle: 'charges', description: 'charges' },
    { cle: 'totalMensuel', description: 'loyer + charges' },
    { cle: 'depotGarantie', description: 'montant du dépôt de garantie' },
    { cle: 'depotGarantiePhrase', description: 'phrase optionnelle sur le nombre de mois de dépôt' },
    { cle: 'indiceIRLRefTexte', description: "texte optionnel « (référence : ...) »" },
    { cle: 'bienNumeroCompteur', description: 'numéro de compteur électrique' },
    { cle: 'bienTelephone', description: 'numéro de téléphone du logement' },
    { cle: 'ribTitulaire', description: 'titulaire du RIB' },
    { cle: 'ribAdresse', description: 'adresse du RIB' },
    { cle: 'ribDomiciliation', description: 'domiciliation du RIB' },
    { cle: 'ribIban', description: 'IBAN' },
    { cle: 'ribBic', description: 'BIC' },
    { cle: 'composition', description: 'composition du logement' },
    { cle: 'equipements', description: 'équipements du logement' },
    { cle: 'clauseCautionnement', description: 'paragraphe caution (vide si aucun garant)' },
    { cle: 'piecesJointes', description: 'liste des pièces jointes' },
  ],
  CAUTIONNEMENT: [
    { cle: 'garantNom', description: 'nom du garant' },
    { cle: 'garantIdentite', description: 'né(e) le ... à ... (optionnel)' },
    { cle: 'garantAdresse', description: 'adresse du garant' },
    { cle: 'locataire', description: 'nom du/des locataire(s)' },
    { cle: 'bailleurNom', description: 'nom du propriétaire' },
    { cle: 'bailleurAdresse', description: 'adresse du propriétaire' },
    { cle: 'bienAdresse', description: 'adresse complète du logement' },
    { cle: 'loyerMontant', description: 'loyer + charges (chiffres)' },
    { cle: 'loyerMontantLettres', description: 'loyer + charges (en lettres)' },
    { cle: 'dateEmission', description: "date d'émission du document" },
  ],
  DEPOT_GARANTIE: [
    { cle: 'bailleurNom', description: 'nom du propriétaire' },
    { cle: 'bailleurAdresse', description: 'adresse du propriétaire' },
    { cle: 'locataire', description: 'nom du/des locataire(s)' },
    { cle: 'bienAdresse', description: 'adresse complète du logement' },
    { cle: 'montant', description: 'montant du dépôt (chiffres)' },
    { cle: 'montantLettres', description: 'montant du dépôt (en lettres)' },
    { cle: 'moisDepotPhrase', description: 'phrase optionnelle sur le nombre de mois' },
    { cle: 'dateVersement', description: 'date de versement' },
  ],
  QUITTANCE: [
    { cle: 'bailleurNom', description: 'nom du propriétaire' },
    { cle: 'locataire', description: 'nom du/des locataire(s)' },
    { cle: 'bienAdresse', description: 'adresse complète du logement' },
    { cle: 'montant', description: 'loyer + charges (chiffres)' },
    { cle: 'montantLettres', description: 'loyer + charges (en lettres)' },
    { cle: 'loyerHC', description: 'loyer hors charges' },
    { cle: 'charges', description: 'charges' },
    { cle: 'total', description: 'total réglé' },
    { cle: 'dateEmission', description: "date d'émission" },
  ],
  REVISION_LOYER: [
    { cle: 'locataire', description: 'nom du/des locataire(s)' },
    { cle: 'bienAdresse', description: 'adresse complète du logement' },
    { cle: 'indiceReference', description: 'nom de l’indice de référence' },
    { cle: 'dateEffet', description: 'date de prise d’effet' },
    { cle: 'loyerActuel', description: 'loyer actuel hors charges' },
    { cle: 'indiceRefValeur', description: 'valeur indice de base' },
    { cle: 'indiceNouveauValeur', description: 'nouvelle valeur indice' },
    { cle: 'nouveauLoyer', description: 'nouveau loyer calculé' },
  ],
};

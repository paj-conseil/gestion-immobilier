export type EDLTemplateItem = { label: string; type?: 'ETAT' | 'QUANTITE' };
export type EDLTemplatePiece = { nom: string; items: EDLTemplateItem[] };

export const EDL_TEMPLATE: EDLTemplatePiece[] = [
  {
    nom: 'Entrée',
    items: [
      { label: 'Sols' },
      { label: 'Murs / peinture' },
      { label: "Porte d'entrée" },
      { label: 'Interphone / digicode' },
      { label: 'Plafond' },
    ],
  },
  {
    nom: 'Séjour',
    items: [
      { label: 'Sols' },
      { label: 'Murs / peinture' },
      { label: 'Fenêtres' },
      { label: 'Volets' },
      { label: 'Plafond' },
    ],
  },
  {
    nom: 'Cuisine',
    items: [
      { label: 'Plan de travail' },
      { label: 'Électroménager' },
      { label: 'Robinetterie' },
      { label: 'Meubles' },
      { label: 'Meuble évier' },
      { label: 'Plaques de cuisson' },
      { label: 'Micro-onde' },
      { label: 'Frigo/congélateur' },
      { label: 'Hotte' },
      { label: 'Lave vaisselle' },
      { label: 'Lave linge' },
      { label: 'Plafond' },
    ],
  },
  {
    nom: 'Chambre',
    items: [
      { label: 'Sols' },
      { label: 'Murs / peinture' },
      { label: 'Fenêtres' },
      { label: 'Placards' },
      { label: 'Lit' },
      { label: 'Literie' },
      { label: 'Plafond' },
    ],
  },
  {
    nom: 'Salle de bain',
    items: [
      { label: 'Sanitaires' },
      { label: 'Joints' },
      { label: 'Robinetterie' },
      { label: 'Ventilation' },
      { label: 'WC' },
      { label: 'Baignoire/Douche' },
      { label: 'Porte douche' },
      { label: 'Plafond' },
    ],
  },
  {
    nom: 'Clés',
    items: [
      { label: 'Appartement', type: 'QUANTITE' },
      { label: 'Badge immeuble', type: 'QUANTITE' },
      { label: 'Box/parking', type: 'QUANTITE' },
      { label: 'Cave', type: 'QUANTITE' },
      { label: 'Boîte aux lettres', type: 'QUANTITE' },
    ],
  },
];

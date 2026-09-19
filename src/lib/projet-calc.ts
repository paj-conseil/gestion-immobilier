/**
 * Calculs de la simulation d'investissement (onglet "Analyse projet" du
 * classeur Excel). Fonctions pures, utilisées à la fois par le formulaire
 * (recalcul instantané) et, au besoin, côté serveur.
 */

export type ChargeLigne = { id: string; label: string; montantAnnuel: number };

export type ProjetCalcInput = {
  surface: number | null;
  prixAchat: number;
  fraisAgence: number;
  tauxNotaire: number;
  montantTravaux: number;
  apport: number;
  dureeAns: number;
  tauxCredit: number;
  tauxAssurance: number;
  loyerMensuel: number;
  chargesRecuperablesMensuel: number;
  revenuNetMensuel: number;
  endettementMax: number;
  regimeFiscal: string;
  tmi: number;
  charges: ChargeLigne[];
};

export const PRELEVEMENTS_SOCIAUX = 0.172;
export const ABATTEMENT: Record<string, number> = { MICRO_BIC: 0.5, MICRO_FONCIER: 0.3 };

/** Mensualité d'un prêt à taux fixe (équivalent de PMT dans Excel). */
export function mensualiteCredit(capital: number, tauxAnnuel: number, dureeAns: number): number {
  const n = dureeAns * 12;
  if (capital <= 0 || n <= 0) return 0;
  const r = tauxAnnuel / 12;
  if (r === 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

export function calculerProjet(p: ProjetCalcInput) {
  const fraisNotaire = p.prixAchat * p.tauxNotaire;
  const montantOperation = p.prixAchat + p.fraisAgence + fraisNotaire + p.montantTravaux;
  const aFinancer = Math.max(0, montantOperation - p.apport);

  const mensualite = mensualiteCredit(aFinancer, p.tauxCredit, p.dureeAns);
  const assuranceMensuelle = (aFinancer * p.tauxAssurance) / 12;
  const totalMensualite = mensualite + assuranceMensuelle;
  const coutCredit = Math.max(0, mensualite * 12 * p.dureeAns - aFinancer);
  const coutAssurance = assuranceMensuelle * 12 * p.dureeAns;

  const loyerAnnuel = p.loyerMensuel * 12;
  const revenusAn = loyerAnnuel + p.chargesRecuperablesMensuel * 12;
  const chargesAn = p.charges.reduce((s, c) => s + (Number(c.montantAnnuel) || 0), 0);
  const abattement = ABATTEMENT[p.regimeFiscal] ?? 0.5;
  const impotAn = loyerAnnuel * (1 - abattement) * (p.tmi + PRELEVEMENTS_SOCIAUX);
  const chargesEmpruntAn = totalMensualite * 12;

  const cashflowAn = revenusAn - chargesEmpruntAn - chargesAn - impotAn;

  const mensualiteMax = p.revenuNetMensuel > 0 ? p.revenuNetMensuel * p.endettementMax : null;

  return {
    fraisNotaire,
    montantOperation,
    aFinancer,
    prixM2: p.surface && p.surface > 0 ? p.prixAchat / p.surface : null,
    mensualite,
    assuranceMensuelle,
    totalMensualite,
    coutCredit,
    coutAssurance,
    chargesEmpruntAn,
    revenusAn,
    chargesAn,
    impotAn,
    cashflowAn,
    cashflowMensuel: cashflowAn / 12,
    rentabiliteBrute: montantOperation > 0 ? loyerAnnuel / montantOperation : 0,
    rentabiliteNette: montantOperation > 0 ? (revenusAn - chargesAn - impotAn) / montantOperation : 0,
    mensualiteMax,
    financable: mensualiteMax === null ? null : totalMensualite <= mensualiteMax,
  };
}

let seq = 0;
function ligne(label: string, montantAnnuel: number): ChargeLigne {
  seq += 1;
  return { id: `c${Date.now().toString(36)}${seq}`, label, montantAnnuel: Math.round(montantAnnuel) };
}

/**
 * Propose des charges annuelles complémentaires à partir de la surface et du
 * loyer — ordres de grandeur repris du classeur (taxe foncière ≈ 10,7 €/m²,
 * copropriété ≈ 5,6 €/m²/mois, assurance PNO ≈ 120 €) complétés par les postes
 * habituels d'un investissement locatif. À ajuster selon le bien réel.
 */
export function chargesSuggerees(surface: number | null, loyerMensuel: number): ChargeLigne[] {
  const s = surface && surface > 0 ? surface : 0;
  const loyerAnnuel = loyerMensuel * 12;
  return [
    ligne('Taxe foncière', s * 10.7),
    ligne('Charges de copropriété', s * 5.6 * 12),
    ligne('Assurance propriétaire non occupant (PNO)', 120),
    ligne('Électricité / eau / internet (parties non refacturées)', 240),
    ligne('Entretien et petites réparations (≈ 5 % du loyer)', loyerAnnuel * 0.05),
    ligne('Vacance locative (≈ 1 mois par an)', loyerMensuel),
    ligne('Gestion locative (0 si vous gérez vous-même)', 0),
  ];
}

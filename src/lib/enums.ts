// SQLite ne supportant pas les enums Prisma, ces unions TypeScript sont la
// source de vérité pour les valeurs autorisées des champs "String" du schéma.

export type Role = 'ADMIN' | 'EDITEUR' | 'LECTEUR';
export type MembershipStatut = 'ACTIF' | 'INVITE';

export type TypeBien = 'APPARTEMENT' | 'STUDIO' | 'MAISON' | 'FOYER' | 'AUTRE';
export type StatutBien = 'LOUE' | 'VACANT' | 'PERSO';

export type TypeDocumentLocataire = 'CONTRAT_SIGNE' | 'CNI' | 'ATTESTATION_ASSURANCE' | 'RIB' | 'AUTRE';
export type StatutDocument = 'RECU' | 'MANQUANT';

export type StatutLocation = 'ACTIF' | 'INACTIF';
export type StatutLocataire = 'ACTIF' | 'INACTIF';

export type TypeDocumentGenere =
  | 'CONTRAT'
  | 'CAUTIONNEMENT'
  | 'DEPOT_GARANTIE'
  | 'ETAT_LIEUX'
  | 'QUITTANCE'
  | 'REVISION_LOYER';

export type StatutEmail = 'ENVOYE' | 'OUVERT' | 'ECHEC';

export type TypeEDL = 'ENTREE' | 'SORTIE';
export type EtatItem = 'BON' | 'USURE' | 'MAUVAIS';

export type TypePoste = 'REVENU' | 'CHARGE';
export type SourceTransaction = 'IMPORT' | 'MANUEL';

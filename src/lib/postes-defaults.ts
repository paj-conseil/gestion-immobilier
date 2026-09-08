import { prisma } from '@/lib/db';

export const POSTES_DEFAUT: { nom: string; type: 'REVENU' | 'CHARGE'; motsCles: string }[] = [
  { nom: 'Loyers', type: 'REVENU', motsCles: 'loyer,vir loyer,virement loyer' },
  {
    nom: 'Charges énergie (EDF, eau, internet...)',
    type: 'CHARGE',
    motsCles: 'edf,electricite,gaz,eau,veolia,suez,bouygues,orange,free,sfr,internet,energie',
  },
  { nom: 'Assurance logement', type: 'CHARGE', motsCles: 'assurance pno,assurance proprietaire,assurance non occupant' },
  { nom: 'Travaux / entretien', type: 'CHARGE', motsCles: 'travaux,plombier,electricien,entretien,reparation,depannage' },
  { nom: 'Mensualités', type: 'CHARGE', motsCles: 'echeance pret,remboursement pret,credit immo,pret immobilier' },
  { nom: 'Taxe foncière', type: 'CHARGE', motsCles: 'taxe fonciere' },
  { nom: 'Charges copropriété', type: 'CHARGE', motsCles: 'copropriete,syndic,charges copro' },
  { nom: 'Frais de gestion', type: 'CHARGE', motsCles: 'frais de gestion,honoraires gestion' },
  { nom: 'Assurance prêt', type: 'CHARGE', motsCles: 'assurance emprunteur,assurance pret' },
  { nom: 'Impôts', type: 'CHARGE', motsCles: 'impot,prelevement fiscal,urssaf' },
  { nom: 'Frais bancaires', type: 'CHARGE', motsCles: 'frais tenue de compte,frais bancaires,cotisation carte' },
  { nom: 'Caution (encaissement / remboursement)', type: 'REVENU', motsCles: 'caution' },
  { nom: 'Locations', type: 'REVENU', motsCles: 'booking.com,airbnb,location courte duree' },
  { nom: 'Virement interne', type: 'CHARGE', motsCles: 'virement interne,virt cpte a cpte,vir cpte a cpte,eurocompte serenite,compte courant,mensualite vanxains' },
  { nom: 'Autres', type: 'CHARGE', motsCles: '' },
  { nom: 'Autres charges', type: 'CHARGE', motsCles: '' },
];

export async function seedDefaultPostes(scopeId: string): Promise<void> {
  // Note : SQLite ne supporte pas `skipDuplicates` sur createMany. Cette
  // fonction n'est appelée que pour un périmètre tout juste créé (seed.ts et
  // createScope vérifient l'absence de postes existants avant d'appeler ceci).
  await prisma.poste.createMany({
    data: POSTES_DEFAUT.map((p) => ({ scopeId, nom: p.nom, type: p.type, motsCles: p.motsCles })),
  });
}

export function deviner(libelle: string, postes: { id: string; motsCles: string | null }[]): string | undefined {
  const l = libelle.toLowerCase();
  for (const p of postes) {
    if (!p.motsCles) continue;
    const mots = p.motsCles.split(',').map((m) => m.trim()).filter(Boolean);
    if (mots.some((m) => l.includes(m))) return p.id;
  }
  return undefined;
}

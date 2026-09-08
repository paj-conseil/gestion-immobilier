import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { POSTES_DEFAUT } from '../src/lib/postes-defaults';

const prisma = new PrismaClient();

function tempPassword(): string {
  return randomBytes(6).toString('base64url');
}

async function upsertUser(email: string, nom: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, password: null as string | null };
  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, nom, passwordHash } });
  return { user, password };
}

async function main() {
  console.log('Seed — création des comptes et données de démonstration…');

  const { user: pierre, password: pierrePassword } = await upsertUser('pierrejaubert@yahoo.com', 'Pierre Jaubert');
  const { user: anne, password: annePassword } = await upsertUser('annejaubert@live.fr', 'Anne Jaubert');

  let scope = await prisma.scope.findFirst({ where: { nom: 'Anne & Pierre' } });
  if (!scope) {
    scope = await prisma.scope.create({ data: { nom: 'Anne & Pierre', ownerId: pierre.id } });
  }

  for (const user of [pierre, anne]) {
    await prisma.membership.upsert({
      where: { userId_scopeId: { userId: user.id, scopeId: scope.id } },
      update: {},
      create: { userId: user.id, scopeId: scope.id, role: 'ADMIN', statut: 'ACTIF' },
    });
  }

  const postesExistants = await prisma.poste.count({ where: { scopeId: scope.id } });
  if (postesExistants === 0) {
    await prisma.poste.createMany({
      data: POSTES_DEFAUT.map((p) => ({ scopeId: scope!.id, nom: p.nom, type: p.type, motsCles: p.motsCles })),
    });
  }

  const biensExistants = await prisma.bien.count({ where: { scopeId: scope.id } });
  if (biensExistants > 0) {
    console.log('Des biens existent déjà pour ce périmètre — seed des biens ignoré.');
  } else {
    const cailloux4 = await prisma.bien.create({
      data: {
        scopeId: scope.id,
        adresse: '11 rue des Cailloux',
        complement: 'Appt 4ème',
        codePostal: '92110',
        ville: 'Clichy',
        type: 'APPARTEMENT',
        statut: 'LOUE',
        surface: 32,
        numeroCompteur: '041827',
        couleur: '#1E5631',
        prixAchat: 139000,
        fraisNotaire: 7691,
        montantTravaux: 33062,
        apportPersonnel: 0,
      },
    });
    await prisma.pret.create({
      data: {
        bienId: cailloux4.id,
        montant: 167258,
        banque: 'BNP Paribas',
        tauxInteret: 1.51,
        mensualite: 807.86,
        dureeMois: 240,
        dateFin: new Date(2036, 10, 5),
      },
    });
    const cailloux5 = await prisma.bien.create({
      data: {
        scopeId: scope.id,
        adresse: '11 rue des Cailloux',
        complement: 'Appt 5ème',
        codePostal: '92110',
        ville: 'Clichy',
        type: 'APPARTEMENT',
        statut: 'LOUE',
        surface: 32,
        numeroCompteur: '128840',
        couleur: '#2C6E3F',
        prixAchat: 156000,
        montantTravaux: 30000,
        apportPersonnel: 8800,
      },
    });
    await prisma.pret.create({
      data: {
        bienId: cailloux5.id,
        montant: 190000,
        banque: 'Crédit Mutuel',
        tauxInteret: 1.1,
        mensualite: 977.59,
        dureeMois: 240,
        dateFin: new Date(2040, 4, 5),
      },
    });
    const chanceMilly = await prisma.bien.create({
      data: {
        scopeId: scope.id,
        adresse: '22 rue Chance Milly',
        complement: 'Studio',
        codePostal: '92110',
        ville: 'Clichy',
        type: 'STUDIO',
        statut: 'LOUE',
        surface: 23,
        numeroCompteur: '302219',
        couleur: '#7CB342',
        prixAchat: 110000,
        montantTravaux: 16100,
        apportPersonnel: 0,
      },
    });
    await prisma.pret.create({
      data: {
        bienId: chanceMilly.id,
        montant: 86000,
        banque: 'BNP Paribas',
        tauxInteret: 1.67,
        mensualite: 243.59,
        dureeMois: 240,
        dateFin: new Date(2038, 1, 5),
      },
    });
    const foyerSainteMarie = await prisma.bien.create({
      data: {
        scopeId: scope.id,
        adresse: '94 rue Michelet',
        complement: 'Foyer Sainte-Marie',
        codePostal: '37000',
        ville: 'Tours',
        type: 'FOYER',
        statut: 'LOUE',
        surface: 70,
        numeroCompteur: '559104',
        couleur: '#0F3D24',
        montantTravaux: 120000,
        apportPersonnel: 80000,
      },
    });
    await prisma.pret.create({
      data: {
        bienId: foyerSainteMarie.id,
        montant: 100000,
        banque: 'Crédit Mutuel',
        mensualite: 735.93,
        dureeMois: 168,
        dateFin: new Date(2038, 0, 5),
      },
    });
    await prisma.bien.create({
      data: {
        scopeId: scope.id,
        adresse: '22 rue Chance Milly',
        complement: 'Combles à aménager',
        codePostal: '92110',
        ville: 'Clichy',
        type: 'AUTRE',
        statut: 'VACANT',
        surface: 50,
        couleur: '#B0790A',
        description: 'Projet de surélévation',
        prixAchat: 20000,
        apportPersonnel: 20000,
      },
    });
    const vanxains = await prisma.bien.create({
      data: {
        scopeId: scope.id,
        adresse: '23 route de la Double',
        complement: 'Maison',
        codePostal: '24600',
        ville: 'Vanxains',
        type: 'MAISON',
        statut: 'PERSO',
        surface: 500,
        couleur: '#5B665C',
        description: 'Résidence secondaire (nue-propriété)',
      },
    });
    await prisma.pret.create({
      data: {
        bienId: vanxains.id,
        montant: 100000,
        banque: 'Crédit Mutuel',
        tauxInteret: 1.12,
        mensualite: 556.83,
        dureeMois: 168,
        dateFin: new Date(2038, 0, 5),
      },
    });

    async function creerLocataire(
      nom: string,
      prenom: string,
      email: string,
      bienId: string,
      loyerHC: number,
      charges: number,
      dateDebut: Date,
      docs: { cni: boolean; avis: boolean; travail: boolean },
      dateFin?: Date,
      dateProchaineRevision?: Date,
    ) {
      const locataire = await prisma.locataire.create({
        data: {
          scopeId: scope!.id,
          nom,
          prenom,
          email,
          documents: {
            create: [
              { type: 'CNI', statut: docs.cni ? 'RECU' : 'MANQUANT' },
              { type: 'AVIS_IMPOSITION', statut: docs.avis ? 'RECU' : 'MANQUANT' },
              { type: 'CONTRAT_TRAVAIL', statut: docs.travail ? 'RECU' : 'MANQUANT' },
            ],
          },
        },
      });
      await prisma.location.create({
        data: {
          bienId,
          loyerHC,
          charges,
          dateDebut,
          dateFin,
          dateProchaineRevision,
          indiceIRLReference: 'IRL T2 2026',
          locataires: { create: [{ locataireId: locataire.id }] },
        },
      });
      return locataire;
    }

    await creerLocataire('Bouzid', 'Mehdi', 'mehdi.bouzid@mail.com', cailloux4.id, 961, 70, new Date(2024, 2, 1), {
      cni: true,
      avis: false,
      travail: true,
    }, undefined, new Date(2026, 9, 18));

    await creerLocataire('Ranaivo', 'Sofia', 'sofia.ranaivo@mail.com', cailloux5.id, 880, 0, new Date(2025, 0, 14), {
      cni: true,
      avis: true,
      travail: true,
    }, new Date(2027, 0, 14));

    await creerLocataire('Lefort', 'Claire', 'claire.lefort@mail.com', chanceMilly.id, 770, 65, new Date(2023, 8, 25), {
      cni: true,
      avis: true,
      travail: true,
    }, new Date(2026, 8, 25));

    await creerLocataire('Dumas', 'Théo', 'theo.dumas@mail.com', foyerSainteMarie.id, 2073, 0, new Date(2025, 8, 1), {
      cni: true,
      avis: false,
      travail: false,
    }, undefined, new Date(2027, 1, 1));

    const compteBnp = await prisma.compteBancaire.create({
      data: { scopeId: scope.id, banque: 'BNP Paribas', libelle: 'Compte principal' },
    });
    const compteCm = await prisma.compteBancaire.create({
      data: { scopeId: scope.id, banque: 'Crédit Mutuel', libelle: 'Compte principal' },
    });
    const posteLoyer = await prisma.poste.findFirst({ where: { scopeId: scope.id, nom: 'Loyer' } });
    const posteAssurance = await prisma.poste.findFirst({ where: { scopeId: scope.id, nom: 'Assurance PNO' } });
    const posteTravaux = await prisma.poste.findFirst({ where: { scopeId: scope.id, nom: 'Travaux / entretien' } });
    const posteEmprunt = await prisma.poste.findFirst({ where: { scopeId: scope.id, nom: 'Emprunt' } });

    await prisma.transaction.createMany({
      data: [
        {
          compteId: compteBnp.id,
          bienId: cailloux5.id,
          posteId: posteLoyer?.id,
          date: new Date(2026, 8, 2),
          libelle: 'Virement loyer Ranaivo',
          montant: 880,
          source: 'MANUEL',
        },
        {
          compteId: compteBnp.id,
          bienId: chanceMilly.id,
          posteId: posteAssurance?.id,
          date: new Date(2026, 8, 1),
          libelle: 'Prélèvement assurance PNO',
          montant: -14.2,
          source: 'MANUEL',
        },
        {
          compteId: compteBnp.id,
          bienId: cailloux4.id,
          posteId: posteTravaux?.id,
          date: new Date(2026, 7, 30),
          libelle: 'Facture plombier Dubreuil',
          montant: -210,
          source: 'MANUEL',
        },
        {
          compteId: compteCm.id,
          bienId: foyerSainteMarie.id,
          posteId: posteEmprunt?.id,
          date: new Date(2026, 7, 28),
          libelle: 'Échéance prêt CM',
          montant: -735.93,
          source: 'MANUEL',
        },
      ],
    });
  }

  console.log('\n--- Comptes de connexion ---');
  if (pierrePassword) console.log(`Pierre : pierrejaubert@yahoo.com / ${pierrePassword}`);
  else console.log('Pierre : pierrejaubert@yahoo.com (compte déjà existant)');
  if (annePassword) console.log(`Anne   : annejaubert@live.fr / ${annePassword}`);
  else console.log('Anne   : annejaubert@live.fr (compte déjà existant)');
  console.log('Changez ces mots de passe après votre première connexion.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

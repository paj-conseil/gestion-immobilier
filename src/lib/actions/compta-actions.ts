'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { parseCsvReleve, parsePdfText } from '@/lib/compta/parse-releve';
import { deviner } from '@/lib/postes-defaults';

export async function createCompteBancaire(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const banque = String(formData.get('banque') ?? '').trim();
  const libelle = String(formData.get('libelle') ?? '').trim();
  if (!banque || !libelle) return { error: 'Banque et libellé requis' };

  await prisma.compteBancaire.create({ data: { scopeId: ctx.scopeId, banque, libelle } });
  revalidatePath('/compta');
  return { ok: true };
}

export async function importReleve(
  compteId: string,
  formData: FormData,
): Promise<{ ok: true; imported: number; ignored: number; doublons: number } | { error: string }> {
  const ctx = await getCurrentContext();
  const compte = await prisma.compteBancaire.findFirst({ where: { id: compteId, scopeId: ctx.scopeId } });
  if (!compte) return { error: 'Compte introuvable' };

  const file = formData.get('fichier');
  if (!(file instanceof File) || file.size === 0) return { error: 'Aucun fichier sélectionné' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

  let lignes;
  let ignorees;
  try {
    if (isPdf) {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      ({ lignes, ignorees } = parsePdfText(parsed.text));
    } else {
      ({ lignes, ignorees } = parseCsvReleve(buffer.toString('utf-8')));
    }
  } catch (e) {
    return { error: e instanceof Error ? `Impossible de lire le fichier : ${e.message}` : 'Impossible de lire le fichier' };
  }

  if (lignes.length === 0) {
    return { error: "Aucune transaction reconnue dans ce fichier. Vérifiez le format ou saisissez-les manuellement." };
  }

  const [postes, biens, existantes] = await Promise.all([
    prisma.poste.findMany({ where: { scopeId: ctx.scopeId } }),
    prisma.bien.findMany({ where: { scopeId: ctx.scopeId } }),
    // Empreinte des transactions déjà en base sur ce compte, pour ignorer les
    // lignes déjà importées (ex. relevé re-téléversé, ou plages qui se
    // chevauchent entre deux exports successifs).
    prisma.transaction.findMany({ where: { compteId }, select: { date: true, libelle: true, montant: true } }),
  ]);

  const empreinte = (date: Date, libelle: string, montant: number) =>
    `${date.toISOString().slice(0, 10)}|${libelle.trim().toLowerCase()}|${montant.toFixed(2)}`;

  const vues = new Set(existantes.map((t) => empreinte(t.date, t.libelle, t.montant)));

  const importRecord = await prisma.relevBancaireImport.create({
    data: { compteId, fileName: file.name, nbLignes: lignes.length },
  });

  let doublons = 0;
  for (const ligne of lignes) {
    const clef = empreinte(ligne.date, ligne.libelle, ligne.montant);
    if (vues.has(clef)) {
      doublons++;
      continue;
    }
    vues.add(clef);

    const posteId = deviner(ligne.libelle, postes);
    const bien = biens.find((b) => ligne.libelle.toLowerCase().includes(b.adresse.toLowerCase().split(' ').slice(0, 3).join(' ')));
    await prisma.transaction.create({
      data: {
        compteId,
        importId: importRecord.id,
        bienId: bien?.id,
        posteId,
        date: ligne.date,
        libelle: ligne.libelle,
        montant: ligne.montant,
        source: 'IMPORT',
      },
    });
  }

  revalidatePath('/compta');
  return { ok: true, imported: lignes.length - doublons, ignored: ignorees, doublons };
}

export async function createTransactionManuelle(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCurrentContext();
  const compteId = String(formData.get('compteId') ?? '');
  const compte = await prisma.compteBancaire.findFirst({ where: { id: compteId, scopeId: ctx.scopeId } });
  if (!compte) return { error: 'Compte introuvable' };

  const date = new Date(String(formData.get('date')));
  const libelle = String(formData.get('libelle') ?? '').trim();
  const montant = Number(formData.get('montant'));
  const bienId = String(formData.get('bienId') ?? '') || undefined;
  const posteId = String(formData.get('posteId') ?? '') || undefined;

  if (!libelle || Number.isNaN(montant) || Number.isNaN(date.getTime())) {
    return { error: 'Formulaire invalide' };
  }

  await prisma.transaction.create({
    data: { compteId, date, libelle, montant, bienId, posteId, source: 'MANUEL' },
  });
  revalidatePath('/compta');
  return { ok: true };
}

export async function updateTransaction(
  transactionId: string,
  data: { bienId?: string | null; posteId?: string | null },
): Promise<void> {
  const ctx = await getCurrentContext();
  const tx = await prisma.transaction.findFirst({ where: { id: transactionId, compte: { scopeId: ctx.scopeId } } });
  if (!tx) return;
  // Ne met à jour que le(s) champ(s) réellement transmis(s) par l'appelant :
  // le bug corrigé ici écrivait systématiquement { bienId: ..., posteId: null }
  // (ou l'inverse), effaçant la catégorisation existante à chaque changement
  // de bien, et le bien à chaque changement de poste.
  const updateData: { bienId?: string | null; posteId?: string | null } = {};
  if ('bienId' in data) updateData.bienId = data.bienId || null;
  if ('posteId' in data) updateData.posteId = data.posteId || null;
  await prisma.transaction.update({
    where: { id: transactionId },
    data: updateData,
  });
  revalidatePath('/compta');
}

/**
 * Catégorisation automatique rétroactive des transactions non catégorisées :
 * repose sur une correspondance de MONTANT (à 1 € près) avec des valeurs
 * réelles déjà connues — la mensualité d'un prêt, ou le loyer + charges d'un
 * bail — plutôt que sur des mots-clés, car les libellés bruts des relevés
 * (ex. "VIR MLLE BENEDICTE PINON") ne contiennent presque jamais "loyer" ou
 * "mensualité" littéralement. Cette approche évite les faux positifs : ces
 * montants (807,86 € ou 1 005 €...) sont trop spécifiques pour coïncider par
 * hasard avec une transaction sans rapport.
 */
export async function categoriserAutomatiquement(): Promise<{ ok: true; nbMisAJour: number } | { error: string }> {
  const ctx = await getCurrentContext();

  const [postes, prets, locations, transactions] = await Promise.all([
    prisma.poste.findMany({ where: { scopeId: ctx.scopeId } }),
    prisma.pret.findMany({ where: { bien: { scopeId: ctx.scopeId } } }),
    prisma.location.findMany({ where: { bien: { scopeId: ctx.scopeId } } }),
    prisma.transaction.findMany({ where: { compte: { scopeId: ctx.scopeId }, posteId: null } }),
  ]);

  const posteMensualites = postes.find((p) => p.nom === 'Mensualités');
  const posteLoyers = postes.find((p) => p.nom === 'Loyers');
  if (!posteMensualites || !posteLoyers) return { error: 'Postes "Mensualités" / "Loyers" introuvables' };

  const TOLERANCE = 1;
  let nbMisAJour = 0;

  for (const t of transactions) {
    if (t.montant < 0) {
      const pret = prets.find(
        (p) =>
          p.mensualite != null &&
          Math.abs(Math.abs(t.montant) - p.mensualite) < TOLERANCE &&
          (!t.bienId || t.bienId === p.bienId),
      );
      if (pret) {
        await prisma.transaction.update({
          where: { id: t.id },
          data: { posteId: posteMensualites.id, bienId: t.bienId ?? pret.bienId },
        });
        nbMisAJour++;
        continue;
      }
    } else if (t.montant > 0) {
      const location = locations.find(
        (l) =>
          Math.abs(t.montant - (l.loyerHC + l.charges)) < TOLERANCE &&
          (!t.bienId || t.bienId === l.bienId),
      );
      if (location) {
        await prisma.transaction.update({
          where: { id: t.id },
          data: { posteId: posteLoyers.id, bienId: t.bienId ?? location.bienId },
        });
        nbMisAJour++;
        continue;
      }
    }
  }

  revalidatePath('/compta');
  return { ok: true, nbMisAJour };
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const ctx = await getCurrentContext();
  const tx = await prisma.transaction.findFirst({ where: { id: transactionId, compte: { scopeId: ctx.scopeId } } });
  if (!tx) return;
  await prisma.transaction.delete({ where: { id: transactionId } });
  revalidatePath('/compta');
}

/**
 * Supprime les doublons déjà présents en base (même empreinte que celle
 * utilisée à l'import : compte + date + libellé + montant), par exemple issus
 * d'un import répété avant la mise en place de la détection automatique. Ne
 * conserve que la transaction la plus ancienne (createdAt) de chaque groupe.
 */
export async function supprimerDoublons(): Promise<{ ok: true; nbSupprimees: number } | { error: string }> {
  const ctx = await getCurrentContext();
  const transactions = await prisma.transaction.findMany({
    where: { compte: { scopeId: ctx.scopeId } },
    select: { id: true, compteId: true, date: true, libelle: true, montant: true },
    orderBy: { createdAt: 'asc' },
  });

  const empreinte = (t: { compteId: string; date: Date; libelle: string; montant: number }) =>
    `${t.compteId}|${t.date.toISOString().slice(0, 10)}|${t.libelle.trim().toLowerCase()}|${t.montant.toFixed(2)}`;

  const vues = new Set<string>();
  const aSupprimer: string[] = [];
  for (const t of transactions) {
    const clef = empreinte(t);
    if (vues.has(clef)) {
      aSupprimer.push(t.id);
    } else {
      vues.add(clef);
    }
  }

  if (aSupprimer.length > 0) {
    await prisma.transaction.deleteMany({ where: { id: { in: aSupprimer } } });
    revalidatePath('/compta');
  }
  return { ok: true, nbSupprimees: aSupprimer.length };
}

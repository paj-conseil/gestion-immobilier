'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { saveFile, readStoredFile } from '@/lib/storage';
import { bienLabel } from '@/lib/format';
import { renderPdf } from '@/lib/documents/render';
import { sendMail } from '@/lib/email';
import { QuittanceDoc } from '@/lib/documents/pdf/QuittanceDoc';
import { ContratDoc } from '@/lib/documents/pdf/ContratDoc';
import { CautionnementDoc } from '@/lib/documents/pdf/CautionnementDoc';
import { DepotGarantieDoc } from '@/lib/documents/pdf/DepotGarantieDoc';
import { RevisionLoyerDoc } from '@/lib/documents/pdf/RevisionLoyerDoc';
import type { TypeDocumentGenere } from '@/lib/enums';

const DOC_LABEL: Record<string, string> = {
  CONTRAT: 'Contrat de location',
  CAUTIONNEMENT: 'Acte de cautionnement',
  DEPOT_GARANTIE: 'Attestation de dépôt de garantie',
  ETAT_LIEUX: 'État des lieux',
  QUITTANCE: 'Quittance de loyer',
  REVISION_LOYER: 'Révision de loyer',
};

function nomsLocataires(locataires: { locataire: { nom: string; prenom: string } }[]): string {
  return locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(' et ') || '—';
}

export type GenerateResult =
  | { ok: true; documentGenereId: string; fileUrl: string; destinataireEmail?: string | null }
  | { error: string };

export async function generateDocument(formData: FormData): Promise<GenerateResult> {
  const ctx = await getCurrentContext();
  const type = String(formData.get('type')) as TypeDocumentGenere;
  const bienId = String(formData.get('bienId') ?? '');
  const locataireId = String(formData.get('locataireId') ?? '');

  const bien = await prisma.bien.findFirst({ where: { id: bienId, scopeId: ctx.scopeId } });
  if (!bien) return { error: 'Bien introuvable' };

  const location = await prisma.location.findFirst({
    where: { bienId, statut: 'ACTIF', locataires: locataireId ? { some: { locataireId } } : undefined },
    include: { locataires: { include: { locataire: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const locataire = locataireId
    ? await prisma.locataire.findFirst({ where: { id: locataireId, scopeId: ctx.scopeId } })
    : location?.locataires[0]?.locataire ?? null;

  const locatairesNoms = location ? nomsLocataires(location.locataires) : locataire ? `${locataire.prenom} ${locataire.nom}` : '—';

  let pdfBuffer: Buffer;
  let periode: string | undefined;

  try {
    switch (type) {
      case 'QUITTANCE': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const periodeStr = String(formData.get('periode') ?? '');
        const [y, m] = periodeStr.split('-').map(Number);
        const periodeDebut = y && m ? new Date(y, m - 1, 1) : new Date();
        const periodeFin = y && m ? new Date(y, m, 0) : new Date();
        periode = periodeStr;
        pdfBuffer = await renderPdf(
          QuittanceDoc({
            data: {
              bienAdresse: bienLabel(bien),
              bienCodePostal: bien.codePostal,
              bienVille: bien.ville,
              locatairesNoms,
              loyerHC: location.loyerHC,
              charges: location.charges,
              periodeDebut,
              periodeFin,
              dateEmission: new Date(),
            },
          }),
        );
        break;
      }
      case 'CONTRAT': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const garantNom = String(formData.get('garantNom') ?? '');
        const garantAdresse = String(formData.get('garantAdresse') ?? '');
        const garantNationalite = String(formData.get('garantNationalite') ?? '') || undefined;
        pdfBuffer = await renderPdf(
          ContratDoc({
            data: {
              bienAdresse: bienLabel(bien),
              bienCodePostal: bien.codePostal,
              bienVille: bien.ville,
              bienSurface: bien.surface,
              bienType: bien.type,
              bienDescription: bien.description,
              bienNumeroCompteur: bien.numeroCompteur,
              bienTelephone: bien.telephone,
              locatairesNoms,
              loyerHC: location.loyerHC,
              charges: location.charges,
              depotGarantie: location.depotGarantie,
              dateDebut: location.dateDebut,
              dateFin: location.dateFin,
              indiceIRLReference: location.indiceIRLReference,
              dateEmission: new Date(),
              garant: garantNom && garantAdresse ? { nom: garantNom, adresse: garantAdresse, nationalite: garantNationalite } : null,
            },
          }),
        );
        break;
      }
      case 'CAUTIONNEMENT': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const garantNom = String(formData.get('garantNom') ?? '');
        const garantAdresse = String(formData.get('garantAdresse') ?? '');
        const garantDateNaissance = String(formData.get('garantDateNaissance') ?? '') || undefined;
        const garantLieuNaissance = String(formData.get('garantLieuNaissance') ?? '') || undefined;
        if (!garantNom || !garantAdresse) return { error: 'Nom et adresse du garant requis' };
        pdfBuffer = await renderPdf(
          CautionnementDoc({
            data: {
              garantNom,
              garantAdresse,
              garantDateNaissance,
              garantLieuNaissance,
              locatairesNoms,
              bienAdresse: bienLabel(bien),
              bienCodePostal: bien.codePostal,
              bienVille: bien.ville,
              loyerHC: location.loyerHC,
              charges: location.charges,
              dateDebut: location.dateDebut,
              dateEmission: new Date(),
            },
          }),
        );
        break;
      }
      case 'DEPOT_GARANTIE': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const montant = Number(formData.get('montant') ?? location.depotGarantie ?? 0);
        pdfBuffer = await renderPdf(
          DepotGarantieDoc({
            data: {
              locatairesNoms,
              bienAdresse: bienLabel(bien),
              bienCodePostal: bien.codePostal,
              bienVille: bien.ville,
              montant,
              loyerHC: location.loyerHC,
              dateVersement: new Date(),
            },
          }),
        );
        break;
      }
      case 'REVISION_LOYER': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const indiceReference = String(formData.get('indiceReference') ?? 'IRL');
        const indiceRefValeur = Number(formData.get('indiceRefValeur') ?? 0);
        const indiceNouveauValeur = Number(formData.get('indiceNouveauValeur') ?? 0);
        if (!indiceRefValeur || !indiceNouveauValeur) return { error: 'Valeurs des indices IRL requises' };
        pdfBuffer = await renderPdf(
          RevisionLoyerDoc({
            data: {
              locatairesNoms,
              bienAdresse: bienLabel(bien),
              bienCodePostal: bien.codePostal,
              bienVille: bien.ville,
              loyerActuel: location.loyerHC,
              indiceReference,
              indiceRefValeur,
              indiceNouveauValeur,
              dateEffet: new Date(),
              dateEmission: new Date(),
            },
          }),
        );
        break;
      }
      default:
        return { error: "Ce type de document se génère depuis l'écran États des lieux" };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Échec de la génération du document' };
  }

  const key = await saveFile(pdfBuffer, {
    scopeId: ctx.scopeId,
    category: 'generated',
    filename: `${type.toLowerCase()}-${bien.adresse}.pdf`,
  });

  const documentGenere = await prisma.documentGenere.create({
    data: {
      scopeId: ctx.scopeId,
      type,
      bienId: bien.id,
      locationId: location?.id,
      locataireId: locataire?.id,
      periode,
      fileUrl: key,
    },
  });

  revalidatePath('/documents');
  return { ok: true, documentGenereId: documentGenere.id, fileUrl: key, destinataireEmail: locataire?.email };
}

export type SendResult =
  | { ok: true; emailStatus: 'ENVOYE' | 'ECHEC'; emailError?: string }
  | { error: string };

export async function sendGeneratedDocument(documentGenereId: string, formData: FormData): Promise<SendResult> {
  const ctx = await getCurrentContext();
  const doc = await prisma.documentGenere.findFirst({
    where: { id: documentGenereId, scopeId: ctx.scopeId },
    include: { locataire: true },
  });
  if (!doc) return { error: 'Document introuvable' };

  const destinataire = String(formData.get('destinataire') ?? doc.locataire?.email ?? '');
  const corps = String(formData.get('corps') ?? '');
  if (!destinataire) return { error: 'Adresse email du destinataire requise' };

  const pdfBuffer = await readStoredFile(doc.fileUrl);
  const subject = `${DOC_LABEL[doc.type]}${doc.periode ? ' — ' + doc.periode : ''}`;
  const result = await sendMail({
    to: destinataire,
    subject,
    html: corps.replace(/\n/g, '<br/>'),
    attachments: [{ filename: `${doc.type.toLowerCase()}.pdf`, content: pdfBuffer }],
  });

  await prisma.emailLog.create({
    data: {
      documentGenereId: doc.id,
      destinataire,
      sujet: subject,
      statut: result.ok ? 'ENVOYE' : 'ECHEC',
    },
  });

  revalidatePath('/documents');
  if (!result.ok) return { ok: true, emailStatus: 'ECHEC', emailError: result.error };
  return { ok: true, emailStatus: 'ENVOYE' };
}

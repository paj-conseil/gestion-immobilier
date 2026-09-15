'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { saveFile, readStoredFile } from '@/lib/storage';
import { bienLabel, formatDate, montantEnLettres } from '@/lib/format';
import { renderPdf } from '@/lib/documents/render';
import { sendMail } from '@/lib/email';
import { renderEmailTemplate } from '@/lib/email-template';
import { PROPRIETAIRE, RIB, formatMontantPdf } from '@/lib/documents/pdf/styles';
import { DEFAULT_DOC_TEXT } from '@/lib/documents/pdf/text-template';
import { QuittanceDoc, type QuittanceData } from '@/lib/documents/pdf/QuittanceDoc';
import { ContratDoc, type ContratData } from '@/lib/documents/pdf/ContratDoc';
import { CautionnementDoc, type CautionnementData } from '@/lib/documents/pdf/CautionnementDoc';
import { DepotGarantieDoc, type DepotGarantieData } from '@/lib/documents/pdf/DepotGarantieDoc';
import { RevisionLoyerDoc, type RevisionLoyerData } from '@/lib/documents/pdf/RevisionLoyerDoc';
import type { TypeDocumentGenere } from '@/lib/enums';

type AnyDocData = ContratData | CautionnementData | DepotGarantieData | QuittanceData | RevisionLoyerData;
type SignerRole = 'LOCATAIRE' | 'PROPRIETAIRE';

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

function adresseJoin(adresse: string, cp?: string | null, ville?: string | null, sep = ', '): string {
  return [adresse, [cp, ville].filter(Boolean).join(' ')].filter(Boolean).join(sep);
}

/** Rend un PDF à partir de son type et de ses données (utilisé aussi bien à
 * la génération initiale qu'à la régénération lors d'une signature). */
async function renderDocPdf(type: string, data: AnyDocData): Promise<Buffer> {
  switch (type) {
    case 'CONTRAT':
      return renderPdf(ContratDoc({ data: data as ContratData }));
    case 'CAUTIONNEMENT':
      return renderPdf(CautionnementDoc({ data: data as CautionnementData }));
    case 'DEPOT_GARANTIE':
      return renderPdf(DepotGarantieDoc({ data: data as DepotGarantieData }));
    case 'QUITTANCE':
      return renderPdf(QuittanceDoc({ data: data as QuittanceData }));
    case 'REVISION_LOYER':
      return renderPdf(RevisionLoyerDoc({ data: data as RevisionLoyerData }));
    default:
      throw new Error('Type de document inconnu');
  }
}

export type GenerateResult =
  | {
      ok: true;
      documentGenereId: string;
      fileUrl: string;
      destinataireEmail?: string | null;
      signeLe: string | null;
      signeProprietaireLe: string | null;
    }
  | { error: string };

export async function generateDocument(formData: FormData): Promise<GenerateResult> {
  const ctx = await getCurrentContext();
  const type = String(formData.get('type')) as TypeDocumentGenere;
  const bienId = String(formData.get('bienId') ?? '');
  const locataireId = String(formData.get('locataireId') ?? '');

  const parametre = await prisma.documentTypeParametre.findUnique({
    where: { scopeId_type: { scopeId: ctx.scopeId, type } },
  });
  const texteTemplate = parametre?.texteDocument || DEFAULT_DOC_TEXT[type] || '';

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

  const champsParametre = {
    nomAffichage: parametre?.nomAffichage ?? undefined,
    signataireLocataireRequis: parametre?.signataireLocataire ?? true,
    signataireProprietaireRequis: parametre?.signataireProprietaire ?? false,
  };

  let pdfBuffer: Buffer;
  let periode: string | undefined;
  // Conservé pour tous les types afin de pouvoir régénérer le PDF avec la
  // signature incrustée plus tard (signerDocument), sans dépendre des
  // données live (bien/bail), qui peuvent avoir changé depuis.
  let dataJson: AnyDocData | undefined;

  try {
    switch (type) {
      case 'QUITTANCE': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const periodeStr = String(formData.get('periode') ?? '');
        const [y, m] = periodeStr.split('-').map(Number);
        const periodeDebut = y && m ? new Date(y, m - 1, 1) : new Date();
        const periodeFin = y && m ? new Date(y, m, 0) : new Date();
        periode = periodeStr;
        const total = location.loyerHC + location.charges;
        const texteDocument = renderEmailTemplate(texteTemplate, {
          bailleurNom: PROPRIETAIRE.nom,
          locataire: locatairesNoms,
          bienAdresse: adresseJoin(bienLabel(bien), bien.codePostal, bien.ville, ' — '),
          montant: formatMontantPdf(total, { decimals: true }),
          montantLettres: montantEnLettres(total).toUpperCase(),
          loyerHC: formatMontantPdf(location.loyerHC, { decimals: true }),
          charges: formatMontantPdf(location.charges, { decimals: true }),
          total: formatMontantPdf(total, { decimals: true }),
          dateEmission: formatDate(new Date()),
        });
        const quittanceData: QuittanceData = {
          locatairesNoms,
          periodeDebut,
          periodeFin,
          dateEmission: new Date(),
          texteDocument,
          ...champsParametre,
        };
        dataJson = quittanceData;
        pdfBuffer = await renderDocPdf(type, quittanceData);
        break;
      }
      case 'CONTRAT': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const garantNom = String(formData.get('garantNom') ?? '');
        const garantAdresse = String(formData.get('garantAdresse') ?? '');
        const garantNationalite = String(formData.get('garantNationalite') ?? '') || undefined;
        const dateFin = location.dateFin ?? new Date(location.dateDebut.getFullYear() + 1, location.dateDebut.getMonth(), location.dateDebut.getDate());
        const totalMensuel = location.loyerHC + location.charges;
        const moisDepot =
          location.depotGarantie && location.loyerHC ? Math.round((location.depotGarantie / location.loyerHC) * 10) / 10 : null;
        // Le texte de "Composition" / "Contenu du bien" est stocké avec des
        // puces "- " dans la description du bien.
        const [composition, equipements] = (bien.description ?? '').split('Contenu du bien :');
        const clauseCautionnement =
          garantNom && garantAdresse
            ? [
                '## Cautionnement',
                "L'exécution du présent bail est garantie par :",
                `${garantNom.toUpperCase()}, demeurant au ${garantAdresse}, de nationalité ${garantNationalite || 'Française'}, en qualité de caution.`,
                "Il s'agit d'un cautionnement solidaire par lequel la caution renonce aux bénéfices de discussion et de division pour les obligations que le locataire a contractées en signant le présent bail. Son engagement est à durée déterminée et prendra fin à la date d'expiration dudit bail, ou de son renouvellement éventuel. L'engagement de caution est annexé aux présentes.",
              ].join('\n')
            : '';
        const texteDocument = renderEmailTemplate(texteTemplate, {
          bailleurNom: PROPRIETAIRE.nom,
          bailleurAdresse: RIB.adresse,
          bienAdresse: adresseJoin(bienLabel(bien), bien.codePostal, bien.ville, ', '),
          locataire: locatairesNoms,
          dateEmission: formatDate(new Date()),
          dateDebut: formatDate(location.dateDebut),
          dateFin: formatDate(dateFin),
          loyerHC: formatMontantPdf(location.loyerHC, { decimals: true }),
          charges: formatMontantPdf(location.charges, { decimals: true }),
          totalMensuel: formatMontantPdf(totalMensuel, { decimals: true }),
          depotGarantie: formatMontantPdf(location.depotGarantie ?? 0, { decimals: true }),
          depotGarantiePhrase: moisDepot ? ` et correspond à ${moisDepot} mois de loyer hors charges.` : '.',
          indiceIRLRefTexte: location.indiceIRLReference ? ` (référence : ${location.indiceIRLReference})` : '',
          bienNumeroCompteur: bien.numeroCompteur || '—',
          bienTelephone: bien.telephone || '—',
          ribTitulaire: RIB.titulaire,
          ribAdresse: RIB.adresse,
          ribDomiciliation: RIB.domiciliation,
          ribIban: RIB.iban,
          ribBic: RIB.bic,
          composition: composition ? composition.replace('Composition :', '').trim() : '',
          equipements: equipements ? equipements.trim() : '',
          clauseCautionnement,
          piecesJointes: [
            '- RIB pour le versement du loyer',
            "- État des lieux d'entrée",
            '- Reçu de dépôt de garantie',
            clauseCautionnement ? '- Engagement de la caution' : '',
          ]
            .filter(Boolean)
            .join('\n'),
        });
        const contratData: ContratData = {
          bienAdresse: adresseJoin(bienLabel(bien), bien.codePostal, bien.ville, ', '),
          locatairesNoms,
          dateEmission: new Date(),
          texteDocument,
          ...champsParametre,
        };
        dataJson = contratData;
        pdfBuffer = await renderDocPdf(type, contratData);
        break;
      }
      case 'CAUTIONNEMENT': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const garantNom = String(formData.get('garantNom') ?? '');
        const garantAdresse = String(formData.get('garantAdresse') ?? '');
        const garantDateNaissance = String(formData.get('garantDateNaissance') ?? '') || undefined;
        const garantLieuNaissance = String(formData.get('garantLieuNaissance') ?? '') || undefined;
        if (!garantNom || !garantAdresse) return { error: 'Nom et adresse du garant requis' };
        const total = location.loyerHC + location.charges;
        const garantIdentite =
          (garantDateNaissance ? `, né(e) le ${garantDateNaissance}` : '') + (garantLieuNaissance ? ` à ${garantLieuNaissance}` : '');
        const texteDocument = renderEmailTemplate(texteTemplate, {
          garantNom,
          garantIdentite,
          garantAdresse,
          locataire: locatairesNoms,
          bailleurNom: PROPRIETAIRE.nom,
          bailleurAdresse: RIB.adresse,
          bienAdresse: adresseJoin(bienLabel(bien), bien.codePostal, bien.ville, ' - '),
          loyerMontant: formatMontantPdf(total, { decimals: true }),
          loyerMontantLettres: montantEnLettres(total),
          dateEmission: formatDate(new Date()),
        });
        const cautionnementData: CautionnementData = {
          garantNom,
          dateDebut: location.dateDebut,
          dateEmission: new Date(),
          texteDocument,
          ...champsParametre,
        };
        dataJson = cautionnementData;
        pdfBuffer = await renderDocPdf(type, cautionnementData);
        break;
      }
      case 'DEPOT_GARANTIE': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const montant = Number(formData.get('montant') ?? location.depotGarantie ?? 0);
        const moisDepot = location.loyerHC ? Math.round((montant / location.loyerHC) * 10) / 10 : null;
        const texteDocument = renderEmailTemplate(texteTemplate, {
          bailleurNom: PROPRIETAIRE.nom,
          bailleurAdresse: RIB.adresse,
          locataire: locatairesNoms,
          bienAdresse: adresseJoin(bienLabel(bien), bien.codePostal, bien.ville, ' - '),
          montant: formatMontantPdf(montant, { decimals: true }),
          montantLettres: montantEnLettres(montant),
          moisDepotPhrase: moisDepot ? ` correspondant à ${moisDepot} mois de loyer hors charges.` : '.',
          dateVersement: formatDate(new Date()),
        });
        const depotData: DepotGarantieData = {
          locatairesNoms,
          dateVersement: new Date(),
          texteDocument,
          ...champsParametre,
        };
        dataJson = depotData;
        pdfBuffer = await renderDocPdf(type, depotData);
        break;
      }
      case 'REVISION_LOYER': {
        if (!location) return { error: 'Aucun bail actif trouvé pour ce bien / locataire' };
        const indiceReference = String(formData.get('indiceReference') ?? 'IRL');
        const indiceRefValeur = Number(formData.get('indiceRefValeur') ?? 0);
        const indiceNouveauValeur = Number(formData.get('indiceNouveauValeur') ?? 0);
        if (!indiceRefValeur || !indiceNouveauValeur) return { error: 'Valeurs des indices IRL requises' };
        const nouveauLoyer = Math.round(location.loyerHC * (indiceNouveauValeur / indiceRefValeur) * 100) / 100;
        const texteDocument = renderEmailTemplate(texteTemplate, {
          locataire: locatairesNoms,
          bienAdresse: adresseJoin(bienLabel(bien), bien.codePostal, bien.ville, ', '),
          indiceReference,
          dateEffet: formatDate(new Date()),
          loyerActuel: formatMontantPdf(location.loyerHC, { decimals: true }),
          indiceRefValeur: String(indiceRefValeur),
          indiceNouveauValeur: String(indiceNouveauValeur),
          nouveauLoyer: formatMontantPdf(nouveauLoyer, { decimals: true }),
        });
        const revisionData: RevisionLoyerData = {
          locatairesNoms,
          dateEffet: new Date(),
          dateEmission: new Date(),
          texteDocument,
          ...champsParametre,
        };
        dataJson = revisionData;
        pdfBuffer = await renderDocPdf(type, revisionData);
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
      // JSON.stringify/parse convertit les Date en chaînes ISO, seul format
      // accepté par le champ Json — reconverties en Date dans signerDocument.
      dataJson: dataJson ? JSON.parse(JSON.stringify(dataJson)) : undefined,
    },
  });

  revalidatePath('/documents');
  return {
    ok: true,
    documentGenereId: documentGenere.id,
    fileUrl: key,
    destinataireEmail: locataire?.email,
    signeLe: null,
    signeProprietaireLe: null,
  };
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

  const parametre = await prisma.documentTypeParametre.findUnique({
    where: { scopeId_type: { scopeId: ctx.scopeId, type: doc.type } },
  });

  const pdfBuffer = await readStoredFile(doc.fileUrl);
  const sujetBase = parametre?.emailSujet || parametre?.nomAffichage || DOC_LABEL[doc.type];
  const subject = `${sujetBase}${doc.periode ? ' — ' + doc.periode : ''}`;
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

export type SignResult = { ok: true; fileUrl: string } | { error: string };

/**
 * Régénère le PDF d'un document en y incrustant une signature manuscrite
 * capturée à l'écran (locataire/garant OU propriétaire, selon `role`), à
 * partir des données exactes ayant servi à la génération initiale (dataJson)
 * plutôt que des données live (bien/bail), qui ont pu changer depuis (loyer
 * révisé, etc.). La signature de l'autre rôle, si déjà capturée
 * précédemment, est relue depuis le stockage pour ne pas être perdue.
 */
export async function signerDocument(documentGenereId: string, formData: FormData): Promise<SignResult> {
  const ctx = await getCurrentContext();
  const doc = await prisma.documentGenere.findFirst({ where: { id: documentGenereId, scopeId: ctx.scopeId } });
  if (!doc) return { error: 'Document introuvable' };
  if (!doc.dataJson) return { error: 'Ce document ne peut pas être signé électroniquement.' };

  const role = (String(formData.get('role') ?? 'LOCATAIRE') as SignerRole) === 'PROPRIETAIRE' ? 'PROPRIETAIRE' : 'LOCATAIRE';
  const signature = String(formData.get('signature') ?? '');
  const signePar = String(formData.get('signePar') ?? '').trim();
  if (!signature.startsWith('data:image/')) return { error: 'Signature invalide' };
  if (!signePar) return { error: 'Le nom du signataire est requis' };

  const raw = doc.dataJson as Record<string, unknown>;

  const autreSignatureKey = role === 'LOCATAIRE' ? doc.signatureProprietaireUrl : doc.signatureUrl;
  const autreSignatureDataUri = autreSignatureKey
    ? `data:image/png;base64,${(await readStoredFile(autreSignatureKey)).toString('base64')}`
    : null;

  const signaturePrincipale = role === 'LOCATAIRE' ? signature : autreSignatureDataUri;
  const signatureProprietaire = role === 'PROPRIETAIRE' ? signature : autreSignatureDataUri;

  let pdfBuffer: Buffer;
  try {
    if (doc.type === 'CONTRAT') {
      const data: ContratData = {
        ...(raw as unknown as ContratData),
        dateEmission: new Date(raw.dateEmission as string),
        signatureLocataire: signaturePrincipale,
        signatureProprietaire,
      };
      pdfBuffer = await renderDocPdf(doc.type, data);
    } else if (doc.type === 'CAUTIONNEMENT') {
      const data: CautionnementData = {
        ...(raw as unknown as CautionnementData),
        dateDebut: new Date(raw.dateDebut as string),
        dateEmission: new Date(raw.dateEmission as string),
        signatureGarant: signaturePrincipale,
        signatureProprietaire,
      };
      pdfBuffer = await renderDocPdf(doc.type, data);
    } else if (doc.type === 'DEPOT_GARANTIE') {
      const data: DepotGarantieData = {
        ...(raw as unknown as DepotGarantieData),
        dateVersement: new Date(raw.dateVersement as string),
        signatureLocataire: signaturePrincipale,
        signatureProprietaire,
      };
      pdfBuffer = await renderDocPdf(doc.type, data);
    } else if (doc.type === 'QUITTANCE') {
      const data: QuittanceData = {
        ...(raw as unknown as QuittanceData),
        periodeDebut: new Date(raw.periodeDebut as string),
        periodeFin: new Date(raw.periodeFin as string),
        dateEmission: new Date(raw.dateEmission as string),
        signatureLocataire: signaturePrincipale,
        signatureProprietaire,
      };
      pdfBuffer = await renderDocPdf(doc.type, data);
    } else if (doc.type === 'REVISION_LOYER') {
      const data: RevisionLoyerData = {
        ...(raw as unknown as RevisionLoyerData),
        dateEffet: new Date(raw.dateEffet as string),
        dateEmission: new Date(raw.dateEmission as string),
        signatureLocataire: signaturePrincipale,
        signatureProprietaire,
      };
      pdfBuffer = await renderDocPdf(doc.type, data);
    } else {
      return { error: 'Ce type de document ne prend pas en charge la signature électronique.' };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Échec de la génération du document signé' };
  }

  const sigBuffer = Buffer.from(signature.split(',')[1] ?? '', 'base64');
  const [sigKey, pdfKey] = await Promise.all([
    saveFile(sigBuffer, { scopeId: ctx.scopeId, category: 'signatures', filename: `${doc.id}-${role.toLowerCase()}.png` }),
    saveFile(pdfBuffer, { scopeId: ctx.scopeId, category: 'generated', filename: `${doc.type.toLowerCase()}-signe.pdf` }),
  ]);

  await prisma.documentGenere.update({
    where: { id: doc.id },
    data:
      role === 'LOCATAIRE'
        ? { fileUrl: pdfKey, signeLe: new Date(), signePar, signatureUrl: sigKey }
        : { fileUrl: pdfKey, signeProprietaireLe: new Date(), signeProprietairePar: signePar, signatureProprietaireUrl: sigKey },
  });

  revalidatePath('/documents');
  return { ok: true, fileUrl: pdfKey };
}

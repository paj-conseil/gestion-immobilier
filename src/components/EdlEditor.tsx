'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import {
  addEDLItem,
  addEDLPhotosFromKeys,
  addEDLPiece,
  deleteEDLPhoto,
  generateEtatDesLieuxPdf,
  signerEtatDesLieux,
  updateEDLItem,
  updateEDLPhotoUrl,
} from '@/lib/actions/edl-actions';
import { sendGeneratedDocument } from '@/lib/actions/document-actions';
import { fileUrl } from '@/lib/file-url';
import { bienLabel, formatDate } from '@/lib/format';
import { renderEmailTemplate } from '@/lib/email-template';
import { IconCamera, IconComment, IconPlus, IconSend } from '@/components/icons';
import { SignaturePad } from '@/components/SignaturePad';
import type { EtatItem, TypeItemEDL } from '@/lib/enums';

type ItemVM = {
  id: string;
  label: string;
  type: TypeItemEDL;
  etat: EtatItem | null;
  quantite: number | null;
  commentaire: string | null;
};
type PieceVM = { id: string; nom: string; items: ItemVM[] };
type PhotoVM = { id: string; url: string; pieceId: string | null; itemId: string | null };
type EdlVM = {
  id: string;
  type: 'ENTREE' | 'SORTIE';
  fileUrl: string | null;
  bien: { adresse: string; complement?: string | null; ville?: string | null };
  location: { locataires: { locataire: { nom: string; prenom: string } }[] } | null;
  pieces: PieceVM[];
  photos: PhotoVM[];
  signatureBailleurLe: string | null;
  signatureBailleurPar: string | null;
  signatureLocataireLe: string | null;
  signatureLocatairePar: string | null;
};

const ETAT_ORDER: EtatItem[] = ['MAUVAIS', 'USURE', 'BON'];
const ETAT_LABEL: Record<EtatItem, string> = { BON: 'Bon état', USURE: 'Usure normale', MAUVAIS: 'Mauvais état' };
const ETAT_LABEL_COURT: Record<EtatItem, string> = { BON: 'Bon', USURE: 'Usure', MAUVAIS: 'Mauvais' };
const ETAT_CLASS: Record<EtatItem, string> = { BON: 'good', USURE: 'wear', MAUVAIS: 'bad' };

type PhotoTarget = { pieceId?: string; itemId?: string } | null;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image"));
    img.src = src;
  });
}

/** Pivote une image de 90° dans le sens horaire via <canvas> — aucune
 * bibliothèque de traitement d'image n'est disponible, et le pivot
 * physique (plutôt qu'une métadonnée EXIF) garantit que l'orientation
 * corrigée s'affiche aussi bien à l'écran que dans le PDF généré (react-pdf
 * ignore l'orientation EXIF). */
async function rotateImageBlob(src: string): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Rotation indisponible sur ce navigateur');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec de la rotation de l'image"))),
      'image/jpeg',
      0.92,
    );
  });
}

export function EdlEditor({
  edl,
  documentGenereId: documentGenereIdInitial,
  pdfUrlInitial,
  locataireEmail,
  locatairePrenom,
  emailTemplate,
  expediteurNom,
  scopeId,
}: {
  edl: EdlVM;
  documentGenereId: string | null;
  pdfUrlInitial: string | null;
  locataireEmail: string | null;
  locatairePrenom: string | null;
  emailTemplate: string;
  expediteurNom: string;
  scopeId: string;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(pdfUrlInitial);
  const [tailleMo, setTailleMo] = useState<number | null>(null);
  const [documentGenereId, setDocumentGenereId] = useState<string | null>(documentGenereIdInitial);
  const [newPieceName, setNewPieceName] = useState('');
  const generalPhotoInputRef = useRef<HTMLInputElement>(null);
  const sharedPhotoInputRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget>(null);
  const locatairesNoms = edl.location?.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(', ') || '—';

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [destinataire, setDestinataire] = useState(locataireEmail ?? '');
  const [corps, setCorps] = useState(
    renderEmailTemplate(emailTemplate, {
      prenom: locatairePrenom ?? '',
      document: `l'état des lieux ${edl.type === 'ENTREE' ? "d'entrée" : 'de sortie'}`,
      expediteur: expediteurNom,
    }),
  );
  const [signing, setSigning] = useState<'BAILLEUR' | 'LOCATAIRE' | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const [deletedPhotoIds, setDeletedPhotoIds] = useState<Set<string>>(new Set());
  const photosVisibles = edl.photos.filter((p) => !deletedPhotoIds.has(p.id));
  const photosGenerales = photosVisibles.filter((p) => !p.pieceId && !p.itemId);
  const photosDePiece = (pieceId: string) => photosVisibles.filter((p) => p.pieceId === pieceId && !p.itemId);
  const photosDItem = (itemId: string) => photosVisibles.filter((p) => p.itemId === itemId);

  async function onDeletePhoto(photoId: string) {
    if (!confirm('Supprimer cette photo ?')) return;
    setDeletedPhotoIds((prev) => new Set(prev).add(photoId));
    try {
      const res = await deleteEDLPhoto(photoId);
      if ('error' in res) throw new Error(res.error);
    } catch {
      setDeletedPhotoIds((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  }

  const [rotatingId, setRotatingId] = useState<string | null>(null);

  async function onRotatePhoto(photo: PhotoVM) {
    setRotatingId(photo.id);
    setPhotoUploadError(null);
    try {
      const src = fileUrl(photo.url);
      if (!src) throw new Error('Photo introuvable');
      const rotatedBlob = await rotateImageBlob(src);
      const key = `edl/${scopeId}/${crypto.randomUUID()}-rotated.jpg`;
      const blob = await upload(key, rotatedBlob, { access: 'private', handleUploadUrl: '/api/upload/edl-photo' });
      const res = await updateEDLPhotoUrl(photo.id, blob.pathname);
      if ('error' in res) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setPhotoUploadError(e instanceof Error ? e.message : 'Échec de la rotation de la photo');
    } finally {
      setRotatingId(null);
    }
  }

  async function onAddPiece() {
    if (!newPieceName.trim()) return;
    await addEDLPiece(edl.id, newPieceName);
    setNewPieceName('');
    router.refresh();
  }

  async function onAddItem(pieceId: string, label: string) {
    if (!label.trim()) return;
    await addEDLItem(pieceId, label);
    router.refresh();
  }

  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  function openPhotoPicker(target: PhotoTarget) {
    setPhotoTarget(target);
    sharedPhotoInputRef.current?.click();
  }

  // Chaque photo part directement du navigateur vers Vercel Blob (et non via
  // une Server Action) : une photo de smartphone pèse facilement plusieurs
  // Mo, et plusieurs à la fois dépassaient la limite de taille de requête
  // des fonctions serverless Vercel — l'envoi échouait silencieusement.
  async function uploadPhotos(files: FileList, scope?: { pieceId?: string; itemId?: string }) {
    setPhotoUploadError(null);
    setPhotoUploading(true);
    try {
      const keys = await Promise.all(
        Array.from(files).map(async (file) => {
          const key = `edl/${scopeId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
          const blob = await upload(key, file, { access: 'private', handleUploadUrl: '/api/upload/edl-photo' });
          return blob.pathname;
        }),
      );
      await addEDLPhotosFromKeys(edl.id, keys, scope);
      router.refresh();
    } catch (e) {
      setPhotoUploadError(e instanceof Error ? e.message : "Échec de l'envoi des photos");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onSharedPhotoChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    await uploadPhotos(files, photoTarget ?? undefined);
  }

  async function onGeneralPhoto(files: FileList | null) {
    if (!files || files.length === 0) return;
    await uploadPhotos(files);
  }

  async function onGenerate() {
    setGenerating(true);
    const res = await generateEtatDesLieuxPdf(edl.id);
    setGenerating(false);
    if ('fileUrl' in res) {
      setPdfUrl(res.fileUrl);
      setTailleMo(res.tailleMo);
      setDocumentGenereId(res.documentGenereId);
    }
  }

  async function onSign(role: 'BAILLEUR' | 'LOCATAIRE', signatureDataUrl: string, nom: string) {
    setSigning(role);
    setSignError(null);
    const fd = new FormData();
    fd.set('role', role);
    fd.set('signature', signatureDataUrl);
    fd.set('signePar', nom);
    try {
      const res = await signerEtatDesLieux(edl.id, fd);
      if ('error' in res) {
        setSignError(res.error);
        return;
      }
      setPdfUrl(res.fileUrl);
      setTailleMo(res.tailleMo);
      setDocumentGenereId(res.documentGenereId);
      router.refresh();
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setSigning(null);
    }
  }

  async function onSend() {
    if (!documentGenereId) return;
    setSending(true);
    setSendResult(null);
    const fd = new FormData();
    fd.set('destinataire', destinataire);
    fd.set('corps', corps);
    try {
      const res = await sendGeneratedDocument(documentGenereId, fd);
      if ('error' in res) {
        setSendResult(`Erreur : ${res.error}`);
        return;
      }
      setSendResult(res.emailStatus === 'ENVOYE' ? 'Email envoyé avec succès.' : `Échec de l'envoi : ${res.emailError}`);
    } catch (e) {
      setSendResult(`Erreur : ${e instanceof Error ? e.message : 'Une erreur est survenue'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <Link href="/edl" className="link-row" style={{ display: 'inline-block', marginBottom: 6 }}>
            ← Tous les états des lieux
          </Link>
          <h1>États des lieux</h1>
          <p>
            {bienLabel(edl.bien)} · {locatairesNoms}
          </p>
        </div>
        {!edl.fileUrl && (
          <button className="btn btn-primary" onClick={onGenerate} disabled={generating}>
            <IconSend />
            {generating ? 'Génération…' : 'Générer le document'}
          </button>
        )}
      </div>

      {pdfUrl && (
        <div className="alert-row" style={{ padding: '10px 14px', background: 'var(--green-100)', borderRadius: 8, marginBottom: 18 }}>
          <span className="txt">Document généré avec succès{tailleMo !== null ? ` (${tailleMo} Mo)` : ''}.</span>
          <a className="btn" href={fileUrl(pdfUrl)} target="_blank" rel="noreferrer">
            Télécharger le PDF
          </a>
        </div>
      )}

      {photoUploading && (
        <div className="alert-row" style={{ padding: '10px 14px', background: 'var(--stone-100)', borderRadius: 8, marginBottom: 18 }}>
          <span className="txt">Envoi des photos…</span>
        </div>
      )}
      {photoUploadError && (
        <div className="auth-error" style={{ marginBottom: 18 }}>{photoUploadError}</div>
      )}

      <div className="toggle-pair">
        <button className={edl.type === 'ENTREE' ? 'active' : ''} disabled>
          Entrée
        </button>
        <button className={edl.type === 'SORTIE' ? 'active' : ''} disabled>
          Sortie
        </button>
      </div>

      {/* Input de photo partagé par toutes les sections/éléments : on stocke la
          cible (pièce/élément) visée dans photoTarget avant de déclencher le
          sélecteur. Pas d'attribut `capture` : sur Android notamment, il fait
          ouvrir l'appareil photo directement et empêche de choisir plusieurs
          photos déjà présentes dans la galerie — le navigateur propose son
          propre choix "Appareil photo / Galerie / Fichiers" sans lui. */}
      <input
        ref={sharedPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          onSharedPhotoChosen(e.target.files);
          e.target.value = '';
        }}
      />

      {edl.fileUrl ? (
        <div className="panel">
          <div className="panel-body pad">
            <div className="alert-row" style={{ padding: '10px 0' }}>
              <span className="txt">
                Ce dossier a été importé directement depuis un document existant — il n&apos;y a pas de saisie
                pièce par pièce à remplir.
              </span>
              <a className="btn btn-primary" href={fileUrl(edl.fileUrl)} target="_blank" rel="noreferrer">
                Ouvrir le document
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          {edl.pieces.map((piece) => {
            const piecePhotos = photosDePiece(piece.id);
            return (
              <div className="room" key={piece.id}>
                <div className="room-head">
                  <b>{piece.nom}</b>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AddItemInline onAdd={(label) => onAddItem(piece.id, label)} />
                    <button
                      className="item-mini-btn"
                      title="Ajouter une photo à cette section"
                      onClick={() => openPhotoPicker({ pieceId: piece.id })}
                    >
                      <IconCamera />
                    </button>
                  </div>
                </div>
                {piecePhotos.length > 0 && (
                  <div className="room-photos">
                    {piecePhotos.map((p) => (
                      <div className="photo-slot-wrap" key={p.id}>
                        <a className="photo-slot small" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                          <img src={fileUrl(p.url)} alt="" />
                        </a>
                        <button
                          type="button"
                          className="photo-rotate-btn"
                          title="Pivoter cette photo"
                          disabled={rotatingId === p.id}
                          onClick={() => onRotatePhoto(p)}
                        >
                          ↻
                        </button>
                        <button
                          type="button"
                          className="photo-delete-btn"
                          title="Supprimer cette photo"
                          onClick={() => onDeletePhoto(p.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="room-body">
                  {piece.items.map((item) => (
                    <EdlItemRow
                      key={item.id}
                      item={item}
                      photos={photosDItem(item.id)}
                      onAddPhoto={() => openPhotoPicker({ itemId: item.id })}
                      onDeletePhoto={onDeletePhoto}
                      onRotatePhoto={onRotatePhoto}
                      rotatingId={rotatingId}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="field-row" style={{ marginBottom: 18 }}>
            <input
              placeholder="Ajouter une pièce (ex. Balcon, Cave...)"
              value={newPieceName}
              onChange={(e) => setNewPieceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddPiece()}
            />
            <button className="btn" onClick={onAddPiece}>
              <IconPlus />
              Ajouter la pièce
            </button>
          </div>
        </>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Photos générales</h2>
        </div>
        <div className="panel-body pad" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {photosGenerales.map((p) => (
            <div className="photo-slot-wrap" key={p.id}>
              <a className="photo-slot" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                <img src={fileUrl(p.url)} alt="" />
              </a>
              <button
                type="button"
                className="photo-rotate-btn"
                title="Pivoter cette photo"
                disabled={rotatingId === p.id}
                onClick={() => onRotatePhoto(p)}
              >
                ↻
              </button>
              <button
                type="button"
                className="photo-delete-btn"
                title="Supprimer cette photo"
                onClick={() => onDeletePhoto(p.id)}
              >
                ✕
              </button>
            </div>
          ))}
          <input
            ref={generalPhotoInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              onGeneralPhoto(e.target.files);
              e.target.value = '';
            }}
          />
          <button className="photo-slot" onClick={() => generalPhotoInputRef.current?.click()} title="Ajouter une photo">
            <IconPlus />
          </button>
        </div>
      </div>

      {!edl.fileUrl && (
        <div className="panel">
          <div className="panel-head">
            <h2>Signatures et envoi</h2>
          </div>
          <div className="panel-body pad">
            {!documentGenereId ? (
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                Générez d&apos;abord le document (bouton en haut de page) pour pouvoir le signer et l&apos;envoyer.
              </p>
            ) : (
              <>
                <div className="two-col" style={{ marginBottom: 22 }}>
                  <div>
                    <h3 style={{ fontSize: 13, margin: '0 0 10px', fontFamily: 'inherit', fontWeight: 700 }}>Le bailleur</h3>
                    {edl.signatureBailleurLe ? (
                      <div className="alert-row" style={{ padding: '8px 0', background: 'var(--green-100)', borderRadius: 8 }}>
                        <span className="txt">
                          Signé le {formatDate(edl.signatureBailleurLe)} par {edl.signatureBailleurPar}.
                        </span>
                      </div>
                    ) : (
                      <SignaturePad
                        onSubmit={(dataUrl, nom) => onSign('BAILLEUR', dataUrl, nom)}
                        submitting={signing === 'BAILLEUR'}
                      />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 13, margin: '0 0 10px', fontFamily: 'inherit', fontWeight: 700 }}>Le(s) locataire(s)</h3>
                    {edl.signatureLocataireLe ? (
                      <div className="alert-row" style={{ padding: '8px 0', background: 'var(--green-100)', borderRadius: 8 }}>
                        <span className="txt">
                          Signé le {formatDate(edl.signatureLocataireLe)} par {edl.signatureLocatairePar}.
                        </span>
                      </div>
                    ) : (
                      <SignaturePad
                        defaultName={locatairesNoms !== '—' ? locatairesNoms : ''}
                        onSubmit={(dataUrl, nom) => onSign('LOCATAIRE', dataUrl, nom)}
                        submitting={signing === 'LOCATAIRE'}
                      />
                    )}
                  </div>
                </div>
                {signError && <div className="auth-error" style={{ marginBottom: 16 }}>{signError}</div>}

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                  <h3 style={{ fontSize: 13, margin: '0 0 10px', fontFamily: 'inherit', fontWeight: 700 }}>
                    Envoyer au locataire
                  </h3>
                  {sendResult && (
                    <div className="alert-row" style={{ padding: '8px 0', background: 'var(--green-100)', borderRadius: 8, marginBottom: 12 }}>
                      <span className="txt">{sendResult}</span>
                    </div>
                  )}
                  <div className="field">
                    <label>Destinataire</label>
                    <input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} placeholder="locataire@mail.com" />
                  </div>
                  <div className="field">
                    <label>Message</label>
                    <textarea rows={5} value={corps} onChange={(e) => setCorps(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" type="button" onClick={onSend} disabled={sending || !destinataire}>
                    <IconSend />
                    {sending ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EdlItemRow({
  item,
  photos,
  onAddPhoto,
  onDeletePhoto,
  onRotatePhoto,
  rotatingId,
}: {
  item: ItemVM;
  photos: PhotoVM[];
  onAddPhoto: () => void;
  onDeletePhoto: (photoId: string) => void;
  onRotatePhoto: (photo: PhotoVM) => void;
  rotatingId: string | null;
}) {
  const router = useRouter();
  const [commentOpen, setCommentOpen] = useState(!!item.commentaire);
  const [commentaire, setCommentaire] = useState(item.commentaire ?? '');
  const [quantite, setQuantite] = useState(item.quantite ?? 0);
  // État local optimiste : la couleur change au clic sans attendre l'aller-
  // retour serveur (updateEDLItem + router.refresh() suivent en arrière-plan).
  const [etatLocal, setEtatLocal] = useState<EtatItem | null>(item.etat);

  function onSetEtat(etat: EtatItem) {
    const next = etatLocal === etat ? null : etat;
    setEtatLocal(next);
    updateEDLItem(item.id, { etat: next }).then(() => router.refresh());
  }

  async function onSaveComment() {
    if (commentaire === (item.commentaire ?? '')) return;
    await updateEDLItem(item.id, { commentaire: commentaire.trim() || null });
    router.refresh();
  }

  async function onSaveQuantite() {
    if (quantite === (item.quantite ?? 0)) return;
    await updateEDLItem(item.id, { quantite });
    router.refresh();
  }

  return (
    <div className="edl-item">
      <div className="edl-item-row">
        <span>{item.label}</span>
        <div className="edl-item-actions">
          {item.type === 'QUANTITE' ? (
            <input
              type="number"
              min={0}
              className="qty-input"
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
              onBlur={onSaveQuantite}
            />
          ) : (
            <div className="etat-picker">
              {ETAT_ORDER.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`etat-btn ${ETAT_CLASS[e]}${etatLocal === e ? ' active' : ''}`}
                  title={ETAT_LABEL[e]}
                  onClick={() => onSetEtat(e)}
                >
                  {ETAT_LABEL_COURT[e]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={`item-mini-btn${item.commentaire ? ' has-content' : ''}`}
            title="Ajouter un commentaire"
            onClick={() => setCommentOpen((v) => !v)}
          >
            <IconComment />
          </button>
          <button
            type="button"
            className={`item-mini-btn${photos.length > 0 ? ' has-content' : ''}`}
            title="Ajouter une photo"
            onClick={onAddPhoto}
          >
            <IconCamera />
          </button>
        </div>
      </div>
      {commentOpen && (
        <input
          className="item-comment"
          placeholder="Commentaire..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          onBlur={onSaveComment}
        />
      )}
      {photos.length > 0 && (
        <div className="item-photos">
          {photos.map((p) => (
            <div className="photo-slot-wrap" key={p.id}>
              <a className="photo-slot small" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                <img src={fileUrl(p.url)} alt="" />
              </a>
              <button
                type="button"
                className="photo-rotate-btn"
                title="Pivoter cette photo"
                disabled={rotatingId === p.id}
                onClick={() => onRotatePhoto(p)}
              >
                ↻
              </button>
              <button
                type="button"
                className="photo-delete-btn"
                title="Supprimer cette photo"
                onClick={() => onDeletePhoto(p.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemInline({ onAdd }: { onAdd: (label: string) => void }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <span className="link-row" onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
        + Ajouter un élément
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', gap: 6 }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--line)', borderRadius: 4 }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onAdd(value);
            setValue('');
            setEditing(false);
          }
        }}
      />
      <button
        className="link-row"
        onClick={() => {
          onAdd(value);
          setValue('');
          setEditing(false);
        }}
      >
        OK
      </button>
    </span>
  );
}

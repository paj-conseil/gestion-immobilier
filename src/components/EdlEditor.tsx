'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  addEDLItem,
  addEDLPhoto,
  addEDLPiece,
  generateEtatDesLieuxPdf,
  signerEtatDesLieux,
  updateEDLItem,
} from '@/lib/actions/edl-actions';
import { sendGeneratedDocument } from '@/lib/actions/document-actions';
import { fileUrl } from '@/lib/file-url';
import { bienLabel, formatDate } from '@/lib/format';
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

export function EdlEditor({
  edl,
  documentGenereId: documentGenereIdInitial,
  pdfUrlInitial,
  locataireEmail,
}: {
  edl: EdlVM;
  documentGenereId: string | null;
  pdfUrlInitial: string | null;
  locataireEmail: string | null;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(pdfUrlInitial);
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
    `Bonjour,\n\nVeuillez trouver ci-joint l'état des lieux ${edl.type === 'ENTREE' ? "d'entrée" : 'de sortie'}.\n\nCordialement,`,
  );
  const [signing, setSigning] = useState<'BAILLEUR' | 'LOCATAIRE' | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const photosGenerales = edl.photos.filter((p) => !p.pieceId && !p.itemId);
  const photosDePiece = (pieceId: string) => edl.photos.filter((p) => p.pieceId === pieceId && !p.itemId);
  const photosDItem = (itemId: string) => edl.photos.filter((p) => p.itemId === itemId);

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

  function openPhotoPicker(target: PhotoTarget) {
    setPhotoTarget(target);
    sharedPhotoInputRef.current?.click();
  }

  async function onSharedPhotoChosen(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set('photo', file);
    await addEDLPhoto(edl.id, fd, photoTarget ?? undefined);
    router.refresh();
  }

  async function onGeneralPhoto(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set('photo', file);
    await addEDLPhoto(edl.id, fd);
    router.refresh();
  }

  async function onGenerate() {
    setGenerating(true);
    const res = await generateEtatDesLieuxPdf(edl.id);
    setGenerating(false);
    if ('fileUrl' in res) {
      setPdfUrl(res.fileUrl);
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
          <span className="txt">Document généré avec succès.</span>
          <a className="btn" href={fileUrl(pdfUrl)} target="_blank" rel="noreferrer">
            Télécharger le PDF
          </a>
        </div>
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
          sélecteur, plutôt que de gérer une ref par élément. capture="environment"
          propose l'appareil photo en priorité sur mobile, sans empêcher de choisir
          une photo déjà prise dans la galerie. */}
      <input
        ref={sharedPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          onSharedPhotoChosen(e.target.files?.[0]);
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
                      <a key={p.id} className="photo-slot small" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
                        <img src={fileUrl(p.url)} alt="" />
                      </a>
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
            <a key={p.id} className="photo-slot" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
              <img src={fileUrl(p.url)} alt="" />
            </a>
          ))}
          <input
            ref={generalPhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              onGeneralPhoto(e.target.files?.[0]);
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
}: {
  item: ItemVM;
  photos: PhotoVM[];
  onAddPhoto: () => void;
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
            <a key={p.id} className="photo-slot small" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
              <img src={fileUrl(p.url)} alt="" />
            </a>
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

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  addEDLItem,
  addEDLPhoto,
  addEDLPiece,
  generateEtatDesLieuxPdf,
  updateEDLItem,
} from '@/lib/actions/edl-actions';
import { fileUrl } from '@/lib/file-url';
import { bienLabel } from '@/lib/format';
import { IconPlus, IconSend } from '@/components/icons';
import type { EtatItem } from '@/lib/enums';

type ItemVM = { id: string; label: string; etat: EtatItem; commentaire: string | null };
type PieceVM = { id: string; nom: string; items: ItemVM[] };
type PhotoVM = { id: string; url: string };
type EdlVM = {
  id: string;
  type: 'ENTREE' | 'SORTIE';
  bien: { adresse: string; complement?: string | null; ville?: string | null };
  location: { locataires: { locataire: { nom: string; prenom: string } }[] } | null;
  pieces: PieceVM[];
  photos: PhotoVM[];
};

const ETAT_CYCLE: EtatItem[] = ['BON', 'USURE', 'MAUVAIS'];
const ETAT_LABEL: Record<EtatItem, string> = { BON: 'Bon état', USURE: 'Usure normale', MAUVAIS: 'Mauvais état' };
const ETAT_CLASS: Record<EtatItem, string> = { BON: 'good', USURE: 'wear', MAUVAIS: 'bad' };

export function EdlEditor({ edl }: { edl: EdlVM }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [newPieceName, setNewPieceName] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const locatairesNoms = edl.location?.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(', ') || '—';

  async function cycleEtat(item: ItemVM) {
    const next = ETAT_CYCLE[(ETAT_CYCLE.indexOf(item.etat) + 1) % ETAT_CYCLE.length];
    await updateEDLItem(item.id, { etat: next });
    router.refresh();
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

  async function onPhoto(file: File | undefined) {
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
    if ('fileUrl' in res) setPdfUrl(res.fileUrl);
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
        <button className="btn btn-primary" onClick={onGenerate} disabled={generating}>
          <IconSend />
          {generating ? 'Génération…' : 'Générer le document'}
        </button>
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

      {edl.pieces.map((piece) => (
        <div className="room" key={piece.id}>
          <div className="room-head">
            <b>{piece.nom}</b>
            <AddItemInline onAdd={(label) => onAddItem(piece.id, label)} />
          </div>
          <div className="room-body">
            {piece.items.map((item) => (
              <div className="room-item" key={item.id}>
                {item.label}
                <button
                  className={`state-pill ${ETAT_CLASS[item.etat]}`}
                  onClick={() => cycleEtat(item)}
                  title="Cliquer pour changer l'état"
                >
                  {ETAT_LABEL[item.etat]}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

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

      <div className="panel">
        <div className="panel-head">
          <h2>Photos jointes</h2>
        </div>
        <div className="panel-body pad" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {edl.photos.map((p) => (
            <a key={p.id} className="photo-slot" href={fileUrl(p.url)} target="_blank" rel="noreferrer">
              <img src={fileUrl(p.url)} alt="" />
            </a>
          ))}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          <button className="photo-slot" onClick={() => photoInputRef.current?.click()} title="Ajouter une photo">
            <IconPlus />
          </button>
        </div>
      </div>
    </>
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

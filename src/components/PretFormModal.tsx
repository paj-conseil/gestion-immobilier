'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { createPret, updatePret, deletePret } from '@/lib/actions/bien-actions';
import { IconClose } from '@/components/icons';
import { MontantField } from '@/components/MontantField';
import { fileUrl } from '@/lib/file-url';
import { toDateInputValue } from '@/lib/format';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export type PretDefaults = {
  id?: string;
  banque?: string | null;
  montant?: number | null;
  tauxInteret?: number | null;
  mensualite?: number | null;
  dureeMois?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  tableauAmortissementUrl?: string | null;
  capitalRestantDu?: number | null;
  capitalRestantDuDate?: string | null;
};

/**
 * Modale contrôlée : le parent gère l'ouverture (state + rendu conditionnel)
 * et doit la rendre HORS de tout ancêtre avec `transform` (ex. le drawer
 * biens, qui a `transform: translateX(...)` pour son animation) — sinon
 * l'overlay `position: fixed` se retrouve piégé dans les bornes de cet
 * ancêtre au lieu de couvrir tout l'écran.
 */
export function PretFormModal({
  bienId,
  defaults,
  scopeId,
  onClose,
}: {
  bienId: string;
  defaults?: PretDefaults;
  scopeId: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const router = useRouter();
  const isEdit = !!defaults?.id;

  const [dateDebut, setDateDebut] = useState(toDateInputValue(defaults?.dateDebut));
  const [dureeMois, setDureeMois] = useState(defaults?.dureeMois?.toString() ?? '');
  const [dateFin, setDateFin] = useState(toDateInputValue(defaults?.dateFin));
  // La date de fin ne se recalcule automatiquement que tant que l'utilisateur
  // ne l'a pas modifiée lui-même (sinon on écraserait une saisie manuelle).
  const [dateFinManuelle, setDateFinManuelle] = useState(!!defaults?.dateFin);

  function recalcDateFin(nextDateDebut: string, nextDureeMois: string) {
    if (dateFinManuelle || !nextDateDebut || !nextDureeMois) return;
    const n = Number(nextDureeMois);
    if (!Number.isFinite(n) || n <= 0) return;
    const d = new Date(nextDateDebut + 'T00:00:00');
    d.setMonth(d.getMonth() + n);
    setDateFin(toDateInputValue(d));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    try {
      // Le PDF (souvent plusieurs Mo pour un tableau scanné par la banque)
      // part directement du navigateur vers Vercel Blob — le corps d'une
      // Server Action est plafonné bien plus bas par la plateforme, quelle
      // que soit la valeur de bodySizeLimit dans next.config.mjs.
      const fileInput = form.elements.namedItem('tableauAmortissement') as HTMLInputElement | null;
      const file = fileInput?.files?.[0];
      fd.delete('tableauAmortissement');
      if (file && file.size > 0) {
        setUploadPct(0);
        const key = `prets/${scopeId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
        const blob = await upload(key, file, {
          access: 'private',
          handleUploadUrl: '/api/upload/pret-tableau',
          onUploadProgress: ({ percentage }) => setUploadPct(percentage),
        });
        fd.set('tableauAmortissementUrl', blob.pathname);
        setUploadPct(null);
      }

      const result = isEdit ? await updatePret(defaults!.id!, fd) : await createPret(bienId, fd);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setUploadPct(null);
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!defaults?.id) return;
    if (!confirm('Supprimer ce prêt ?')) return;
    setLoading(true);
    try {
      const result = await deletePret(defaults.id);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{isEdit ? 'Modifier le prêt' : 'Ajouter un prêt'}</h3>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {error && <div className="auth-error">{error}</div>}

            <div className="field">
              <label>Banque</label>
              <input name="banque" placeholder="BNP Paribas" defaultValue={defaults?.banque ?? ''} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Montant emprunté</label>
                <MontantField name="montant" placeholder="167 000" defaultValue={defaults?.montant} />
              </div>
              <div className="field">
                <label>Taux (%)</label>
                <input name="tauxInteret" type="number" step="0.001" placeholder="1.51" defaultValue={defaults?.tauxInteret ?? ''} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Mensualité</label>
                <MontantField name="mensualite" defaultValue={defaults?.mensualite} />
              </div>
              <div className="field">
                <label>Durée (mois)</label>
                <input
                  name="dureeMois"
                  type="number"
                  placeholder="240"
                  value={dureeMois}
                  onChange={(e) => {
                    setDureeMois(e.target.value);
                    recalcDateFin(dateDebut, e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Date de début</label>
                <input
                  name="dateDebut"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    recalcDateFin(e.target.value, dureeMois);
                  }}
                />
              </div>
              <div className="field">
                <label>Date de fin</label>
                <input
                  name="dateFin"
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFinManuelle(true);
                    setDateFin(e.target.value);
                  }}
                />
                {!dateFinManuelle && dateFin && (
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Calculée automatiquement (date de début + durée)
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0 14px', paddingTop: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10 }}>
                Tableau d&apos;amortissement
              </div>
              <div style={{ fontSize: 11.3, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
                Joindre le dernier tableau reçu de la banque (PDF) et reporter le capital restant dû qui y figure —
                sert de point de départ au calcul de l&apos;emprunt restant, plus fiable que l&apos;estimation
                théorique seule.
              </div>
              {defaults?.tableauAmortissementUrl && (
                <div style={{ marginBottom: 10 }}>
                  <a className="link-row" href={fileUrl(defaults.tableauAmortissementUrl)} target="_blank" rel="noreferrer">
                    Voir le tableau actuellement joint
                  </a>
                </div>
              )}
              <div className="field">
                <label>{defaults?.tableauAmortissementUrl ? 'Remplacer le tableau (PDF)' : 'Tableau (PDF)'}</label>
                <input name="tableauAmortissement" type="file" accept="application/pdf,.pdf" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Capital restant dû</label>
                  <MontantField name="capitalRestantDu" defaultValue={defaults?.capitalRestantDu} />
                </div>
                <div className="field">
                  <label>À la date du</label>
                  <input
                    name="capitalRestantDuDate"
                    type="date"
                    defaultValue={toDateInputValue(defaults?.capitalRestantDuDate)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-foot" style={{ justifyContent: isEdit ? 'space-between' : 'flex-end' }}>
            {isEdit && (
              <button type="button" className="btn btn-ghost" style={{ color: 'var(--brick)' }} onClick={onDelete} disabled={loading}>
                Supprimer
              </button>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {uploadPct !== null ? `Envoi du PDF… ${uploadPct}%` : loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

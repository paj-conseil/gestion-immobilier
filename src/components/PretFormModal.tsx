'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createPret, updatePret, deletePret } from '@/lib/actions/bien-actions';
import { IconClose } from '@/components/icons';
import { MontantField } from '@/components/MontantField';
import { toDateInputValue } from '@/lib/format';

export type PretDefaults = {
  id?: string;
  banque?: string | null;
  montant?: number | null;
  tauxInteret?: number | null;
  mensualite?: number | null;
  dureeMois?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
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
  onClose,
}: {
  bienId: string;
  defaults?: PretDefaults;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const result = isEdit ? await updatePret(defaults!.id!, fd) : await createPret(bienId, fd);
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  async function onDelete() {
    if (!defaults?.id) return;
    if (!confirm('Supprimer ce prêt ?')) return;
    setLoading(true);
    const result = await deletePret(defaults.id);
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
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
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

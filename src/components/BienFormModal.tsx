'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBien, updateBien } from '@/lib/actions/bien-actions';
import { IconClose, IconPlus } from '@/components/icons';
import { MontantField } from '@/components/MontantField';

type BienDefaults = {
  id?: string;
  adresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  complement?: string | null;
  type?: string | null;
  statut?: string | null;
  surface?: number | null;
  description?: string | null;
  telephone?: string | null;
  numeroCompteur?: string | null;
  prixAchat?: number | null;
  fraisNotaire?: number | null;
  montantTravaux?: number | null;
  apportPersonnel?: number | null;
};

export function BienFormModal({
  trigger,
  defaults,
  onSaved,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  defaults?: BienDefaults;
  onSaved?: () => void;
  /**
   * Mode contrôlé (pas de `trigger` rendu ici) : à utiliser quand la modale
   * doit être rendue HORS de tout ancêtre avec `transform` (ex. le drawer
   * biens) — sinon l'overlay `position: fixed` reste piégé dans les bornes
   * de cet ancêtre au lieu de couvrir tout l'écran.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const isEdit = !!defaults?.id;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);

    try {
      const result = isEdit ? await updateBien(defaults!.id!, fd) : await createBien(fd);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      formRef.current?.reset();
      router.refresh();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!isControlled && (
        <span onClick={() => setOpen(true)}>
          {trigger ?? (
            <button className="btn btn-primary">
              <IconPlus />
              Ajouter un logement
            </button>
          )}
        </span>
      )}

      <div className={`overlay${open ? ' show' : ''}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal">
          <div className="modal-head">
            <h3>{isEdit ? 'Modifier le logement' : 'Ajouter un logement'}</h3>
            <button className="modal-close" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <form ref={formRef} onSubmit={onSubmit}>
            <div className="modal-body">
              {error && <div className="auth-error">{error}</div>}

              <div className="field">
                <label>Adresse</label>
                <input name="adresse" required placeholder="12 rue des Lilas" defaultValue={defaults?.adresse ?? ''} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Code postal</label>
                  <input name="codePostal" placeholder="37000" defaultValue={defaults?.codePostal ?? ''} />
                </div>
                <div className="field">
                  <label>Ville</label>
                  <input name="ville" placeholder="Tours" defaultValue={defaults?.ville ?? ''} />
                </div>
              </div>
              <div className="field">
                <label>Complément (étage, bâtiment...)</label>
                <input name="complement" placeholder="Appt 4ème" defaultValue={defaults?.complement ?? ''} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Type de bien</label>
                  <select name="type" defaultValue={defaults?.type ?? 'APPARTEMENT'}>
                    <option value="APPARTEMENT">Appartement</option>
                    <option value="STUDIO">Studio</option>
                    <option value="MAISON">Maison</option>
                    <option value="FOYER">Foyer</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select name="statut" defaultValue={defaults?.statut ?? 'VACANT'}>
                    <option value="LOUE">Loué</option>
                    <option value="VACANT">Vacant</option>
                    <option value="PERSO">Résidence perso.</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Surface (m²)</label>
                  <input name="surface" type="number" step="0.1" placeholder="32" defaultValue={defaults?.surface ?? ''} />
                </div>
                <div className="field">
                  <label>N° compteur électrique</label>
                  <input name="numeroCompteur" placeholder="041827" defaultValue={defaults?.numeroCompteur ?? ''} />
                </div>
              </div>
              <div className="field">
                <label>Téléphone de contact</label>
                <input name="telephone" placeholder="01 47 XX XX XX" defaultValue={defaults?.telephone ?? ''} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea name="description" placeholder="Description du logement, pièces..." defaultValue={defaults?.description ?? ''} />
              </div>

              <div className="field">
                <label>Photos</label>
                <input name="photos" type="file" accept="image/*" multiple />
              </div>

              <div style={{ borderTop: '1px solid var(--line)', margin: '18px 0 14px', paddingTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10 }}>
                  Achat
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Prix d&apos;achat</label>
                    <MontantField name="prixAchat" placeholder="145 000" defaultValue={defaults?.prixAchat} />
                  </div>
                  <div className="field">
                    <label>Frais de notaire</label>
                    <MontantField name="fraisNotaire" defaultValue={defaults?.fraisNotaire} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Montant des travaux</label>
                    <MontantField name="montantTravaux" placeholder="18 000" defaultValue={defaults?.montantTravaux} />
                  </div>
                  <div className="field">
                    <label>Apport personnel</label>
                    <MontantField name="apportPersonnel" placeholder="10 000" defaultValue={defaults?.apportPersonnel} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                  Les prêts bancaires se gèrent depuis l&apos;onglet Financement de la fiche du bien (un bien peut
                  avoir plusieurs prêts).
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Enregistrer le logement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

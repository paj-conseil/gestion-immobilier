'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createLocataire } from '@/lib/actions/locataire-actions';
import { bienLabel } from '@/lib/format';
import { IconClose, IconPlus } from '@/components/icons';

type BienOption = { id: string; adresse: string; complement?: string | null };

export function LocataireFormModal({ biens }: { biens: BienOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attacherBien, setAttacherBien] = useState(biens.length > 0);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    if (!attacherBien) fd.delete('bienId');

    const result = await createLocataire(fd);
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <IconPlus />
        Ajouter un locataire
      </button>

      <div className={`overlay${open ? ' show' : ''}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal">
          <div className="modal-head">
            <h3>Ajouter un locataire</h3>
            <button className="modal-close" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              {error && <div className="auth-error">{error}</div>}

              <div className="field-row">
                <div className="field">
                  <label>Prénom</label>
                  <input name="prenom" required placeholder="Claire" />
                </div>
                <div className="field">
                  <label>Nom</label>
                  <input name="nom" required placeholder="Lefort" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Email</label>
                  <input name="email" type="email" placeholder="claire.lefort@mail.com" />
                </div>
                <div className="field">
                  <label>Téléphone</label>
                  <input name="telephone" placeholder="06 XX XX XX XX" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Date de naissance</label>
                  <input name="dateNaissance" type="date" />
                </div>
                <div className="field">
                  <label>Lieu de naissance</label>
                  <input name="lieuNaissance" placeholder="Tours" />
                </div>
              </div>

              {biens.length > 0 && (
                <div style={{ borderTop: '1px solid var(--line)', margin: '18px 0 14px', paddingTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.8, fontWeight: 600, marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={attacherBien}
                      onChange={(e) => setAttacherBien(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    Rattacher immédiatement à un bail
                  </label>

                  {attacherBien && (
                    <>
                      <div className="field">
                        <label>Bien</label>
                        <select name="bienId" required={attacherBien}>
                          {biens.map((b) => (
                            <option key={b.id} value={b.id}>
                              {bienLabel(b)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Loyer hors charges</label>
                          <input name="loyerHC" type="number" step="0.01" required={attacherBien} placeholder="770" />
                        </div>
                        <div className="field">
                          <label>Charges</label>
                          <input name="charges" type="number" step="0.01" placeholder="65" />
                        </div>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Dépôt de garantie</label>
                          <input name="depotGarantie" type="number" step="0.01" />
                        </div>
                        <div className="field">
                          <label>Date d&apos;entrée</label>
                          <input name="dateDebut" type="date" required={attacherBien} />
                        </div>
                      </div>
                      <div className="field-row">
                        <div className="field">
                          <label>Date de fin de bail</label>
                          <input name="dateFin" type="date" />
                        </div>
                        <div className="field">
                          <label>Prochaine révision IRL</label>
                          <input name="dateProchaineRevision" type="date" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Enregistrement…' : 'Enregistrer le locataire'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

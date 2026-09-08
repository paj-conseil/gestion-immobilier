'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createEtatDesLieux } from '@/lib/actions/edl-actions';
import { bienLabel, formatDate } from '@/lib/format';
import { IconClose, IconPlus } from '@/components/icons';

type BienOption = { id: string; adresse: string; complement?: string | null };
type EdlVM = {
  id: string;
  type: 'ENTREE' | 'SORTIE';
  date: string;
  bien: { adresse: string; complement?: string | null };
  location: { locataires: { locataire: { nom: string; prenom: string } }[] } | null;
};

export function EdlListView({ edls, biens }: { edls: EdlVM[]; biens: BienOption[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const res = await createEtatDesLieux(fd);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.push(`/edl/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <IconPlus />
          Nouvel état des lieux
        </button>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bien</th>
                <th>Type</th>
                <th>Locataire</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {edls.map((e) => (
                <tr key={e.id}>
                  <td>{bienLabel(e.bien)}</td>
                  <td>
                    <span className={`chip ${e.type === 'ENTREE' ? 'green' : 'amber'}`}>
                      {e.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td>{e.location?.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(', ') || '—'}</td>
                  <td className="mono">{formatDate(e.date)}</td>
                  <td>
                    <a className="link-row" href={`/edl/${e.id}`}>
                      Ouvrir →
                    </a>
                  </td>
                </tr>
              ))}
              {edls.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--ink-soft)' }}>
                    Aucun état des lieux pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`overlay${open ? ' show' : ''}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="modal">
          <div className="modal-head">
            <h3>Nouvel état des lieux</h3>
            <button className="modal-close" onClick={() => setOpen(false)}>
              <IconClose />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              {error && <div className="auth-error">{error}</div>}
              <div className="field">
                <label>Bien</label>
                <select name="bienId" required>
                  {biens.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bienLabel(b)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Type</label>
                <select name="type" defaultValue="ENTREE">
                  <option value="ENTREE">Entrée</option>
                  <option value="SORTIE">Sortie</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Création…' : 'Créer et ouvrir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

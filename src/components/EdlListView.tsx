'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { createEtatDesLieux, importEtatDesLieux, deleteEtatDesLieux } from '@/lib/actions/edl-actions';
import { bienLabel, formatDate } from '@/lib/format';
import { IconClose, IconPlus } from '@/components/icons';
import { BienFormModal } from '@/components/BienFormModal';
import { LocataireFormModal } from '@/components/LocataireFormModal';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

type LocataireOption = { id: string; nom: string; prenom: string };
type BienOption = {
  id: string;
  adresse: string;
  complement?: string | null;
  locations: { locataires: { locataire: LocataireOption }[] }[];
};
type EdlVM = {
  id: string;
  type: 'ENTREE' | 'SORTIE';
  date: string;
  fileUrl: string | null;
  bien: { adresse: string; complement?: string | null };
  location: { locataires: { locataire: { nom: string; prenom: string } }[] } | null;
};

export function EdlListView({ edls, biens, scopeId }: { edls: EdlVM[]; biens: BienOption[]; scopeId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'structure' | 'import'>('structure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bienId, setBienId] = useState(biens[0]?.id ?? '');
  const [locataireId, setLocataireId] = useState('');
  // Retiré de l'affichage dès la confirmation, sans attendre le
  // rafraîchissement serveur (router.refresh() suit derrière pour la
  // cohérence, mais la ligne disparaît immédiatement à l'écran).
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const visibleEdls = edls.filter((e) => !deletedIds.has(e.id));
  const router = useRouter();

  const bien = biens.find((b) => b.id === bienId);
  const locataires = useMemo(
    () => bien?.locations.flatMap((loc) => loc.locataires.map((x) => x.locataire)) ?? [],
    [bien],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    try {
      if (mode === 'import') {
        // Un scan/PDF dépasse facilement la limite de taille de requête
        // d'une Server Action — il part directement du navigateur vers le
        // stockage, seule sa clé transite ensuite par l'action.
        const fileInput = form.elements.namedItem('fichier') as HTMLInputElement | null;
        const file = fileInput?.files?.[0];
        fd.delete('fichier');
        if (!file || file.size === 0) {
          setError('Aucun fichier sélectionné');
          return;
        }
        const key = `edl/${scopeId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
        const blob = await upload(key, file, { access: 'private', handleUploadUrl: '/api/upload/edl-photo' });
        fd.set('fichierUrl', blob.pathname);
      }
      const res = mode === 'import' ? await importEtatDesLieux(fd) : await createEtatDesLieux(fd);
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

  async function onDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (!confirm("Supprimer cet état des lieux ? Cette action est irréversible (document, pièces et photos associés).")) return;
    setDeletedIds((prev) => new Set(prev).add(id));
    try {
      const res = await deleteEtatDesLieux(id);
      if ('error' in res) {
        alert(res.error);
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleEdls.map((e) => (
                <tr key={e.id}>
                  <td>{bienLabel(e.bien)}</td>
                  <td>
                    <span className={`chip ${e.type === 'ENTREE' ? 'green' : 'amber'}`}>
                      {e.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td>{e.location?.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(', ') || '—'}</td>
                  <td className="mono">{formatDate(e.date)}</td>
                  <td>{e.fileUrl && <span className="chip neutral">Document importé</span>}</td>
                  <td>
                    <a className="link-row" href={`/edl/${e.id}`}>
                      Ouvrir →
                    </a>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn small danger"
                      title="Supprimer cet état des lieux"
                      onClick={(e2) => onDelete(e2, e.id)}
                    >
                      <IconClose />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleEdls.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: 'var(--ink-soft)' }}>
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
              <div className="toggle-pair compact" style={{ marginBottom: 16 }}>
                <button type="button" className={mode === 'structure' ? 'active' : ''} onClick={() => setMode('structure')}>
                  Saisie structurée
                </button>
                <button type="button" className={mode === 'import' ? 'active' : ''} onClick={() => setMode('import')}>
                  Importer un document
                </button>
              </div>
              {mode === 'import' && (
                <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '0 0 14px' }}>
                  Pour un dossier déjà en cours dont l&apos;état des lieux n&apos;a pas été fait via
                  l&apos;application : joignez directement le document existant (scan, PDF) au lieu de le
                  remplir pièce par pièce.
                </p>
              )}
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Bien</label>
                  <BienFormModal
                    trigger={
                      <span className="link-row" style={{ fontSize: 11.5 }}>
                        + Nouveau bien
                      </span>
                    }
                    onSaved={(id) => setBienId(id)}
                  />
                </div>
                <select
                  name="bienId"
                  required
                  value={bienId}
                  onChange={(e) => {
                    setBienId(e.target.value);
                    setLocataireId('');
                  }}
                >
                  {biens.map((b) => (
                    <option key={b.id} value={b.id}>
                      {bienLabel(b)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Locataire</label>
                  <LocataireFormModal
                    biens={biens}
                    trigger={
                      <span className="link-row" style={{ fontSize: 11.5 }}>
                        + Nouveau locataire
                      </span>
                    }
                    onSaved={(id) => setLocataireId(id)}
                  />
                </div>
                <select name="locataireId" value={locataireId} onChange={(e) => setLocataireId(e.target.value)}>
                  <option value="">— Non précisé —</option>
                  {locataires.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.prenom} {l.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Type</label>
                  <select name="type" defaultValue="ENTREE">
                    <option value="ENTREE">Entrée</option>
                    <option value="SORTIE">Sortie</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </div>
              </div>
              {mode === 'import' && (
                <div className="field">
                  <label>Document (PDF, photo du document...)</label>
                  <input name="fichier" type="file" accept=".pdf,image/*" required />
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Création…' : mode === 'import' ? 'Importer et ouvrir' : 'Créer et ouvrir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

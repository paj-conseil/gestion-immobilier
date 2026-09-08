'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bienLabel, toDateInputValue } from '@/lib/format';
import { fileUrl } from '@/lib/file-url';
import { uploadLocataireDocument, createBail, updateLocataire, updateBail } from '@/lib/actions/locataire-actions';
import { IconClose } from '@/components/icons';

export type DocVM = { id: string; type: string; statut: string; fileUrl: string | null };
export type LocationVM = {
  id: string;
  statut: string;
  loyerHC: number;
  charges: number;
  dateDebut: string;
  dateFin: string | null;
  depotGarantie: number | null;
  depotGarantieDateReglement: string | null;
  depotGarantieRembourse: number | null;
  depotGarantieDateRemboursement: string | null;
  bien: { id: string; adresse: string; complement?: string | null };
};
export type LocationLinkVM = { location: LocationVM };
export type LocataireVM = {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  statut: string;
  documents: DocVM[];
  locations: LocationLinkVM[];
};
export type BienOption = { id: string; adresse: string; complement?: string | null };

export const DOC_TYPES: { type: string; label: string }[] = [
  { type: 'CONTRAT_SIGNE', label: 'Contrat signé' },
  { type: 'CNI', label: 'CNI' },
  { type: 'ATTESTATION_ASSURANCE', label: 'Attestation assurance' },
];

export function DocStatus({ doc, label }: { doc?: DocVM; label: string }) {
  const ok = doc?.statut === 'RECU';
  return (
    <span
      className={`doc-dot ${ok ? 'ok' : 'miss'}`}
      title={`${label} : ${ok ? 'reçue' : 'manquante'}`}
      style={{ display: 'inline-block' }}
    />
  );
}

export function bailDe(l: LocataireVM): LocationVM | undefined {
  return (
    l.locations.find((x) => x.location.statut === 'ACTIF')?.location ??
    [...l.locations].sort(
      (a, b) => new Date(b.location.dateDebut).getTime() - new Date(a.location.dateDebut).getTime(),
    )[0]?.location
  );
}

export function LocataireEditModal({
  locataire,
  biens,
  onClose,
  onSaved,
}: {
  locataire: LocataireVM;
  biens: BienOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showBail, setShowBail] = useState(false);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const router = useRouter();
  const bail = bailDe(locataire);

  async function onFileChosen(type: string, file: File | undefined) {
    if (!file) return;
    setUploading(type);
    setError(null);
    const fd = new FormData();
    fd.set('fichier', file);
    try {
      const res = await uploadLocataireDocument(locataire.id, type as never, fd);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi du document");
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    try {
      const res1 = await updateLocataire(locataire.id, fd);
      if ('error' in res1) {
        setError(res1.error);
        return;
      }
      if (bail) {
        const res2 = await updateBail(bail.id, fd);
        if ('error' in res2) {
          setError(res2.error);
          return;
        }
      }
      onSaved();
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
          <h3>
            Modifier {locataire.prenom} {locataire.nom}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {error && <div className="auth-error">{error}</div>}

            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10 }}>
              Coordonnées
            </div>
            <div className="field-row">
              <div className="field">
                <label>Prénom</label>
                <input name="prenom" required defaultValue={locataire.prenom} />
              </div>
              <div className="field">
                <label>Nom</label>
                <input name="nom" required defaultValue={locataire.nom} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" defaultValue={locataire.email ?? ''} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input name="telephone" defaultValue={locataire.telephone ?? ''} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Date de naissance</label>
                <input name="dateNaissance" type="date" defaultValue={toDateInputValue(locataire.dateNaissance)} />
              </div>
              <div className="field">
                <label>Lieu de naissance</label>
                <input name="lieuNaissance" defaultValue={locataire.lieuNaissance ?? ''} />
              </div>
            </div>

            {bail ? (
              <>
                <div
                  style={{
                    borderTop: '1px solid var(--line)',
                    margin: '16px 0 14px',
                    paddingTop: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
                    Bail — {bienLabel(bail.bien)}
                  </div>
                  <span className={`chip ${bail.dateFin ? 'neutral' : 'green'}`}>
                    {bail.dateFin ? 'Inactif' : 'Actif'}
                  </span>
                </div>
                <input type="hidden" name="statut" value={locataire.statut} />
                <div className="field-row">
                  <div className="field">
                    <label>Loyer hors charges</label>
                    <input name="loyerHC" type="number" step="0.01" required defaultValue={bail.loyerHC} />
                  </div>
                  <div className="field">
                    <label>Charges</label>
                    <input name="charges" type="number" step="0.01" defaultValue={bail.charges} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Date d&apos;entrée</label>
                    <input name="dateDebut" type="date" required defaultValue={toDateInputValue(bail.dateDebut)} />
                  </div>
                  <div className="field">
                    <label>Date de sortie</label>
                    <input name="dateFin" type="date" defaultValue={toDateInputValue(bail.dateFin)} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: -8, marginBottom: 14 }}>
                  Renseigner une date de sortie passe automatiquement ce locataire en statut inactif.
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', margin: '4px 0 10px' }}>
                  Dépôt de garantie
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Montant de la caution</label>
                    <input name="depotGarantie" type="number" step="0.01" defaultValue={bail.depotGarantie ?? ''} />
                  </div>
                  <div className="field">
                    <label>Date de règlement</label>
                    <input
                      name="depotGarantieDateReglement"
                      type="date"
                      defaultValue={toDateInputValue(bail.depotGarantieDateReglement)}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Montant remboursé</label>
                    <input
                      name="depotGarantieRembourse"
                      type="number"
                      step="0.01"
                      defaultValue={bail.depotGarantieRembourse ?? ''}
                    />
                  </div>
                  <div className="field">
                    <label>Date de remboursement</label>
                    <input
                      name="depotGarantieDateRemboursement"
                      type="date"
                      defaultValue={toDateInputValue(bail.depotGarantieDateRemboursement)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0 14px', paddingTop: 14 }}>
                  <div className="field">
                    <label>Statut</label>
                    <select name="statut" defaultValue={locataire.statut}>
                      <option value="ACTIF">Actif</option>
                      <option value="INACTIF">Inactif (ancien locataire)</option>
                    </select>
                  </div>
                </div>
                {biens.length > 0 &&
                  (showBail ? (
                    <BailForm
                      locataireId={locataire.id}
                      biens={biens}
                      onDone={() => {
                        setShowBail(false);
                        router.refresh();
                      }}
                    />
                  ) : (
                    <button type="button" className="btn" style={{ marginBottom: 14 }} onClick={() => setShowBail(true)}>
                      Rattacher à un bien
                    </button>
                  ))}
              </>
            )}

            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', margin: '18px 0 10px', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              Documents du dossier
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...DOC_TYPES, { type: 'RIB', label: 'RIB' }, { type: 'AUTRE', label: 'Autre document' }].map((dt) => {
                const doc = locataire.documents.find((d) => d.type === dt.type);
                const ok = doc?.statut === 'RECU';
                return (
                  <div
                    key={dt.type}
                    className="room-item"
                    style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-s)' }}
                  >
                    <span>
                      <DocStatus doc={doc} label={dt.label} /> — {dt.label}
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {ok && doc?.fileUrl && (
                        <a className="link-row" href={fileUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                          Voir
                        </a>
                      )}
                      <input
                        ref={(el) => {
                          inputsRef.current[dt.type] = el;
                        }}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => onFileChosen(dt.type, e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        className="link-row"
                        disabled={uploading === dt.type}
                        onClick={() => inputsRef.current[dt.type]?.click()}
                      >
                        {uploading === dt.type ? 'Envoi…' : ok ? 'Remplacer' : 'Téléverser'}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BailForm({ locataireId, biens, onDone }: { locataireId: string; biens: BienOption[]; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bienRef = useRef<HTMLSelectElement>(null);
  const loyerRef = useRef<HTMLInputElement>(null);
  const chargesRef = useRef<HTMLInputElement>(null);
  const dateDebutRef = useRef<HTMLInputElement>(null);

  async function onCreate() {
    if (!bienRef.current?.value || !loyerRef.current?.value || !dateDebutRef.current?.value) {
      setError('Bien, loyer et date d\'entrée sont requis');
      return;
    }
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set('bienId', bienRef.current.value);
    fd.set('loyerHC', loyerRef.current.value);
    fd.set('charges', chargesRef.current?.value ?? '');
    fd.set('dateDebut', dateDebutRef.current.value);
    try {
      const result = await createBail(locataireId, fd);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 14, border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', padding: 14 }}>
      {error && <div className="auth-error">{error}</div>}
      <div className="field">
        <label>Bien</label>
        <select ref={bienRef} required>
          {biens.map((b) => (
            <option key={b.id} value={b.id}>
              {bienLabel(b)}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Loyer HC</label>
          <input ref={loyerRef} type="number" step="0.01" required />
        </div>
        <div className="field">
          <label>Charges</label>
          <input ref={chargesRef} type="number" step="0.01" />
        </div>
      </div>
      <div className="field">
        <label>Date d&apos;entrée</label>
        <input ref={dateDebutRef} type="date" required />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={onCreate}
      >
        {loading ? 'Enregistrement…' : 'Créer le bail'}
      </button>
    </div>
  );
}

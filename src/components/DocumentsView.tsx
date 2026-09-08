'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { generateDocument, sendGeneratedDocument } from '@/lib/actions/document-actions';
import { bienLabel, formatDate } from '@/lib/format';
import { fileUrl } from '@/lib/file-url';
import { IconCheck, IconDocuments, IconEdl, IconReceipt, IconSend, IconShield, IconTrend } from '@/components/icons';

type LocataireVM = { id: string; nom: string; prenom: string; email?: string | null };
type BienVM = {
  id: string;
  adresse: string;
  complement?: string | null;
  locations: { locataires: { locataire: LocataireVM }[] }[];
};
type EnvoiVM = {
  id: string;
  destinataire: string;
  sujet: string;
  envoyeLe: string;
  statut: string;
  documentGenere: { type: string; fileUrl: string };
};

const DOC_TYPES: { type: string; label: string; sub: string; icon: typeof IconDocuments }[] = [
  { type: 'CONTRAT', label: 'Contrat de location', sub: 'Bail meublé, avec annexes', icon: IconDocuments },
  { type: 'CAUTIONNEMENT', label: 'Acte de cautionnement', sub: 'Garant personne physique', icon: IconCheck },
  { type: 'DEPOT_GARANTIE', label: 'Attestation dépôt de garantie', sub: "Confirmation d'encaissement", icon: IconShield },
  { type: 'ETAT_LIEUX', label: 'État des lieux', sub: 'Entrée ou sortie', icon: IconEdl },
  { type: 'QUITTANCE', label: 'Quittance de loyer', sub: 'Mensuelle, par locataire', icon: IconReceipt },
  { type: 'REVISION_LOYER', label: 'Révision de loyer', sub: 'Calcul IRL + courrier', icon: IconTrend },
];

const STATUT_CHIP: Record<string, string> = { ENVOYE: 'green', OUVERT: 'green', ECHEC: 'brick' };
const STATUT_LABEL: Record<string, string> = { ENVOYE: 'Envoyé', OUVERT: 'Ouvert', ECHEC: 'Échec' };
const TYPE_LABEL: Record<string, string> = {
  CONTRAT: 'Contrat de location',
  CAUTIONNEMENT: 'Acte de cautionnement',
  DEPOT_GARANTIE: 'Dépôt de garantie',
  ETAT_LIEUX: 'État des lieux',
  QUITTANCE: 'Quittance de loyer',
  REVISION_LOYER: 'Révision de loyer',
};

export function DocumentsView({ biens, envois }: { biens: BienVM[]; envois: EnvoiVM[] }) {
  const [bienId, setBienId] = useState(biens[0]?.id ?? '');
  const [type, setType] = useState('CONTRAT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ documentGenereId: string; fileUrl: string } | null>(null);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [destinataire, setDestinataire] = useState('');
  const [corps, setCorps] = useState('');

  const bien = biens.find((b) => b.id === bienId);
  const locataires = useMemo(
    () => bien?.locations.flatMap((loc) => loc.locataires.map((l) => l.locataire)) ?? [],
    [bien],
  );
  const [locataireId, setLocataireId] = useState('');
  const currentLocataireId = locataireId || locataires[0]?.id || '';
  const currentLocataire = locataires.find((l) => l.id === currentLocataireId);

  function resetGeneration() {
    setGenerated(null);
    setSendResult(null);
    setDestinataire('');
    setCorps('');
  }

  async function onGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGenerated(null);
    setSendResult(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await generateDocument(fd);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setGenerated({ documentGenereId: res.documentGenereId, fileUrl: res.fileUrl });
      const nomDest = currentLocataire ? `${currentLocataire.prenom} ${currentLocataire.nom}` : 'Madame, Monsieur';
      setDestinataire(res.destinataireEmail ?? '');
      setCorps(
        `Bonjour ${nomDest},\n\nVeuillez trouver ci-joint : ${(TYPE_LABEL[type] ?? type).toLowerCase()}.\n\nN'hésitez pas à revenir vers moi pour toute question.\n\nCordialement,\nPierre Jaubert`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue lors de la génération');
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    if (!generated) return;
    setSending(true);
    setSendResult(null);
    const fd = new FormData();
    fd.set('destinataire', destinataire);
    fd.set('corps', corps);
    try {
      const res = await sendGeneratedDocument(generated.documentGenereId, fd);
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

  if (biens.length === 0) {
    return <div className="panel panel-body pad">Ajoutez d&apos;abord un bien pour pouvoir générer des documents.</div>;
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2>1. Choisir le bien</h2>
        </div>
        <div className="panel-body pad">
          <div className="field-row">
            <div className="field">
              <label>Bien concerné</label>
              <select
                value={bienId}
                onChange={(e) => {
                  setBienId(e.target.value);
                  setLocataireId('');
                  resetGeneration();
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
              <label>Locataire</label>
              <select
                value={currentLocataireId}
                onChange={(e) => {
                  setLocataireId(e.target.value);
                  resetGeneration();
                }}
              >
                {locataires.length === 0 && <option value="">Aucun locataire actif</option>}
                {locataires.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.prenom} {l.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>2. Choisir un type de document</h2>
        </div>
        <div className="panel-body pad">
          <div className="doc-type-grid">
            {DOC_TYPES.map((dt) => {
              const Icon = dt.icon;
              return (
                <button
                  key={dt.type}
                  type="button"
                  className={`doc-type${type === dt.type ? ' selected' : ''}`}
                  onClick={() => {
                    setType(dt.type);
                    resetGeneration();
                  }}
                >
                  <Icon />
                  <strong>{dt.label}</strong>
                  <span>{dt.sub}</span>
                </button>
              );
            })}
          </div>

          {type === 'ETAT_LIEUX' ? (
            <div className="alert-row" style={{ padding: 0 }}>
              <span className="txt">
                La génération d&apos;un état des lieux se fait pièce par pièce depuis l&apos;écran dédié.
              </span>
              <Link href="/edl" className="btn btn-primary">
                Aller aux états des lieux →
              </Link>
            </div>
          ) : (
            <form onSubmit={onGenerate}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="bienId" value={bienId} />
              <input type="hidden" name="locataireId" value={currentLocataireId} />
              {error && <div className="auth-error">{error}</div>}

              {type === 'QUITTANCE' && (
                <div className="field">
                  <label>Période</label>
                  <input name="periode" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
                </div>
              )}

              {(type === 'CAUTIONNEMENT' || type === 'CONTRAT') && (
                <>
                  <div className="field-row">
                    <div className="field">
                      <label>Nom du garant{type === 'CONTRAT' ? ' (optionnel)' : ''}</label>
                      <input name="garantNom" required={type === 'CAUTIONNEMENT'} placeholder="Jean Dupont" />
                    </div>
                    {type === 'CAUTIONNEMENT' && (
                      <>
                        <div className="field">
                          <label>Date de naissance</label>
                          <input name="garantDateNaissance" placeholder="12/03/1998" />
                        </div>
                      </>
                    )}
                    {type === 'CONTRAT' && (
                      <div className="field">
                        <label>Nationalité</label>
                        <input name="garantNationalite" placeholder="Française" />
                      </div>
                    )}
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Adresse du garant{type === 'CONTRAT' ? ' (optionnel)' : ''}</label>
                      <input name="garantAdresse" required={type === 'CAUTIONNEMENT'} placeholder="12 rue de la Paix, 75002 Paris" />
                    </div>
                    {type === 'CAUTIONNEMENT' && (
                      <div className="field">
                        <label>Lieu de naissance</label>
                        <input name="garantLieuNaissance" placeholder="Tours" />
                      </div>
                    )}
                  </div>
                </>
              )}

              {type === 'DEPOT_GARANTIE' && (
                <div className="field">
                  <label>Montant</label>
                  <input name="montant" type="number" step="0.01" placeholder="820" />
                </div>
              )}

              {type === 'REVISION_LOYER' && (
                <div className="field-row">
                  <div className="field">
                    <label>Indice de référence</label>
                    <input name="indiceReference" defaultValue="IRL T2 2026" />
                  </div>
                  <div className="field">
                    <label>Valeur indice base</label>
                    <input name="indiceRefValeur" type="number" step="0.01" required />
                  </div>
                  <div className="field">
                    <label>Nouvelle valeur indice</label>
                    <input name="indiceNouveauValeur" type="number" step="0.01" required />
                  </div>
                </div>
              )}

              <button className="btn btn-primary" type="submit" disabled={loading || !currentLocataireId}>
                {loading ? 'Génération…' : 'Générer'}
              </button>
            </form>
          )}
        </div>
      </div>

      {generated && (
        <div className="panel">
          <div className="panel-head">
            <h2>3. Vérifier le document</h2>
          </div>
          <div className="panel-body pad">
            <iframe
              src={fileUrl(generated.fileUrl)}
              style={{ width: '100%', height: 520, border: '1px solid var(--line)', borderRadius: 8, marginBottom: 16 }}
              title="Aperçu du document"
            />
            <a className="btn" href={fileUrl(generated.fileUrl)} target="_blank" rel="noreferrer" style={{ marginBottom: 20, display: 'inline-flex' }}>
              Ouvrir dans un nouvel onglet
            </a>

            <h3 style={{ fontSize: 14, margin: '4px 0 12px' }}>4. Envoyer par email</h3>
            {sendResult && (
              <div className="alert-row" style={{ padding: '10px 0', background: 'var(--green-100)', borderRadius: 8, marginBottom: 14 }}>
                <span className="txt">{sendResult}</span>
              </div>
            )}
            <div className="field">
              <label>Destinataire</label>
              <input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} placeholder="locataire@mail.com" />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea rows={7} value={corps} onChange={(e) => setCorps(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="button" onClick={onSend} disabled={sending || !destinataire}>
              <IconSend />
              {sending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Suivi des envois</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Destinataire</th>
                <th>Envoyé le</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {envois.map((e) => (
                <tr key={e.id}>
                  <td>
                    <a className="link-row" href={fileUrl(e.documentGenere.fileUrl)} target="_blank" rel="noreferrer">
                      {TYPE_LABEL[e.documentGenere.type] ?? e.sujet}
                    </a>
                  </td>
                  <td>{e.destinataire}</td>
                  <td className="mono">{formatDate(e.envoyeLe)}</td>
                  <td>
                    <span className={`chip ${STATUT_CHIP[e.statut] ?? 'neutral'}`}>{STATUT_LABEL[e.statut] ?? e.statut}</span>
                  </td>
                </tr>
              ))}
              {envois.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--ink-soft)' }}>
                    Aucun envoi pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

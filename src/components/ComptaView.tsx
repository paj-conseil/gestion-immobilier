'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bienLabel, formatDate, formatMontant } from '@/lib/format';
import {
  createCompteBancaire,
  createTransactionManuelle,
  importReleve,
  updateTransaction,
  categoriserAutomatiquement,
  deleteTransaction,
  supprimerDoublons,
} from '@/lib/actions/compta-actions';
import { IconPlus, IconUpload, IconWarning, IconClose } from '@/components/icons';

type CompteVM = { id: string; banque: string; libelle: string };
type PosteVM = { id: string; nom: string; type: string };
type BienVM = { id: string; adresse: string; complement?: string | null };
type OperationVM = {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  bienId: string | null;
  bien: { adresse: string; complement?: string | null } | null;
  posteId: string | null;
  poste: { id: string; nom: string; type: string } | null;
};

const NON_CATEGORISE = 'Non catégorisé';

const ORDRE_POSTES = [
  'Loyers',
  'Locations',
  'Mensualités',
  'Assurance prêt',
  'Charges copropriété',
  'Assurance logement',
  'Charges énergie (EDF, eau, internet...)',
  'Taxe foncière',
  'Frais de gestion',
  'Frais bancaires',
  'Impôts',
  'Travaux / entretien',
  'Caution (encaissement / remboursement)',
  'Autres charges',
  'Autres',
  'Virement interne',
];

function ordrePoste(nom: string): number {
  const i = ORDRE_POSTES.indexOf(nom);
  return i === -1 ? ORDRE_POSTES.length : i;
}

export function ComptaView({
  comptes,
  operations,
  postes,
  biens,
  recommandations,
}: {
  comptes: CompteVM[];
  operations: OperationVM[];
  postes: PosteVM[];
  biens: BienVM[];
  recommandations: { titre: string; detail: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [compteImportId, setCompteImportId] = useState(comptes[0]?.id ?? '');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showAddCompte, setShowAddCompte] = useState(false);
  const [showManuel, setShowManuel] = useState(false);
  const [categorisation, setCategorisation] = useState(false);
  const [categorisationMsg, setCategorisationMsg] = useState<string | null>(null);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [posteJump, setPosteJump] = useState<{ poste: string; ts: number } | null>(null);
  const [tab, setTab] = useState<'consolide' | 'donnees' | 'operations' | 'recommandations'>('consolide');

  function jumpToPoste(poste: string) {
    setPosteJump({ poste, ts: Date.now() });
    setTab('operations');
  }

  useEffect(() => {
    if (!showActionsMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showActionsMenu]);

  async function onCategoriserAuto() {
    setCategorisation(true);
    setCategorisationMsg(null);
    try {
      const res = await categoriserAutomatiquement();
      if ('error' in res) {
        setCategorisationMsg(res.error);
        return;
      }
      setCategorisationMsg(
        res.nbMisAJour > 0
          ? `${res.nbMisAJour} transaction(s) catégorisée(s) automatiquement (loyers / mensualités).`
          : 'Aucune nouvelle transaction reconnue.',
      );
      router.refresh();
    } catch (e) {
      setCategorisationMsg(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setCategorisation(false);
    }
  }

  async function onSupprimerDoublons() {
    if (!confirm('Supprimer les opérations en doublon (même compte, date, libellé et montant) ? Seule la plus ancienne de chaque groupe est conservée.')) return;
    setDedupLoading(true);
    setCategorisationMsg(null);
    try {
      const res = await supprimerDoublons();
      if ('error' in res) {
        setCategorisationMsg(res.error);
        return;
      }
      setCategorisationMsg(
        res.nbSupprimees > 0 ? `${res.nbSupprimees} doublon(s) supprimé(s).` : 'Aucun doublon trouvé.',
      );
      router.refresh();
    } catch (e) {
      setCategorisationMsg(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setDedupLoading(false);
    }
  }

  async function onDeleteTransaction(txId: string) {
    if (!confirm('Supprimer cette opération ?')) return;
    try {
      await deleteTransaction(txId);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  }

  async function onFile(file: File | undefined) {
    if (!file || !compteImportId) return;
    setImporting(true);
    setImportMsg(null);
    const fd = new FormData();
    fd.set('fichier', file);
    try {
      const res = await importReleve(compteImportId, fd);
      if ('error' in res) {
        setImportMsg(res.error);
      } else {
        const parts = [`${res.imported} transaction(s) importée(s)`];
        if (res.doublons) parts.push(`${res.doublons} doublon(s) ignoré(s)`);
        if (res.ignored) parts.push(`${res.ignored} ligne(s) non reconnue(s)`);
        setImportMsg(parts.join(', ') + '.');
        router.refresh();
      }
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Une erreur est survenue');
    } finally {
      setImporting(false);
    }
  }

  async function onChangePoste(txId: string, posteId: string) {
    try {
      await updateTransaction(txId, { posteId: posteId || null });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  }
  async function onChangeBien(txId: string, bienId: string) {
    try {
      await updateTransaction(txId, { bienId: bienId || null });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Une erreur est survenue');
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div className="tab-row" style={{ marginBottom: 0, flex: 1, minWidth: 0 }}>
          <button className={tab === 'consolide' ? 'active' : ''} onClick={() => setTab('consolide')}>
            État consolidé
          </button>
          <button className={tab === 'donnees' ? 'active' : ''} onClick={() => setTab('donnees')}>
            Ajouter des données
          </button>
          <button className={tab === 'operations' ? 'active' : ''} onClick={() => setTab('operations')}>
            Opérations
          </button>
          <button className={tab === 'recommandations' ? 'active' : ''} onClick={() => setTab('recommandations')}>
            Recommandations
            {recommandations.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'var(--brick)',
                  color: '#fff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 20,
                }}
              >
                {recommandations.length}
              </span>
            )}
          </button>
        </div>
        {tab === 'operations' && (
          <div className="actions-menu" style={{ flexShrink: 0 }} ref={actionsMenuRef}>
            <button className="link-row" onClick={() => setShowActionsMenu((v) => !v)}>
              Actions ▾
            </button>
            {showActionsMenu && (
              <div className="actions-menu-list">
                <button
                  onClick={() => {
                    setShowActionsMenu(false);
                    onCategoriserAuto();
                  }}
                  disabled={categorisation}
                >
                  {categorisation ? 'Catégorisation…' : 'Catégoriser automatiquement'}
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setShowActionsMenu(false);
                    onSupprimerDoublons();
                  }}
                  disabled={dedupLoading}
                >
                  {dedupLoading ? 'Suppression…' : 'Supprimer les doublons'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'consolide' && <ComptaPivot operations={operations} biens={biens} onPosteClick={jumpToPoste} />}

      {tab === 'donnees' && (
      <div className="panel">
        <div className="panel-body pad">
          <div className="accounts-row" style={{ marginBottom: comptes.length ? 16 : 0 }}>
            {comptes.map((c) => (
              <div className="account-chip" key={c.id}>
                <span className="dot" />
                {c.banque} — {c.libelle}
              </div>
            ))}
            <button className="account-chip" onClick={() => setShowAddCompte((v) => !v)} style={{ cursor: 'pointer' }}>
              <IconPlus width={13} height={13} />
              Ajouter un compte
            </button>
          </div>

          {showAddCompte && <AddCompteForm onDone={() => { setShowAddCompte(false); router.refresh(); }} />}

          {comptes.length === 0 ? (
            <div className="dropzone">Ajoutez d&apos;abord un compte bancaire pour pouvoir importer un relevé.</div>
          ) : (
            <>
              <div className="field-row" style={{ marginBottom: 10, alignItems: 'end' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Compte concerné par l&apos;import</label>
                  <select value={compteImportId} onChange={(e) => setCompteImportId(e.target.value)}>
                    {comptes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.banque} — {c.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="dropzone" style={{ cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <IconUpload style={{ margin: '0 auto 8px', display: 'block' }} />
                {importing ? 'Import en cours…' : 'Cliquez pour choisir un relevé bancaire (PDF/CSV)'}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.pdf,text/csv,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </div>
              <div style={{ fontSize: 11.3, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
                Les doublons (même date, libellé et montant sur ce compte) sont automatiquement repérés et ignorés —
                vous pouvez re-téléverser un relevé qui chevauche un import précédent sans risque.
              </div>
              {importMsg && (
                <div className="auth-error" style={{ background: 'var(--green-100)', color: 'var(--green-700)', marginTop: 10 }}>
                  {importMsg}
                </div>
              )}
            </>
          )}

          <div style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 14 }}>
            <button className="link-row" onClick={() => setShowManuel((v) => !v)}>
              + Ajouter une opération manuellement
            </button>
            {showManuel && (
              <div style={{ marginTop: 14 }}>
                <ManuelForm
                  comptes={comptes}
                  postes={postes}
                  biens={biens}
                  onDone={() => {
                    setShowManuel(false);
                    router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {tab === 'operations' && (
        <OperationsSection
          operations={operations}
          postes={postes}
          biens={biens}
          posteJump={posteJump}
          onChangeBien={onChangeBien}
          onChangePoste={onChangePoste}
          onDelete={onDeleteTransaction}
          categorisationMsg={categorisationMsg}
        />
      )}

      {tab === 'recommandations' && (
      <div className="panel">
        <div className="panel-body">
          {recommandations.map((r, i) => (
            <div className="reco" key={i}>
              <IconWarning />
              <div>
                <b>{r.titre}</b>
                <span>{r.detail}</span>
              </div>
            </div>
          ))}
          {recommandations.length === 0 && (
            <div className="reco">
              <span style={{ color: 'var(--ink-soft)', fontSize: 12.8 }}>Rien à signaler pour le moment.</span>
            </div>
          )}
        </div>
      </div>
      )}
    </>
  );
}

function AddCompteForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="field-row"
      style={{ marginBottom: 16, alignItems: 'end' }}
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const res = await createCompteBancaire(new FormData(e.currentTarget));
          if ('error' in res) setError(res.error);
          else onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Banque</label>
        <input name="banque" required placeholder="BNP Paribas" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Libellé du compte</label>
        <input name="libelle" required placeholder="Compte principal" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        Ajouter
      </button>
      {error && <div className="auth-error">{error}</div>}
    </form>
  );
}

function ManuelForm({
  comptes,
  postes,
  biens,
  onDone,
}: {
  comptes: CompteVM[];
  postes: PosteVM[];
  biens: BienVM[];
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const res = await createTransactionManuelle(new FormData(e.currentTarget));
          if ('error' in res) setError(res.error);
          else onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
          setLoading(false);
        }
      }}
    >
      {error && <div className="auth-error">{error}</div>}
      <div className="field-row">
        <div className="field">
          <label>Compte</label>
          <select name="compteId" required>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.banque} — {c.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="field">
        <label>Libellé</label>
        <input name="libelle" required placeholder="Facture plombier" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Montant (négatif si dépense)</label>
          <input name="montant" type="number" step="0.01" required placeholder="-210" />
        </div>
        <div className="field">
          <label>Bien</label>
          <select name="bienId">
            <option value="">—</option>
            {biens.map((b) => (
              <option key={b.id} value={b.id}>
                {bienLabel(b)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Poste</label>
        <select name="posteId">
          <option value="">Non catégorisé</option>
          {postes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Ajout…' : 'Ajouter la transaction'}
      </button>
    </form>
  );
}

function ComptaPivot({
  operations,
  biens,
  onPosteClick,
}: {
  operations: OperationVM[];
  biens: BienVM[];
  onPosteClick: (poste: string) => void;
}) {
  const [bienId, setBienId] = useState<string>('ALL');

  const filtrees = bienId === 'ALL' ? operations : operations.filter((t) => t.bienId === bienId);

  const annees = [...new Set(filtrees.map((t) => new Date(t.date).getFullYear()))].sort((a, b) => a - b);

  const parPoste = new Map<string, Map<number, number>>();
  for (const t of filtrees) {
    const nom = t.poste?.nom ?? NON_CATEGORISE;
    const annee = new Date(t.date).getFullYear();
    if (!parPoste.has(nom)) parPoste.set(nom, new Map());
    const m = parPoste.get(nom)!;
    m.set(annee, (m.get(annee) ?? 0) + t.montant);
  }
  // Les virements internes (entre comptes du même périmètre) s'affichent à
  // part, sous le Total — ce ne sont ni des revenus ni des charges réels, ils
  // ne doivent donc pas entrer dans son calcul.
  const postesTries = [...parPoste.keys()]
    .filter((nom) => nom !== 'Virement interne')
    .sort((a, b) => ordrePoste(a) - ordrePoste(b) || a.localeCompare(b));
  const virementsInternes = parPoste.get('Virement interne');

  // Le graphique Revenus/Charges ne retient que les postes de loyers/charges
  // réels (type REVENU ou CHARGE) — il exclut les virements internes et les
  // transactions non catégorisées, qui fausseraient la lecture (ex. déblocage
  // de prêt à l'achat, compté comme une grosse entrée ponctuelle).
  const totalParAnnee = new Map<number, number>();
  const revenusParAnnee = new Map<number, number>();
  const chargesParAnnee = new Map<number, number>();
  for (const t of filtrees) {
    if (t.poste?.nom === 'Virement interne') continue;
    const annee = new Date(t.date).getFullYear();
    totalParAnnee.set(annee, (totalParAnnee.get(annee) ?? 0) + t.montant);
    if (t.poste?.type === 'REVENU') revenusParAnnee.set(annee, (revenusParAnnee.get(annee) ?? 0) + t.montant);
    else if (t.poste?.type === 'CHARGE') chargesParAnnee.set(annee, (chargesParAnnee.get(annee) ?? 0) + t.montant);
  }

  const totalGlobal = (nom: string) => [...(parPoste.get(nom)?.values() ?? [])].reduce((s, v) => s + v, 0);
  const maxAbs = Math.max(1, ...annees.flatMap((a) => [revenusParAnnee.get(a) ?? 0, Math.abs(chargesParAnnee.get(a) ?? 0)]));

  return (
    <div className="panel">
      <div style={{ padding: '10px 16px 8px' }}>
        <div className="chip-row">
          <button className={bienId === 'ALL' ? 'active' : ''} onClick={() => setBienId('ALL')}>
            Tous les biens
          </button>
          {biens.map((b) => (
            <button key={b.id} className={bienId === b.id ? 'active' : ''} onClick={() => setBienId(b.id)}>
              {bienLabel(b)}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-body">
        {annees.length === 0 ? (
          <div style={{ color: 'var(--ink-soft)' }}>Aucune transaction catégorisée pour ce périmètre.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-compact table-zebra-dark">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Poste</th>
                    {annees.map((a) => (
                      <th key={a} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {a}
                      </th>
                    ))}
                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {postesTries.map((nom) => (
                    <tr
                      key={nom}
                      onClick={() => onPosteClick(nom)}
                      style={{ cursor: 'pointer' }}
                      title="Cliquer pour voir le détail des opérations de ce poste"
                    >
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="link-row">{nom}</span>
                      </td>
                      {annees.map((a) => {
                        const v = parPoste.get(nom)?.get(a) ?? 0;
                        return (
                          <td key={a} className={`mono ${v >= 0 ? 'amount-pos' : 'amount-neg'}`} style={{ textAlign: 'right' }}>
                            {v !== 0 ? formatMontant(v, { decimals: false }) : '—'}
                          </td>
                        );
                      })}
                      <td className={`mono ${totalGlobal(nom) >= 0 ? 'amount-pos' : 'amount-neg'}`} style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatMontant(totalGlobal(nom))}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--line)' }}>
                    <td style={{ fontWeight: 700 }}>Total</td>
                    {annees.map((a) => {
                      const v = totalParAnnee.get(a) ?? 0;
                      return (
                        <td key={a} className={`mono ${v >= 0 ? 'amount-pos' : 'amount-neg'}`} style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatMontant(v)}
                        </td>
                      );
                    })}
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatMontant([...totalParAnnee.values()].reduce((s, v) => s + v, 0))}
                    </td>
                  </tr>
                  {virementsInternes && (
                    <tr>
                      <td style={{ whiteSpace: 'nowrap', fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                        Virement interne (hors total)
                      </td>
                      {annees.map((a) => {
                        const v = virementsInternes.get(a) ?? 0;
                        return (
                          <td key={a} className="mono" style={{ textAlign: 'right', fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                            {v !== 0 ? formatMontant(v, { decimals: false }) : '—'}
                          </td>
                        );
                      })}
                      <td className="mono" style={{ textAlign: 'right', fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                        {formatMontant([...virementsInternes.values()].reduce((s, v) => s + v, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '18px 0 4px', fontSize: 11.5, color: 'var(--ink-soft)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green-400)', display: 'inline-block' }} />
                Revenus
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--brick)', display: 'inline-block' }} />
                Charges
              </span>
            </div>
            <div className="barchart">
              {annees.map((a) => {
                const revenus = revenusParAnnee.get(a) ?? 0;
                const charges = Math.abs(chargesParAnnee.get(a) ?? 0);
                return (
                  <div className="bar-col" key={a} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                      <b style={{ fontSize: 10 }}>{formatMontant(revenus, { decimals: false })}</b>
                      <div className="bar" style={{ height: `${Math.max(4, (revenus / maxAbs) * 100)}%`, background: 'var(--green-400)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                      <b style={{ fontSize: 10 }}>{formatMontant(charges, { decimals: false })}</b>
                      <div className="bar" style={{ height: `${Math.max(4, (charges / maxAbs) * 100)}%`, background: 'var(--brick)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 0, marginTop: -4 }}>
              {annees.map((a) => (
                <div key={a} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--ink-soft)' }}>
                  {a}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type SortCol = 'date' | 'libelle' | 'bien' | 'poste' | 'montant';

function OperationsSection({
  operations,
  postes,
  biens,
  posteJump,
  onChangeBien,
  onChangePoste,
  onDelete,
  categorisationMsg,
}: {
  operations: OperationVM[];
  postes: PosteVM[];
  biens: BienVM[];
  posteJump: { poste: string; ts: number } | null;
  onChangeBien: (txId: string, bienId: string) => void;
  onChangePoste: (txId: string, posteId: string) => void;
  onDelete: (txId: string) => void;
  categorisationMsg: string | null;
}) {
  const [annee, setAnnee] = useState<string>('ALL');
  const [bienId, setBienId] = useState<string>('ALL');
  const [posteNom, setPosteNom] = useState<string>('ALL');
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'desc' });

  useEffect(() => {
    if (!posteJump) return;
    setPosteNom(posteJump.poste);
    setAnnee('ALL');
    setBienId('ALL');
  }, [posteJump]);

  function toggleSort(col: SortCol) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }

  const annees = [...new Set(operations.map((t) => new Date(t.date).getFullYear()))].sort((a, b) => b - a);

  const filtrees = operations.filter((t) => {
    if (annee !== 'ALL' && new Date(t.date).getFullYear() !== Number(annee)) return false;
    if (bienId !== 'ALL' && t.bienId !== bienId) return false;
    if (posteNom !== 'ALL' && (t.poste?.nom ?? NON_CATEGORISE) !== posteNom) return false;
    return true;
  });
  const total = filtrees.reduce((s, t) => s + t.montant, 0);

  const valeurTri = (t: OperationVM): string | number => {
    switch (sort.col) {
      case 'date':
        return new Date(t.date).getTime();
      case 'libelle':
        return t.libelle.trim().toLowerCase();
      case 'bien':
        return t.bien ? bienLabel(t.bien).toLowerCase() : '';
      case 'poste':
        return (t.poste?.nom ?? NON_CATEGORISE).toLowerCase();
      case 'montant':
        return t.montant;
    }
  };
  const triees = [...filtrees].sort((a, b) => {
    const va = valeurTri(a);
    const vb = valeurTri(b);
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  function sortArrow(col: SortCol) {
    if (sort.col !== col) return null;
    return <span className="sort-arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>;
  }

  return (
    <div className="panel">
      {categorisationMsg && (
        <div style={{ padding: '10px 20px', fontSize: 12.8, color: 'var(--green-700)', background: 'var(--green-100)' }}>
          {categorisationMsg}
        </div>
      )}
      <div style={{ padding: '10px 16px 6px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <select className="filter-select" value={annee} onChange={(e) => setAnnee(e.target.value)}>
          <option value="ALL">Toutes les années</option>
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select className="filter-select" value={bienId} onChange={(e) => setBienId(e.target.value)}>
          <option value="ALL">Tous les biens</option>
          {biens.map((b) => (
            <option key={b.id} value={b.id}>
              {bienLabel(b)}
            </option>
          ))}
        </select>
        <select className="filter-select" value={posteNom} onChange={(e) => setPosteNom(e.target.value)}>
          <option value="ALL">Tous les postes</option>
          <option value={NON_CATEGORISE}>{NON_CATEGORISE}</option>
          {postes.map((p) => (
            <option key={p.id} value={p.nom}>
              {p.nom}
            </option>
          ))}
        </select>
        {(annee !== 'ALL' || bienId !== 'ALL' || posteNom !== 'ALL') && (
          <button
            className="link-row"
            onClick={() => {
              setAnnee('ALL');
              setBienId('ALL');
              setPosteNom('ALL');
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>
      <div style={{ padding: '0 16px 8px', fontSize: 11.5, color: 'var(--ink-soft)' }}>
        {filtrees.length} opération{filtrees.length > 1 ? 's' : ''} · {formatMontant(total)}
      </div>
      <div className="table-wrap">
        <table className="table-compact table-tight table-zebra-dark">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => toggleSort('date')}>
                Date{sortArrow('date')}
              </th>
              <th className="col-libelle sortable-th" onClick={() => toggleSort('libelle')}>
                Libellé{sortArrow('libelle')}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('bien')}>
                Bien{sortArrow('bien')}
              </th>
              <th className="sortable-th" onClick={() => toggleSort('poste')}>
                Poste{sortArrow('poste')}
              </th>
              <th className="sortable-th" style={{ textAlign: 'right' }} onClick={() => toggleSort('montant')}>
                Montant{sortArrow('montant')}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {triees.map((t) => (
              <tr key={t.id}>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                <td className="col-libelle" title={t.libelle}>{t.libelle}</td>
                <td>
                  <select
                    value={t.bienId ?? ''}
                    onChange={(e) => onChangeBien(t.id, e.target.value)}
                    style={{ border: 'none', background: 'none', fontSize: 12.3, padding: 0 }}
                  >
                    <option value="">—</option>
                    {biens.map((b) => (
                      <option key={b.id} value={b.id}>
                        {bienLabel(b)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={t.posteId ?? ''}
                    onChange={(e) => onChangePoste(t.id, e.target.value)}
                    style={{ border: 'none', background: 'none', fontSize: 12.3, padding: 0 }}
                  >
                    <option value="">Non catégorisé</option>
                    {postes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: 'right' }} className={t.montant >= 0 ? 'amount-pos' : 'amount-neg'}>
                  {t.montant >= 0 ? '+' : ''}
                  {formatMontant(t.montant, { decimals: true })}
                </td>
                <td style={{ textAlign: 'center', padding: '2px 4px' }}>
                  <button
                    className="icon-btn small danger"
                    title="Supprimer cette opération"
                    onClick={() => onDelete(t.id)}
                  >
                    <IconClose />
                  </button>
                </td>
              </tr>
            ))}
            {triees.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--ink-soft)' }}>
                  Aucune opération pour ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

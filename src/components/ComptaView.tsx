'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bienLabel, formatDate, formatMontant } from '@/lib/format';
import {
  createCompteBancaire,
  createTransactionManuelle,
  importReleve,
  updateTransaction,
  categoriserAutomatiquement,
} from '@/lib/actions/compta-actions';
import { IconPlus, IconUpload, IconWarning } from '@/components/icons';

type CompteVM = { id: string; banque: string; libelle: string };
type PosteVM = { id: string; nom: string; type: string };
type BienVM = { id: string; adresse: string; complement?: string | null };
type TransactionVM = {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  compteId: string;
  poste: { id: string; nom: string } | null;
  bien: { id: string; adresse: string } | null;
};
type PivotTransactionVM = {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  bienId: string | null;
  bien: { adresse: string; complement?: string | null } | null;
  poste: { nom: string; type: string } | null;
};

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

export function ComptaView({
  comptes,
  transactions,
  toutesTransactions,
  postes,
  biens,
  recommandations,
}: {
  comptes: CompteVM[];
  transactions: TransactionVM[];
  toutesTransactions: PivotTransactionVM[];
  postes: PosteVM[];
  biens: BienVM[];
  recommandations: { titre: string; detail: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [compteImportId, setCompteImportId] = useState(comptes[0]?.id ?? '');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showAddCompte, setShowAddCompte] = useState(false);
  const [showManuel, setShowManuel] = useState(false);
  const [categorisation, setCategorisation] = useState(false);
  const [categorisationMsg, setCategorisationMsg] = useState<string | null>(null);

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
        setImportMsg(`${res.imported} transaction(s) importée(s)${res.ignored ? `, ${res.ignored} ligne(s) ignorée(s)` : ''}.`);
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
      <ComptaPivot transactions={toutesTransactions} biens={biens} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-10px 0 16px' }}>
        <a href="#donnees" className="link-row">
          + Ajouter / gérer les données ↓
        </a>
      </div>

      <div id="donnees" className="accounts-row">
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
          {importMsg && <div className="auth-error" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>{importMsg}</div>}
        </>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Dernières opérations</h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button className="link-row" onClick={onCategoriserAuto} disabled={categorisation}>
              {categorisation ? 'Catégorisation…' : 'Catégoriser automatiquement'}
            </button>
            <button className="link-row" onClick={() => setShowManuel((v) => !v)}>
              + Ajouter manuellement
            </button>
          </div>
        </div>
        {categorisationMsg && (
          <div style={{ padding: '10px 20px', fontSize: 12.8, color: 'var(--green-700)', background: 'var(--green-100)' }}>
            {categorisationMsg}
          </div>
        )}
        {showManuel && (
          <ManuelForm
            comptes={comptes}
            postes={postes}
            biens={biens}
            onDone={() => {
              setShowManuel(false);
              router.refresh();
            }}
          />
        )}
        <div className="table-wrap">
          <table className="table-compact">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Bien</th>
                <th>Poste</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                  <td>{t.libelle}</td>
                  <td>
                    <select
                      value={t.bien?.id ?? ''}
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
                      value={t.poste?.id ?? ''}
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
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--ink-soft)' }}>
                    Aucune transaction pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recommandations</h2>
        </div>
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
      className="panel-body pad"
      style={{ borderBottom: '1px solid var(--line)' }}
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

function ordrePoste(nom: string): number {
  const i = ORDRE_POSTES.indexOf(nom);
  return i === -1 ? ORDRE_POSTES.length : i;
}

function ComptaPivot({ transactions, biens }: { transactions: PivotTransactionVM[]; biens: BienVM[] }) {
  const [bienId, setBienId] = useState<string>('ALL');
  const [posteOuvert, setPosteOuvert] = useState<string | null>(null);

  const filtrees = bienId === 'ALL' ? transactions : transactions.filter((t) => t.bienId === bienId);

  const annees = [...new Set(filtrees.map((t) => new Date(t.date).getFullYear()))].sort((a, b) => a - b);

  const parPoste = new Map<string, Map<number, number>>();
  for (const t of filtrees) {
    const nom = t.poste?.nom ?? 'Non catégorisé';
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
      <div className="panel-head">
        <h2>État consolidé</h2>
      </div>
      <div className="panel-body pad" style={{ paddingBottom: 0 }}>
        <div className="toggle-pair" style={{ flexWrap: 'wrap', margin: 0 }}>
          <button className={bienId === 'ALL' ? 'active' : ''} onClick={() => { setBienId('ALL'); setPosteOuvert(null); }}>
            Tous les biens
          </button>
          {biens.map((b) => (
            <button
              key={b.id}
              className={bienId === b.id ? 'active' : ''}
              onClick={() => { setBienId(b.id); setPosteOuvert(null); }}
            >
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
              <table className="table-compact">
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
                      onClick={() => setPosteOuvert(posteOuvert === nom ? null : nom)}
                      style={{ cursor: 'pointer', background: posteOuvert === nom ? 'var(--green-100)' : undefined }}
                      title="Cliquer pour voir le détail des transactions de ce poste"
                    >
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="link-row" style={{ fontWeight: posteOuvert === nom ? 700 : undefined }}>
                          {nom}
                        </span>
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

            {posteOuvert && (
              <PosteDetail
                nom={posteOuvert}
                transactions={filtrees.filter((t) => (t.poste?.nom ?? 'Non catégorisé') === posteOuvert)}
                onClose={() => setPosteOuvert(null)}
              />
            )}

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

function PosteDetail({
  nom,
  transactions,
  onClose,
}: {
  nom: string;
  transactions: PivotTransactionVM[];
  onClose: () => void;
}) {
  const triees = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = triees.reduce((s, t) => s + t.montant, 0);

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', margin: '14px 0', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'var(--stone-50)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ fontSize: 12.8, fontWeight: 700 }}>
          Détail — {nom}
          <span style={{ fontWeight: 400, color: 'var(--ink-soft)', marginLeft: 8 }}>
            {triees.length} transaction{triees.length > 1 ? 's' : ''} · {formatMontant(total)}
          </span>
        </div>
        <button className="link-row" onClick={onClose}>
          Fermer ✕
        </button>
      </div>
      <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table className="table-compact">
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Date</th>
              <th>Libellé</th>
              <th style={{ whiteSpace: 'nowrap' }}>Bien</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {triees.map((t) => (
              <tr key={t.id}>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                <td>{t.libelle}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{t.bien ? bienLabel(t.bien) : '—'}</td>
                <td className={`mono ${t.montant >= 0 ? 'amount-pos' : 'amount-neg'}`} style={{ textAlign: 'right' }}>
                  {t.montant >= 0 ? '+' : ''}
                  {formatMontant(t.montant, { decimals: true })}
                </td>
              </tr>
            ))}
            {triees.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--ink-soft)' }}>
                  Aucune transaction pour ce poste.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

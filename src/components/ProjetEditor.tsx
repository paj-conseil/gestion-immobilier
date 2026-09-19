'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { updateProjet } from '@/lib/actions/projet-actions';
import { fileUrl } from '@/lib/file-url';
import { formatMontant } from '@/lib/format';
import { calculerProjet, chargesSuggerees, ABATTEMENT, PRELEVEMENTS_SOCIAUX, type ChargeLigne } from '@/lib/projet-calc';

type ProjetVM = {
  id: string;
  nom: string;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  type: string;
  surface: number | null;
  photoUrl: string | null;
  prixAchat: number;
  fraisAgence: number;
  tauxNotaire: number;
  montantTravaux: number;
  apport: number;
  dureeAns: number;
  tauxCredit: number;
  tauxAssurance: number;
  loyerMensuel: number;
  chargesRecuperablesMensuel: number;
  revenuNetMensuel: number;
  endettementMax: number;
  regimeFiscal: string;
  tmi: number;
  charges: ChargeLigne[];
};

const parse = (s: string): number => {
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const str = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n));
// Les taux sont stockés en fraction (0.035) et affichés en % (3.5).
const pctStr = (n: number): string => String(Math.round(n * 100000) / 1000);
const pct = (n: number): string => `${(n * 100).toFixed(2).replace('.', ',')} %`;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export function ProjetEditor({ projet, scopeId }: { projet: ProjetVM; scopeId: string }) {
  const router = useRouter();
  const [nom, setNom] = useState(projet.nom);
  const [adresse, setAdresse] = useState(projet.adresse ?? '');
  const [codePostal, setCodePostal] = useState(projet.codePostal ?? '');
  const [ville, setVille] = useState(projet.ville ?? '');
  const [type, setType] = useState(projet.type);
  const [photoUrl, setPhotoUrl] = useState<string | null>(projet.photoUrl);
  const [regimeFiscal, setRegimeFiscal] = useState(projet.regimeFiscal);
  const [charges, setCharges] = useState<ChargeLigne[]>(projet.charges);

  const [f, setF] = useState({
    surface: str(projet.surface),
    prixAchat: str(projet.prixAchat),
    fraisAgence: str(projet.fraisAgence),
    tauxNotaire: pctStr(projet.tauxNotaire),
    montantTravaux: str(projet.montantTravaux),
    apport: str(projet.apport),
    dureeAns: str(projet.dureeAns),
    tauxCredit: pctStr(projet.tauxCredit),
    tauxAssurance: pctStr(projet.tauxAssurance),
    loyerMensuel: str(projet.loyerMensuel),
    chargesRecuperablesMensuel: str(projet.chargesRecuperablesMensuel),
    revenuNetMensuel: str(projet.revenuNetMensuel),
    endettementMax: pctStr(projet.endettementMax),
    tmi: pctStr(projet.tmi),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const surface = f.surface.trim() === '' ? null : parse(f.surface);
  const input = useMemo(
    () => ({
      surface,
      prixAchat: parse(f.prixAchat),
      fraisAgence: parse(f.fraisAgence),
      tauxNotaire: parse(f.tauxNotaire) / 100,
      montantTravaux: parse(f.montantTravaux),
      apport: parse(f.apport),
      dureeAns: Math.round(parse(f.dureeAns)),
      tauxCredit: parse(f.tauxCredit) / 100,
      tauxAssurance: parse(f.tauxAssurance) / 100,
      loyerMensuel: parse(f.loyerMensuel),
      chargesRecuperablesMensuel: parse(f.chargesRecuperablesMensuel),
      revenuNetMensuel: parse(f.revenuNetMensuel),
      endettementMax: parse(f.endettementMax) / 100,
      regimeFiscal,
      tmi: parse(f.tmi) / 100,
      charges,
    }),
    [f, surface, regimeFiscal, charges],
  );
  const c = calculerProjet(input);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const key = `projets/${scopeId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
      const blob = await upload(key, file, { access: 'private', handleUploadUrl: '/api/upload/edl-photo' });
      setPhotoUrl(blob.pathname);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Échec de l'envoi de la photo" });
    } finally {
      setUploading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);
    try {
      const { surface: _s, ...rest } = input;
      const res = await updateProjet(projet.id, {
        ...rest,
        regimeFiscal: regimeFiscal === 'MICRO_FONCIER' ? 'MICRO_FONCIER' : 'MICRO_BIC',
        surface,
        nom,
        adresse: adresse || null,
        codePostal: codePostal || null,
        ville: ville || null,
        type,
        photoUrl,
      });
      if ('error' in res) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setMessage({ ok: true, text: 'Projet enregistré.' });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Une erreur est survenue' });
    } finally {
      setSaving(false);
    }
  }

  function updateCharge(id: string, patch: Partial<ChargeLigne>) {
    setCharges((cs) => cs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  const abattement = ABATTEMENT[regimeFiscal] ?? 0.5;

  return (
    <>
      <div className="topbar">
        <div>
          <Link href="/projets" className="link-row" style={{ display: 'inline-block', marginBottom: 6 }}>
            ← Tous les projets
          </Link>
          <h1>{nom || 'Projet'}</h1>
          <p>Simulation financière pour investissement locatif</p>
        </div>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      {message && (
        <div
          className="auth-error"
          style={message.ok ? { background: 'var(--green-100)', color: 'var(--green-700)' } : undefined}
        >
          {message.text}
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi">
          <span>Montant de l&apos;opération</span>
          <strong className="mono">{formatMontant(c.montantOperation)}</strong>
          <small>dont notaire {formatMontant(c.fraisNotaire)}</small>
        </div>
        <div className="kpi">
          <span>Mensualité (crédit + assurance)</span>
          <strong className="mono">{formatMontant(c.totalMensualite)}</strong>
          <small
            className={c.financable === false ? 'warn' : ''}
          >
            {c.financable === null
              ? 'Renseignez vos revenus pour tester la faisabilité'
              : c.financable
                ? `Financable (max ${formatMontant(c.mensualiteMax ?? 0)}/mois)`
                : `Trop élevée (max ${formatMontant(c.mensualiteMax ?? 0)}/mois)`}
          </small>
        </div>
        <div className="kpi">
          <span>Rentabilité brute / nette</span>
          <strong>
            {pct(c.rentabiliteBrute)} / {pct(c.rentabiliteNette)}
          </strong>
          <small>nette : après charges et impôts</small>
        </div>
        <div className="kpi">
          <span>Cash-flow mensuel</span>
          <strong className="mono" style={{ color: c.cashflowMensuel < 0 ? 'var(--brick)' : undefined }}>
            {formatMontant(c.cashflowMensuel)}
          </strong>
          <small>{formatMontant(c.cashflowAn)} / an</small>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h2>Le bien</h2>
        </div>
        <div className="panel-body pad">
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 200, maxWidth: '100%' }}>
              <div style={{ height: 140, background: 'var(--stone-100)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                {photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(photoUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} disabled={uploading} />
              {uploading && <small>Envoi de la photo…</small>}
              {photoUrl && (
                <button type="button" className="link-row" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }} onClick={() => setPhotoUrl(null)}>
                  Retirer la photo
                </button>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="field">
                <label>Nom du projet</label>
                <input value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
              <div className="field">
                <label>Adresse</label>
                <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="12 rue des Lilas" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Code postal</label>
                  <input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
                </div>
                <div className="field">
                  <label>Ville</label>
                  <input value={ville} onChange={(e) => setVille(e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Type de bien</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="APPARTEMENT">Appartement</option>
                    <option value="STUDIO">Studio</option>
                    <option value="MAISON">Maison</option>
                    <option value="FOYER">Foyer</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div className="field">
                  <label>Surface (m²)</label>
                  <input inputMode="decimal" value={f.surface} onChange={set('surface')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 18, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <h2>Acquisition</h2>
          </div>
          <div className="panel-body pad">
            <div className="field">
              <label>
                Prix d&apos;achat (€){c.prixM2 ? ` — ${formatMontant(c.prixM2)}/m²` : ''}
              </label>
              <input inputMode="decimal" value={f.prixAchat} onChange={set('prixAchat')} />
            </div>
            <div className="field">
              <label>Frais d&apos;agence (€)</label>
              <input inputMode="decimal" value={f.fraisAgence} onChange={set('fraisAgence')} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Taux frais de notaire (%)</label>
                <input inputMode="decimal" value={f.tauxNotaire} onChange={set('tauxNotaire')} />
              </div>
              <div className="field">
                <label>Frais de notaire (calculés)</label>
                <input value={formatMontant(c.fraisNotaire)} readOnly />
              </div>
            </div>
            <small style={{ color: 'var(--ink-soft)', display: 'block', marginBottom: 12 }}>
              Environ 7,5 % dans l&apos;ancien, 2,5 % dans le neuf.
            </small>
            <div className="field">
              <label>Hypothèse de travaux (€)</label>
              <input inputMode="decimal" value={f.montantTravaux} onChange={set('montantTravaux')} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Montant de l&apos;opération</label>
              <input value={formatMontant(c.montantOperation)} readOnly style={{ fontWeight: 700 }} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Financement</h2>
          </div>
          <div className="panel-body pad">
            <div className="field">
              <label>Apport personnel (€)</label>
              <input inputMode="decimal" value={f.apport} onChange={set('apport')} />
            </div>
            <div className="field">
              <label>Montant à financer (calculé)</label>
              <input value={formatMontant(c.aFinancer)} readOnly style={{ fontWeight: 700 }} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Durée (années)</label>
                <input inputMode="numeric" value={f.dureeAns} onChange={set('dureeAns')} />
              </div>
              <div className="field">
                <label>Taux du crédit (%)</label>
                <input inputMode="decimal" value={f.tauxCredit} onChange={set('tauxCredit')} />
              </div>
            </div>
            <div className="field">
              <label>Taux d&apos;assurance emprunteur (% du capital / an)</label>
              <input inputMode="decimal" value={f.tauxAssurance} onChange={set('tauxAssurance')} />
            </div>
            <div className="dt" style={{ marginTop: 6 }}>
              <div>
                Mensualité crédit
                <b>{formatMontant(c.mensualite)}</b>
              </div>
              <div>
                Assurance / mois
                <b>{formatMontant(c.assuranceMensuelle)}</b>
              </div>
              <div>
                Total mensualité
                <b>{formatMontant(c.totalMensualite)}</b>
              </div>
              <div>
                Coût crédit + assurance
                <b>{formatMontant(c.coutCredit + c.coutAssurance)}</b>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0 12px', paddingTop: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8 }}>
                Capacité d&apos;emprunt (facultatif)
              </div>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Revenu net mensuel (€)</label>
                  <input inputMode="decimal" value={f.revenuNetMensuel} onChange={set('revenuNetMensuel')} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Endettement max (%)</label>
                  <input inputMode="decimal" value={f.endettementMax} onChange={set('endettementMax')} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 18, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <h2>Revenus locatifs estimés</h2>
          </div>
          <div className="panel-body pad">
            <div className="field">
              <label>
                Loyer mensuel hors charges (€)
                {surface ? ` — ${formatMontant(input.loyerMensuel / surface)}/m²` : ''}
              </label>
              <input inputMode="decimal" value={f.loyerMensuel} onChange={set('loyerMensuel')} />
            </div>
            <div className="field">
              <label>Charges récupérables refacturées / mois (€)</label>
              <input inputMode="decimal" value={f.chargesRecuperablesMensuel} onChange={set('chargesRecuperablesMensuel')} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Total revenus locatifs / an</label>
              <input value={formatMontant(c.revenusAn)} readOnly style={{ fontWeight: 700 }} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Fiscalité (estimation)</h2>
          </div>
          <div className="panel-body pad">
            <div className="field">
              <label>Régime</label>
              <select value={regimeFiscal} onChange={(e) => setRegimeFiscal(e.target.value)}>
                <option value="MICRO_BIC">Micro-BIC — meublé (abattement 50 %)</option>
                <option value="MICRO_FONCIER">Micro-foncier — nu (abattement 30 %)</option>
              </select>
            </div>
            <div className="field">
              <label>Tranche marginale d&apos;imposition (%)</label>
              <input inputMode="decimal" value={f.tmi} onChange={set('tmi')} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Impôt + prélèvements sociaux / an</label>
              <input value={formatMontant(c.impotAn)} readOnly style={{ fontWeight: 700 }} />
            </div>
            <small style={{ color: 'var(--ink-soft)', display: 'block', marginTop: 8 }}>
              Loyers × (1 − {Math.round(abattement * 100)} %) × (TMI + {(PRELEVEMENTS_SOCIAUX * 100).toFixed(1)} % de
              prélèvements sociaux). Estimation simplifiée : à affiner avec votre situation fiscale réelle.
            </small>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h2>Charges complémentaires (par an)</h2>
          <button
            className="link-row"
            onClick={() => {
              if (charges.length === 0 || confirm('Remplacer la liste par les charges suggérées ?')) {
                setCharges(chargesSuggerees(surface, input.loyerMensuel));
              }
            }}
          >
            Suggérer les charges
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Poste</th>
                <th>€ / an</th>
                <th>€ / mois</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {charges.map((ch) => (
                <tr key={ch.id}>
                  <td>
                    <input
                      value={ch.label}
                      onChange={(e) => updateCharge(ch.id, { label: e.target.value })}
                      style={{ width: '100%', minWidth: 180, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6 }}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      value={ch.montantAnnuel}
                      onChange={(e) => updateCharge(ch.id, { montantAnnuel: parse(e.target.value) })}
                      style={{ width: 100, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6 }}
                    />
                  </td>
                  <td className="mono">{formatMontant(ch.montantAnnuel / 12)}</td>
                  <td>
                    <button className="icon-btn small danger" title="Retirer" onClick={() => setCharges((cs) => cs.filter((x) => x.id !== ch.id))}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <button
                    className="link-row"
                    onClick={() => setCharges((cs) => [...cs, { id: `c${Date.now().toString(36)}`, label: 'Nouvelle charge', montantAnnuel: 0 }])}
                  >
                    + Ajouter une charge
                  </button>
                </td>
                <td className="mono">
                  <b>{formatMontant(c.chargesAn)}</b>
                </td>
                <td className="mono">
                  <b>{formatMontant(c.chargesAn / 12)}</b>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Bilan financier</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Par an</th>
                <th>Par mois</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Revenus locatifs', c.revenusAn],
                ['Mensualités du crédit (avec assurance)', -c.chargesEmpruntAn],
                ['Charges complémentaires', -c.chargesAn],
                ['Impôts (estimation)', -c.impotAn],
              ].map(([label, v]) => (
                <tr key={label as string}>
                  <td>{label}</td>
                  <td className="mono">{formatMontant(v as number)}</td>
                  <td className="mono">{formatMontant((v as number) / 12)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <b>Cash-flow</b>
                </td>
                <td className="mono">
                  <b style={{ color: c.cashflowAn < 0 ? 'var(--brick)' : undefined }}>{formatMontant(c.cashflowAn)}</b>
                </td>
                <td className="mono">
                  <b style={{ color: c.cashflowAn < 0 ? 'var(--brick)' : undefined }}>{formatMontant(c.cashflowMensuel)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

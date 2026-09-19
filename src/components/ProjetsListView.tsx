'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProjet, deleteProjet } from '@/lib/actions/projet-actions';
import { fileUrl } from '@/lib/file-url';
import { formatMontant } from '@/lib/format';
import { calculerProjet, type ChargeLigne } from '@/lib/projet-calc';
import { IconPlus } from '@/components/icons';

type ProjetVM = {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
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

export function ProjetsListView({ projets }: { projets: ProjetVM[] }) {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createProjet(nom);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.push(`/projets/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Supprimer ce projet ?')) return;
    await deleteProjet(id);
    router.refresh();
  }

  return (
    <>
      <form className="panel" onSubmit={onCreate} style={{ marginBottom: 18 }}>
        <div className="panel-body pad" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
            <label>Nouveau projet</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Appartement Tours centre" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <IconPlus />
            Créer le projet
          </button>
        </div>
        {error && <div className="auth-error" style={{ margin: '0 20px 16px' }}>{error}</div>}
      </form>

      {projets.length === 0 ? (
        <div className="panel panel-body pad" style={{ color: 'var(--ink-soft)' }}>
          Aucun projet pour le moment. Créez-en un pour simuler l&apos;achat d&apos;un bien.
        </div>
      ) : (
        <div className="bien-grid">
          {projets.map((p) => {
            const c = calculerProjet(p);
            return (
              <div className="bien-card" key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <Link href={`/projets/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ height: 130, background: 'var(--stone-100)' }}>
                    {p.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fileUrl(p.photoUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <b style={{ fontSize: 14 }}>{p.nom}</b>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 10px' }}>
                      {[p.adresse, p.ville].filter(Boolean).join(', ') || '—'}
                    </div>
                    <div className="dt">
                      <div>
                        Opération
                        <b>{formatMontant(c.montantOperation)}</b>
                      </div>
                      <div>
                        Mensualité
                        <b>{formatMontant(c.totalMensualite)}</b>
                      </div>
                      <div>
                        Renta. brute
                        <b>{(c.rentabiliteBrute * 100).toFixed(1)} %</b>
                      </div>
                      <div>
                        Cash-flow / mois
                        <b style={{ color: c.cashflowMensuel < 0 ? 'var(--brick)' : undefined }}>
                          {formatMontant(c.cashflowMensuel)}
                        </b>
                      </div>
                    </div>
                  </div>
                </Link>
                <div style={{ padding: '0 14px 12px', textAlign: 'right' }}>
                  <button className="link-row" style={{ color: 'var(--brick)' }} onClick={() => onDelete(p.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

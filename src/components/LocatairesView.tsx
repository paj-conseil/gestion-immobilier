'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { bienLabel, formatDate, formatMontant } from '@/lib/format';
import { LocataireFormModal } from '@/components/LocataireFormModal';
import {
  LocataireEditModal,
  DocStatus,
  bailDe,
  type LocataireVM,
  type BienOption,
} from '@/components/LocataireEditModal';
import { IconEdit } from '@/components/icons';

/**
 * Un bail reste "en cours" tant que sa date de sortie n'est pas atteinte
 * (pas de sortie prévue = en cours) — une date de sortie future ne suffit
 * pas à rendre le locataire inactif dès aujourd'hui.
 */
function bailEnCours(bail: { dateFin: string | null }): boolean {
  if (!bail.dateFin) return true;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return new Date(bail.dateFin) >= aujourdhui;
}

function estActif(l: LocataireVM): boolean {
  const bail = bailDe(l);
  return bail ? bailEnCours(bail) : l.statut !== 'INACTIF';
}

export function LocatairesView({ locataires, biens }: { locataires: LocataireVM[]; biens: BienOption[] }) {
  // On garde uniquement l'id en édition, et on relit l'objet à jour depuis
  // `locataires` à chaque rendu — sinon après un router.refresh() (ex. ajout
  // d'un document), la fenêtre continuerait d'afficher l'ancien objet figé
  // en state (le point de statut de document ne passerait jamais au vert).
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = locataires.find((l) => l.id === editingId) ?? null;
  const [filtre, setFiltre] = useState<'actifs' | 'tous'>('actifs');
  const router = useRouter();

  const nbInactifs = locataires.filter((l) => !estActif(l)).length;
  const visibles = filtre === 'actifs' ? locataires.filter(estActif) : locataires;

  // Cautions des baux en cours — dédupliquées par bail (et non par locataire)
  // pour ne pas compter deux fois le dépôt d'une colocation partagée par
  // plusieurs locataires.
  const bauxEnCours = new Map<string, number>();
  for (const l of locataires) {
    const bail = bailDe(l);
    if (bail && bailEnCours(bail)) bauxEnCours.set(bail.id, bail.depotGarantie ?? 0);
  }
  const totalCautions = [...bauxEnCours.values()].reduce((s, v) => s + v, 0);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="toggle-pair" style={{ margin: 0 }}>
            <button className={filtre === 'actifs' ? 'active' : ''} onClick={() => setFiltre('actifs')}>
              Actifs
            </button>
            <button className={filtre === 'tous' ? 'active' : ''} onClick={() => setFiltre('tous')}>
              Tous {nbInactifs > 0 ? `(+${nbInactifs} inactif${nbInactifs > 1 ? 's' : ''})` : ''}
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Cautions en cours :{' '}
            <b className="mono" style={{ color: 'var(--ink)' }}>
              {formatMontant(totalCautions)}
            </b>
          </div>
        </div>
        <LocataireFormModal biens={biens} />
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="table-zebra">
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Statut</th>
                <th>Bien</th>
                <th>Loyer HC</th>
                <th className="col-optional">Charges</th>
                <th className="col-optional">Entrée</th>
                <th className="col-optional">Sortie</th>
                <th className="col-doc">
                  Contrat
                  <br />
                  signé
                </th>
                <th className="col-doc">CNI</th>
                <th className="col-doc">
                  Attestation
                  <br />
                  assurance
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => {
                const bail = bailDe(l);
                const docByType = (t: string) => l.documents.find((d) => d.type === t);
                const actif = estActif(l);
                return (
                  <tr key={l.id}>
                    <td>
                      <button type="button" className="link-row" onClick={() => setEditingId(l.id)}>
                        {l.prenom} {l.nom}
                      </button>
                    </td>
                    <td>
                      <span className={`chip ${actif ? 'green' : 'neutral'}`}>{actif ? 'Actif' : 'Inactif'}</span>
                    </td>
                    <td>{bail ? bienLabel(bail.bien) : '—'}</td>
                    <td className="mono">{bail ? formatMontant(bail.loyerHC) : '—'}</td>
                    <td className="mono col-optional">{bail ? formatMontant(bail.charges) : '—'}</td>
                    <td className="mono col-optional" style={{ fontSize: 12 }}>
                      {bail ? formatDate(bail.dateDebut) : '—'}
                    </td>
                    <td className="mono col-optional" style={{ fontSize: 12 }}>
                      {bail?.dateFin ? formatDate(bail.dateFin) : '—'}
                    </td>
                    <td className="col-doc">
                      <DocStatus doc={docByType('CONTRAT_SIGNE')} label="Contrat signé" />
                    </td>
                    <td className="col-doc">
                      <DocStatus doc={docByType('CNI')} label="CNI" />
                    </td>
                    <td className="col-doc">
                      <DocStatus doc={docByType('ATTESTATION_ASSURANCE')} label="Attestation assurance" />
                    </td>
                    <td>
                      <button className="icon-btn" title="Modifier" onClick={() => setEditingId(l.id)}>
                        <IconEdit />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ color: 'var(--ink-soft)' }}>
                    {filtre === 'actifs' ? 'Aucun locataire actif pour le moment.' : 'Aucun locataire pour le moment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <LocataireEditModal
          locataire={editing}
          biens={biens}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

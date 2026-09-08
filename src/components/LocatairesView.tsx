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

export function LocatairesView({ locataires, biens }: { locataires: LocataireVM[]; biens: BienOption[] }) {
  const [editing, setEditing] = useState<LocataireVM | null>(null);
  const [filtre, setFiltre] = useState<'actifs' | 'tous'>('actifs');
  const router = useRouter();

  const nbInactifs = locataires.filter((l) => l.statut === 'INACTIF').length;
  const visibles = filtre === 'actifs' ? locataires.filter((l) => l.statut !== 'INACTIF') : locataires;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="toggle-pair" style={{ margin: 0 }}>
          <button className={filtre === 'actifs' ? 'active' : ''} onClick={() => setFiltre('actifs')}>
            Actifs
          </button>
          <button className={filtre === 'tous' ? 'active' : ''} onClick={() => setFiltre('tous')}>
            Tous {nbInactifs > 0 ? `(+${nbInactifs} inactif${nbInactifs > 1 ? 's' : ''})` : ''}
          </button>
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
                <th>Charges</th>
                <th>Entrée</th>
                <th>Sortie</th>
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
                const actif = l.statut !== 'INACTIF';
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{l.prenom} {l.nom}</td>
                    <td>
                      <span className={`chip ${actif ? 'green' : 'neutral'}`}>{actif ? 'Actif' : 'Inactif'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{bail ? bienLabel(bail.bien) : '—'}</td>
                    <td className="mono">{bail ? formatMontant(bail.loyerHC) : '—'}</td>
                    <td className="mono">{bail ? formatMontant(bail.charges) : '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {bail ? formatDate(bail.dateDebut) : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
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
                      <button className="icon-btn" title="Modifier" onClick={() => setEditing(l)}>
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
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconBiens } from '@/components/icons';
import { fileUrl } from '@/lib/file-url';
import { formatDate, formatMontant } from '@/lib/format';
import { BienFormModal } from '@/components/BienFormModal';
import { LocataireEditModal, type LocataireVM, type BienOption } from '@/components/LocataireEditModal';
import { PretFormModal, type PretDefaults } from '@/components/PretFormModal';
import { IconEdit, IconPlus } from '@/components/icons';

const TYPE_LABEL: Record<string, string> = {
  APPARTEMENT: 'Appartement',
  STUDIO: 'Studio',
  MAISON: 'Maison',
  FOYER: 'Foyer',
  AUTRE: 'Autre',
};
const STATUT_LABEL: Record<string, string> = {
  LOUE: 'Loué',
  VACANT: 'Vacant',
  PERSO: 'Résidence perso.',
};
const STATUT_CLASS: Record<string, string> = { LOUE: 'loue', VACANT: 'vacant', PERSO: 'perso' };
const EDL_TYPE_LABEL: Record<string, string> = { ENTREE: "Entrée", SORTIE: 'Sortie' };

type Photo = { id: string; url: string };
type LocationVM = {
  statut: string;
  loyerHC: number;
  charges: number;
  dateDebut: string;
  dateFin?: string | null;
  locataires: { locataire: LocataireVM }[];
};
type EdlVM = {
  id: string;
  type: string;
  date: string;
  locataire?: { nom: string; prenom: string } | null;
};
export type PretVM = {
  id: string;
  banque?: string | null;
  montant?: number | null;
  tauxInteret?: number | null;
  mensualite?: number | null;
  dureeMois?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
};
export type BienVM = {
  id: string;
  adresse: string;
  ville?: string | null;
  codePostal?: string | null;
  complement?: string | null;
  type: string;
  statut: string;
  surface?: number | null;
  description?: string | null;
  telephone?: string | null;
  numeroCompteur?: string | null;
  couleur?: string | null;
  photos: Photo[];
  locations: LocationVM[];
  etatsDesLieux: EdlVM[];
  prets: PretVM[];
  prixAchat?: number | null;
  fraisNotaire?: number | null;
  montantTravaux?: number | null;
  apportPersonnel?: number | null;
};

function sousTitre(b: BienVM) {
  const parts = [b.complement, [b.codePostal, b.ville].filter(Boolean).join(' ')].filter(Boolean);
  return parts.join(' · ') || TYPE_LABEL[b.type];
}

function moisEntre(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function moisEcoulesPret(p: PretVM): number {
  if (!p.dateDebut) return 0;
  return Math.max(0, moisEntre(new Date(p.dateDebut), new Date()));
}

function moisRestantsPret(p: PretVM): number | null {
  if (p.dateFin) return Math.max(0, moisEntre(new Date(), new Date(p.dateFin)));
  if (p.dateDebut && p.dureeMois) return Math.max(0, p.dureeMois - moisEcoulesPret(p));
  return null;
}

function empruntRestantPret(p: PretVM): number | null {
  if (!p.montant || !p.dureeMois) return null;
  const n = p.dureeMois;
  const done = Math.min(n, moisEcoulesPret(p));
  const P = p.montant;
  const tauxAnnuel = p.tauxInteret ?? 0;
  if (tauxAnnuel > 0) {
    const r = tauxAnnuel / 100 / 12;
    const facteur = (Math.pow(1 + r, n) - Math.pow(1 + r, done)) / (Math.pow(1 + r, n) - 1);
    return Math.max(0, P * facteur);
  }
  return Math.max(0, P * (1 - done / n));
}

function empruntRestantBien(b: BienVM): number {
  return b.prets.reduce((s, p) => s + (empruntRestantPret(p) ?? 0), 0);
}

function mensualiteTotale(b: BienVM): number {
  return b.prets.reduce((s, p) => s + (p.mensualite ?? 0), 0);
}

function montantFinanceTotal(b: BienVM): number {
  return b.prets.reduce((s, p) => s + (p.montant ?? 0), 0);
}

function banquesListe(b: BienVM): string {
  const banques = [...new Set(b.prets.map((p) => p.banque).filter(Boolean))] as string[];
  return banques.length > 0 ? banques.join(', ') : '—';
}

function coutAcquisition(b: BienVM): number {
  return (b.prixAchat ?? 0) + (b.fraisNotaire ?? 0) + (b.montantTravaux ?? 0);
}

function loyerAnnuelActif(b: BienVM): number {
  return b.locations.filter((l) => l.statut === 'ACTIF').reduce((s, l) => s + l.loyerHC, 0) * 12;
}

function rendementBrut(b: BienVM): number | null {
  const cout = coutAcquisition(b);
  const loyerAnnuel = loyerAnnuelActif(b);
  if (!cout || !loyerAnnuel) return null;
  return (loyerAnnuel / cout) * 100;
}

export function BiensView({ biens }: { biens: BienVM[] }) {
  // On garde uniquement l'id sélectionné, et on relit l'objet à jour depuis
  // `biens` à chaque rendu — sinon après un router.refresh() (ex. ajout d'un
  // prêt), le tiroir continuerait d'afficher l'ancien objet figé en state.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = biens.find((b) => b.id === selectedId) ?? null;
  const [tab, setTab] = useState<'carac' | 'fin' | 'loc' | 'edl'>('carac');
  const [editingLocataire, setEditingLocataire] = useState<LocataireVM | null>(null);
  const [editingPret, setEditingPret] = useState<{ bienId: string; defaults?: PretDefaults } | null>(null);
  const [editBienOpen, setEditBienOpen] = useState(false);
  const router = useRouter();

  const locations = selected?.locations ?? [];
  const locationsActives = locations.filter((l) => l.statut === 'ACTIF');
  const totalLoyer = locationsActives.reduce((s, l) => s + l.loyerHC, 0);
  const totalCharges = locationsActives.reduce((s, l) => s + l.charges, 0);

  const biensOptions: BienOption[] = biens.map((b) => ({ id: b.id, adresse: b.adresse, complement: b.complement }));

  const kpiEmpruntRestant = biens.reduce((s, b) => s + empruntRestantBien(b), 0);
  const kpiMensualites = biens.reduce((s, b) => s + mensualiteTotale(b), 0);
  const kpiRevenusHC = biens.reduce((s, b) => s + loyerAnnuelActif(b) / 12, 0);
  const kpiCoutTotal = biens.reduce((s, b) => s + (loyerAnnuelActif(b) > 0 ? coutAcquisition(b) : 0), 0);
  const kpiLoyerAnnuelTotal = biens.reduce((s, b) => s + loyerAnnuelActif(b), 0);
  const kpiRendementBrut = kpiCoutTotal > 0 ? (kpiLoyerAnnuelTotal / kpiCoutTotal) * 100 : null;

  return (
    <>
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Emprunt restant', value: formatMontant(kpiEmpruntRestant) },
          { label: 'Mensualités', value: formatMontant(kpiMensualites) },
          { label: 'Revenus HC', value: formatMontant(kpiRevenusHC) },
          { label: 'Rendement brut', value: kpiRendementBrut !== null ? `${kpiRendementBrut.toFixed(1)} %` : '—' },
        ].map((kpi) => (
          <div className="panel" key={kpi.label} style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="bien-grid">
        {biens.map((b) => {
          const actives = b.locations.filter((l) => l.statut === 'ACTIF');
          return (
            <button
              key={b.id}
              className="bien-card"
              onClick={() => {
                setSelectedId(b.id);
                setTab('carac');
              }}
            >
              <div className="bien-photo" style={{ background: b.photos[0] ? undefined : b.couleur ?? 'var(--green-700)' }}>
                {b.photos[0] ? <img src={fileUrl(b.photos[0].url)} alt={b.adresse} /> : <IconBiens />}
              </div>
              <span className={`status-pill ${STATUT_CLASS[b.statut]}`}>{STATUT_LABEL[b.statut]}</span>
              <div className="bien-body">
                <div className="addr">{b.adresse}</div>
                <div className="type">{sousTitre(b)}</div>
                <div className="bien-meta">
                  <div>
                    Surface
                    <b>{b.surface ? `${b.surface} m²` : '—'}</b>
                  </div>
                  <div>
                    Loyer HC{actives.length > 1 ? ` (${actives.length} loc.)` : ''}
                    <b>{actives.length > 0 ? formatMontant(actives.reduce((s, l) => s + l.loyerHC, 0)) : '—'}</b>
                  </div>
                  <div>
                    Charges
                    <b>{actives.length > 0 ? formatMontant(actives.reduce((s, l) => s + l.charges, 0)) : '—'}</b>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {biens.length === 0 && (
          <div style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
            Aucun bien pour le moment — ajoutez votre premier logement.
          </div>
        )}
      </div>

      <div className={`drawer-overlay${selected ? ' show' : ''}`} onClick={() => setSelectedId(null)} />
      <div className={`drawer${selected ? ' show' : ''}`}>
        {selected && (
          <>
            <div
              className="drawer-photo"
              style={{ background: selected.photos[0] ? undefined : selected.couleur ?? 'var(--green-700)' }}
            >
              {selected.photos[0] ? <img src={fileUrl(selected.photos[0].url)} alt={selected.adresse} /> : <IconBiens />}
              <button className="drawer-close" onClick={() => setSelectedId(null)}>
                ✕
              </button>
            </div>
            <div className="drawer-body">
              <h2>{selected.adresse}</h2>
              <div className="sub">{sousTitre(selected)}</div>

              <div style={{ marginBottom: 16 }}>
                <button
                  className="btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setEditBienOpen(true)}
                >
                  Modifier ce logement
                </button>
              </div>

              <div className="tab-row">
                <button className={tab === 'carac' ? 'active' : ''} onClick={() => setTab('carac')}>
                  Caractéristiques
                </button>
                <button className={tab === 'fin' ? 'active' : ''} onClick={() => setTab('fin')}>
                  Financement
                </button>
                <button className={tab === 'loc' ? 'active' : ''} onClick={() => setTab('loc')}>
                  Locataire
                </button>
                <button className={tab === 'edl' ? 'active' : ''} onClick={() => setTab('edl')}>
                  États des lieux
                </button>
              </div>

              {tab === 'carac' && (
                <div className="dt">
                  <div>
                    Surface
                    <b>{selected.surface ? `${selected.surface} m²` : '—'}</b>
                  </div>
                  <div>
                    Type
                    <b>{TYPE_LABEL[selected.type]}</b>
                  </div>
                  <div>
                    Loyer hors charges{locations.length > 1 ? ' (total)' : ''}
                    <b>{locations.length > 0 ? formatMontant(totalLoyer) : '—'}</b>
                  </div>
                  <div>
                    Charges{locations.length > 1 ? ' (total)' : ''}
                    <b>{locations.length > 0 ? formatMontant(totalCharges) : '—'}</b>
                  </div>
                  <div>
                    N° compteur électrique
                    <b>{selected.numeroCompteur || '—'}</b>
                  </div>
                  <div>
                    Téléphone contact
                    <b>{selected.telephone || '—'}</b>
                  </div>
                  {selected.description && (
                    <div style={{ gridColumn: '1/3' }}>
                      Description
                      <b style={{ fontFamily: 'inherit', fontWeight: 400, marginTop: 6, whiteSpace: 'pre-line' }}>
                        {selected.description}
                      </b>
                    </div>
                  )}
                </div>
              )}

              {tab === 'fin' && (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', margin: '2px 0 10px' }}>
                    Achat
                  </div>
                  <div className="dt">
                    <div>
                      Prix d&apos;achat
                      <b>{formatMontant(selected.prixAchat)}</b>
                    </div>
                    <div>
                      Frais de notaire
                      <b>{formatMontant(selected.fraisNotaire)}</b>
                    </div>
                    <div>
                      Travaux
                      <b>{formatMontant(selected.montantTravaux)}</b>
                    </div>
                    <div>
                      Apport personnel
                      <b>{formatMontant(selected.apportPersonnel)}</b>
                    </div>
                    <div>
                      Rendement brut
                      <b>{rendementBrut(selected) !== null ? `${rendementBrut(selected)!.toFixed(1)} %` : '—'}</b>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--ink-soft)',
                      margin: '20px 0 10px',
                      borderTop: '1px solid var(--line)',
                      paddingTop: 16,
                    }}
                  >
                    Prêts
                  </div>
                  <div className="dt">
                    <div>
                      Montant financé (total)
                      <b>{formatMontant(montantFinanceTotal(selected))}</b>
                    </div>
                    <div>
                      Banque(s)
                      <b>{banquesListe(selected)}</b>
                    </div>
                    <div>
                      Mensualité totale
                      <b>{formatMontant(mensualiteTotale(selected))}</b>
                    </div>
                    <div>
                      Emprunt restant (total)
                      <b>{formatMontant(empruntRestantBien(selected))}</b>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                    {selected.prets.length > 0 ? (
                      selected.prets.map((p) => (
                        <div
                          key={p.id}
                          style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-m)', padding: 12 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                            <b>{p.banque || 'Prêt sans banque renseignée'}</b>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Modifier ce prêt"
                              onClick={() => setEditingPret({ bienId: selected.id, defaults: p })}
                            >
                              <IconEdit />
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11.5, color: 'var(--ink-soft)' }}>
                            <span>Montant : {formatMontant(p.montant)}</span>
                            <span>Taux : {p.tauxInteret ? `${p.tauxInteret} %` : '—'}</span>
                            <span>Mensualité : {formatMontant(p.mensualite)}</span>
                            <span>Durée : {p.dureeMois ? `${p.dureeMois} mois` : '—'}</span>
                            <span>Fin : {p.dateFin ? formatDate(p.dateFin) : '—'}</span>
                            <span>Restant : {moisRestantsPret(p) !== null ? `${moisRestantsPret(p)} mois` : '—'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--ink-soft)' }}>Aucun prêt enregistré pour ce bien.</div>
                    )}
                    <button
                      type="button"
                      className="btn"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setEditingPret({ bienId: selected.id })}
                    >
                      <IconPlus />
                      Ajouter un prêt
                    </button>
                  </div>
                </>
              )}

              {tab === 'loc' && (
                <div className="dt">
                  {locations.length > 0 ? (
                    [...locations]
                      .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime())
                      .map((loc, i) => (
                        <div style={{ gridColumn: '1/3', marginBottom: i < locations.length - 1 ? 12 : 0 }} key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <b>
                              {loc.locataires.length > 0
                                ? loc.locataires.map((x, j) => (
                                    <span key={x.locataire.id}>
                                      {j > 0 && ', '}
                                      <button
                                        type="button"
                                        className="link-row"
                                        style={{ font: 'inherit', fontWeight: 700 }}
                                        onClick={() => setEditingLocataire(x.locataire)}
                                      >
                                        {x.locataire.prenom} {x.locataire.nom}
                                      </button>
                                    </span>
                                  ))
                                : '—'}
                            </b>
                            <span
                              className={`chip ${loc.statut === 'ACTIF' ? 'green' : 'neutral'}`}
                              style={{ marginLeft: 8 }}
                            >
                              {loc.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                            {formatMontant(loc.loyerHC + loc.charges)} · Du {formatDate(loc.dateDebut)}
                            {loc.dateFin ? ` au ${formatDate(loc.dateFin)}` : ''}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div style={{ gridColumn: '1/3', color: 'var(--ink-soft)' }}>
                      Aucun locataire enregistré sur ce bien.
                    </div>
                  )}
                </div>
              )}

              {tab === 'edl' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.etatsDesLieux.length > 0 ? (
                    [...selected.etatsDesLieux]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((edl) => (
                        <Link
                          key={edl.id}
                          href={`/edl/${edl.id}`}
                          className="room-item"
                          style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-s)' }}
                        >
                          <span>
                            <span className={`chip ${edl.type === 'ENTREE' ? 'green' : 'brick'}`} style={{ marginRight: 8 }}>
                              {EDL_TYPE_LABEL[edl.type] ?? edl.type}
                            </span>
                            {edl.locataire ? `${edl.locataire.prenom} ${edl.locataire.nom}` : '—'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{formatDate(edl.date)}</span>
                        </Link>
                      ))
                  ) : (
                    <div style={{ color: 'var(--ink-soft)' }}>Aucun état des lieux enregistré pour ce bien.</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editingLocataire && (
        <LocataireEditModal
          locataire={editingLocataire}
          biens={biensOptions}
          onClose={() => setEditingLocataire(null)}
          onSaved={() => {
            setEditingLocataire(null);
            router.refresh();
          }}
        />
      )}

      {editingPret && (
        <PretFormModal
          bienId={editingPret.bienId}
          defaults={editingPret.defaults}
          onClose={() => setEditingPret(null)}
        />
      )}

      {selected && (
        <BienFormModal
          open={editBienOpen}
          onOpenChange={setEditBienOpen}
          defaults={{ ...selected, surface: selected.surface, id: selected.id }}
          onSaved={() => {
            setEditBienOpen(false);
            setSelectedId(null);
          }}
        />
      )}
    </>
  );
}

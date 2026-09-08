import { addDays } from 'date-fns';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { bienLabel, formatDate, formatMontant, joursRestants } from '@/lib/format';
import { BienFormModal } from '@/components/BienFormModal';

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  const horizon = addDays(new Date(), 60);
  const now = new Date();

  const [biens, locationsActives, locataireDocsManquants] = await Promise.all([
    prisma.bien.findMany({ where: { scopeId: ctx.scopeId } }),
    prisma.location.findMany({
      where: { bien: { scopeId: ctx.scopeId }, statut: 'ACTIF' },
      include: {
        bien: true,
        locataires: { include: { locataire: true } },
      },
    }),
    prisma.documentLocataire.findMany({
      where: { statut: 'MANQUANT', locataire: { scopeId: ctx.scopeId } },
      include: { locataire: true },
      take: 5,
    }),
  ]);

  const nbLoue = biens.filter((b) => b.statut === 'LOUE').length;
  const nbVacant = biens.filter((b) => b.statut === 'VACANT').length;
  const nbPerso = biens.filter((b) => b.statut === 'PERSO').length;
  const nbLouable = biens.filter((b) => b.statut !== 'PERSO').length;
  const tauxOccupation = nbLouable > 0 ? Math.round((nbLoue / nbLouable) * 100) : 0;

  const revenusAn = locationsActives.reduce((sum, l) => sum + l.loyerHC * 12, 0);

  const echeancesFin = locationsActives
    .filter((l) => l.dateFin && l.dateFin <= horizon && l.dateFin >= now)
    .map((l) => ({
      kind: 'fin' as const,
      bien: l.bien,
      date: l.dateFin!,
      locataires: l.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(', '),
    }));
  const echeancesRevision = locationsActives
    .filter((l) => l.dateProchaineRevision && l.dateProchaineRevision <= horizon && l.dateProchaineRevision >= now)
    .map((l) => ({
      kind: 'revision' as const,
      bien: l.bien,
      date: l.dateProchaineRevision!,
      locataires: '',
    }));
  const alertesEcheances = [...echeancesFin, ...echeancesRevision].sort((a, b) => a.date.getTime() - b.date.getTime());

  const maxLoyer = Math.max(1, ...locationsActives.map((l) => l.loyerHC));

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Tableau de bord</h1>
          <p>Vue d&apos;ensemble de votre patrimoine locatif au {formatDate(now)}</p>
        </div>
        <BienFormModal />
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <span>Biens gérés</span>
          <strong>{biens.length}</strong>
          <small>
            {nbLoue} loué{nbLoue > 1 ? 's' : ''} · {nbVacant} vacant{nbVacant > 1 ? 's' : ''} · {nbPerso} résidence
            perso.
          </small>
        </div>
        <div className="kpi">
          <span>Revenus locatifs / an</span>
          <strong className="mono">{formatMontant(revenusAn)}</strong>
          <small>{locationsActives.length} {locationsActives.length > 1 ? 'baux actifs' : 'bail actif'}</small>
        </div>
        <div className="kpi">
          <span>Taux d&apos;occupation</span>
          <strong>{tauxOccupation} %</strong>
          {nbVacant > 0 ? (
            <small className="warn">
              {nbVacant} bien{nbVacant > 1 ? 's' : ''} vacant{nbVacant > 1 ? 's' : ''}
            </small>
          ) : (
            <small>Tous les biens loués sont occupés</small>
          )}
        </div>
        <div className="kpi">
          <span>Échéances &lt; 60 j.</span>
          <strong>{alertesEcheances.length}</strong>
          <small className={alertesEcheances.length > 0 ? 'warn' : ''}>
            {echeancesFin.length} fin{echeancesFin.length > 1 ? 's' : ''} de bail · {echeancesRevision.length}{' '}
            révision{echeancesRevision.length > 1 ? 's' : ''} de loyer
          </small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Alertes &amp; échéances proches</h2>
          <Link href="/echeances" className="link-row">
            Voir tout →
          </Link>
        </div>
        <div className="panel-body">
          {alertesEcheances.length === 0 && locataireDocsManquants.length === 0 && (
            <div className="alert-row">
              <span className="txt" style={{ color: 'var(--ink-soft)' }}>
                Aucune alerte pour le moment.
              </span>
            </div>
          )}
          {alertesEcheances.map((a, i) => {
            const jours = joursRestants(a.date);
            const urgent = jours <= 21;
            return (
              <div className="alert-row" key={`ech-${i}`}>
                <span className={`alert-dot ${urgent ? 'brick' : 'amber'}`} />
                <div className="txt">
                  <b>{bienLabel(a.bien)}</b> —{' '}
                  {a.kind === 'fin' ? `fin de bail ${a.locataires}` : 'révision de loyer IRL due'}
                </div>
                <span className={`chip ${urgent ? 'brick' : 'amber'}`}>Dans {jours} j.</span>
              </div>
            );
          })}
          {locataireDocsManquants.map((d) => (
            <div className="alert-row" key={d.id}>
              <span className="alert-dot amber" />
              <div className="txt">
                <b>
                  {d.locataire.prenom} {d.locataire.nom}
                </b>{' '}
                — dossier locataire incomplet ({d.type.toLowerCase().replace('_', ' ')} manquant)
              </div>
              <span className="chip amber">À relancer</span>
            </div>
          ))}
        </div>
      </div>

      {locationsActives.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Loyers hors charges par bien (mensuel)</h2>
          </div>
          <div className="barchart">
            {locationsActives.map((l) => (
              <div className="bar-col" key={l.id}>
                <b>{formatMontant(l.loyerHC)}</b>
                <div className="bar" style={{ height: `${Math.max(6, (l.loyerHC / maxLoyer) * 100)}%` }} />
                <span>{bienLabel(l.bien)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

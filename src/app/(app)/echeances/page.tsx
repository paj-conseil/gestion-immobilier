import { prisma } from '@/lib/db';
import { getCurrentContext } from '@/lib/scope';
import { bienLabel, formatDate, joursRestants } from '@/lib/format';

export default async function EcheancesPage() {
  const ctx = await getCurrentContext();

  const locations = await prisma.location.findMany({
    where: { bien: { scopeId: ctx.scopeId }, statut: 'ACTIF' },
    include: { bien: true, locataires: { include: { locataire: true } } },
  });

  type Alerte = { bien: string; label: string; date: Date; sousTexte?: string };
  const alertes: Alerte[] = [];

  for (const l of locations) {
    const noms = l.locataires.map((x) => `${x.locataire.prenom} ${x.locataire.nom}`).join(', ');
    if (l.dateFin) {
      alertes.push({
        bien: bienLabel(l.bien),
        label: `fin de bail de ${noms}`,
        date: l.dateFin,
        sousTexte: 'Pensez au préavis à envoyer si non-reconduction',
      });
    }
    if (l.dateProchaineRevision) {
      alertes.push({
        bien: bienLabel(l.bien),
        label: 'révision de loyer (indice IRL)',
        date: l.dateProchaineRevision,
      });
    }
  }
  alertes.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Échéances</h1>
          <p>Fins de bail et révisions de loyer à venir</p>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          {alertes.map((a, i) => {
            const jours = joursRestants(a.date);
            const dotClass = jours <= 21 ? 'brick' : jours <= 60 ? 'amber' : '';
            const chipClass = jours <= 21 ? 'brick' : jours <= 60 ? 'amber' : 'neutral';
            return (
              <div className="alert-row" key={i}>
                <span className={`alert-dot ${dotClass}`} />
                <div className="txt">
                  <b>{a.bien}</b> — {a.label}
                  {a.sousTexte && (
                    <>
                      <br />
                      <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{a.sousTexte}</span>
                    </>
                  )}
                </div>
                <span className={`chip ${chipClass}`}>
                  {jours < 0 ? `Dépassée de ${-jours} j.` : `${formatDate(a.date)}`}
                </span>
              </div>
            );
          })}
          {alertes.length === 0 && (
            <div className="alert-row">
              <span className="txt" style={{ color: 'var(--ink-soft)' }}>
                Aucune échéance enregistrée.
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

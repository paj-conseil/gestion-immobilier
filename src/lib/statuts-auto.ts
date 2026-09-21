import 'server-only';
import { prisma } from '@/lib/db';

/**
 * Passe automatiquement en inactif les baux dont la date de sortie est
 * dépassée, puis les locataires qui n'ont plus aucun bail actif. Même règle
 * que lors de la modification d'un bail (locataire-actions) : le bail reste
 * actif jusqu'à la fin du jour de sortie. Exécuté à chaque chargement de
 * l'application (pas de tâche planifiée nécessaire), avec deux requêtes
 * légères qui ne touchent rien tant qu'aucune date n'est dépassée.
 */
export async function synchroniserStatutsExpires(scopeId: string): Promise<void> {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  await prisma.location.updateMany({
    where: { bien: { scopeId }, statut: 'ACTIF', dateFin: { lt: aujourdhui } },
    data: { statut: 'INACTIF' },
  });

  await prisma.locataire.updateMany({
    where: {
      scopeId,
      statut: 'ACTIF',
      locations: { some: {} },
      NOT: { locations: { some: { location: { statut: 'ACTIF' } } } },
    },
    data: { statut: 'INACTIF' },
  });
}

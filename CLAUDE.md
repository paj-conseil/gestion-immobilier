# Gestion immo — contexte du projet

Application web de gestion locative pour Anne et Pierre Jaubert (biens, locataires, documents PDF, états des lieux, comptabilité, projets d'achat). Interface et messages en français.

## Pile technique
- Next.js 16 (App Router, Server Actions) + TypeScript, CSS maison dans `src/app/globals.css` (pas de Tailwind utilitaire dans les composants).
- Prisma 5 + PostgreSQL (Neon). Migrations : `npx prisma migrate dev --name <nom>` (elles s'appliquent directement sur la base de production, il n'y a pas de base de dev séparée).
- NextAuth (identifiants + bcrypt). Périmètres (`Scope`) : toutes les données sont cloisonnées par `scopeId`.
- Hébergement Vercel (projet `gestion-immobilier`), stockage fichiers Vercel Blob (accès privé, lus via `/api/files/[...key]`).
- PDF : `@react-pdf/renderer` (`src/lib/documents/pdf/`). Photos traitées avec `sharp`.
- Déploiement : `git push origin main` (Vercel déploie automatiquement). Le script `build` lance `prisma generate` avant `next build`.

## Workflow habituel
`npx tsc --noEmit` puis `npm run build`, commit, `git push origin main`. Commits en français, avec la ligne `Co-Authored-By: Claude`.

## Pièges connus (à ne pas redécouvrir)
- **Envois de fichiers** : une Server Action est plafonnée à ~4,5 Mo par Vercel (indépendamment de `bodySizeLimit`). Tout fichier volumineux (photos, PDF, tableaux d'amortissement) part directement du navigateur vers Blob (`@vercel/blob/client` `upload()` + route `/api/upload/edl-photo` ou `/api/upload/pret-tableau`), et seule la clé transite par l'action. Les champs `...Url` en base contiennent des **clés de stockage**, pas des URL.
- `getCurrentContext()` (`src/lib/scope.ts`) appelle `redirect('/login')` : à ne jamais utiliser dans un Route Handler (résoudre la session à la main comme dans les routes `/api/upload/*`).
- **Bail en cours** = `statut ACTIF` ET `dateDebut <= aujourd'hui` (et `dateFin` absente ou future). Un bail dont la date de sortie est passée est passé inactif automatiquement (`src/lib/statuts-auto.ts`, exécuté dans le layout), ainsi que les locataires sans bail actif.
- Modales d'édition : ne garder que l'`id` en état et relire l'objet depuis les props à chaque rendu (sinon l'état devient périmé après `router.refresh()`).
- Retours visuels instantanés : état local optimiste plutôt qu'attendre `router.refresh()`.
- CSS : les grilles doivent utiliser `minmax(0, 1fr)` (sinon débordement horizontal sur mobile, masqué par `overflow-x: hidden` du body). Un dropdown ne doit pas être dans un parent `overflow-x: auto`.
- react-pdf ignore l'orientation EXIF : `readPhotoForPdf` (`src/lib/actions/edl-actions.ts`) applique l'orientation, redimensionne et compresse (budget 5 Mo de photos pour que le PDF reste envoyable par email). Un PDF déjà généré ne se met pas à jour tout seul : il faut le régénérer.
- Vercel met `node_modules` en cache : ne pas compter sur `postinstall` pour `prisma generate` (déjà dans `build`).
- Sur la machine Windows de Pierre : ni Python, ni poppler, ni tesseract. Pour lire un PDF scanné, extraire les JPEG (`/DCTDecode`) des octets bruts puis les regarder.
- Jamais de secret dans le chat ni dans git (`.env` est ignoré).

## Fonctionnalités (repères)
- Documents : `src/lib/actions/document-actions.ts`, textes par défaut dans `src/lib/documents/pdf/text-template.ts`, éditables par type dans Droits & accès → Paramétrage par type de document (`DocumentTypeParametre`). Signatures locataire/propriétaire tracées séparément.
- États des lieux : `edl-actions.ts`, `EdlEditor.tsx` (photos multiples, rotation ↻ par canvas, suppression), import d'un document existant.
- Projets : simulation d'achat (onglet « Analyse projet » du classeur Excel `Gestion locative v13.xlsm`), calculs dans `src/lib/projet-calc.ts`.
- Financement des biens : prêts avec tableau d'amortissement et capital restant dû ancré sur le tableau.

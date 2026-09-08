# Gestion immo

Application de gestion locative (biens, locataires, documents, états des lieux,
échéances, comptabilité, droits & accès par périmètre) — remplace les fichiers
Excel « Gestion locative » et « Suivi investissements immobiliers ».

## Prérequis

- **Node.js 20 LTS** (à installer depuis https://nodejs.org si ce n'est pas déjà fait).

## Installation

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Ouvrez ensuite http://localhost:3000 — les identifiants de connexion (Pierre et
Anne) sont affichés dans le terminal à la fin de `npm run seed`.

## Configuration

Le fichier `.env` (déjà créé, non versionné) contient :

- `DATABASE_URL` — base SQLite locale par défaut. Pour la mise en production,
  remplacez par une URL PostgreSQL (Neon/Supabase) et changez `provider =
  "sqlite"` en `"postgresql"` dans `prisma/schema.prisma`.
- `SMTP_PASSWORD` — à renseigner avec un **mot de passe d'application Yahoo**
  (Compte Yahoo → Sécurité → Générer un mot de passe d'application) pour que
  l'envoi d'emails depuis pierrejaubert@yahoo.com fonctionne réellement. Tant
  qu'il est vide, les emails sont simplement journalisés (non envoyés) et
  l'application le signale dans l'écran Documents.

## Structure

- `src/app/(app)/*` — écrans protégés (tableau de bord, biens, locataires,
  documents, états des lieux, échéances, comptabilité, droits & accès).
- `src/lib/actions/*` — Server Actions (une par domaine métier).
- `src/lib/documents/pdf/*` — templates de documents (React-PDF).
- `prisma/schema.prisma` — modèle de données.
- `prisma/seed.ts` — données de démonstration reprises des fichiers Excel
  fournis (6 biens, 4 locataires, comptes bancaires).
- `storage/` — fichiers uploadés (photos, pièces justificatives, PDF générés),
  servis via `/api/files/[...key]` avec vérification du périmètre.

## Périmètres (droits & accès)

Chaque utilisateur appartient à un ou plusieurs « périmètres » (`Scope`), qui
cloisonnent totalement les données (biens, locataires, documents...). Un
administrateur peut aussi **créer un périmètre indépendant** pour quelqu'un
d'autre depuis l'écran Droits & accès, sans avoir lui-même accès aux données
de ce périmètre.

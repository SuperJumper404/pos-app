# AGENTS.md

## But

Ce workspace correspond au frontend du projet POS, basé sur Nuxt 2.
Les agents doivent faire des changements ciblés, sûrs, et cohérents avec
l’existant. Éviter les refactors larges sauf demande explicite.

## Périmètre

Ce dossier `pos-app` contient le frontend.

Le backend lié se trouve dans le workspace voisin :

- `../express-pos`

Repères backend utiles :

- `src/routers/` : routes API
- `src/controllers/` : contrôleurs
- `src/modules/` : logique métier et accès aux données
- `db/migrations/` : migrations SQL

Repères frontend utiles :

- `nuxt.config.js` : config Nuxt + Axios
- `plugins/axios.js` : gestion des erreurs Axios
- `config/config.json` : mapping des endpoints selon l’environnement

## Stack

- Nuxt 2
- Vue 2
- Vuetify
- Vuex
- Axios

## Structure du projet

- `pages/` : pages et routes Nuxt
- `components/` : composants réutilisables
- `layouts/` : layouts Nuxt
- `store/` : modules Vuex
- `plugins/` : plugins Nuxt
- `middleware/` : middlewares de navigation
- `assets/` : assets source
- `static/` : fichiers publics statiques
- `helpers/` : utilitaires partagés
- `config/` : configuration locale du projet

## Règles de travail

- Lire les fichiers voisins avant modification pour respecter le style existant.
- Utiliser le MCP `workspace_fs` pour explorer les fichiers du projet.
- Utiliser le MCP `workspace_fs` comme source principale pour préparer les modifications.
- Garder les changements petits, ciblés et liés à la demande utilisateur.
- Préserver l’architecture actuelle et les choix techniques déjà en place.
- Réutiliser les helpers, patterns Vuex et composants Vuetify existants.
- Ne pas ajouter de dépendance sans nécessité claire.
- Ne pas faire de refactor global sans demande explicite.
- Pour toute modification liée à l’API, vérifier les hypothèses d’environnement dans `.env`, `nuxt.config.js`, `plugins/axios.js` et `config/config.json`.

## Commandes utiles

- `npm run dev` : démarrage local
- `npm run network` : démarrage en mode réseau
- `npm run build` : build principal
- `npm run build-local` : build local
- `npm run start` : démarrage Nuxt
- `npm run start:static` : service du build statique
- `npm run generate` : génération statique
- `npm run lint` : lint JavaScript/Vue

## Environnement

- Une configuration `.env` est attendue avant démarrage local.
- Certains scripts utilisent `NODE_OPTIONS=--openssl-legacy-provider`.
- Conserver ce comportement sauf si la tâche concerne explicitement la modernisation du tooling.

## Validation

Après modification, lancer la vérification la plus petite possible selon le changement :

- `npm run lint` pour les changements JS/Vue
- `npm run dev` pour une vérification manuelle locale
- `npm run build` ou `npm run build-local` pour les changements sensibles au build

## Consignes de modification

- Pour l’UI, rester cohérent avec le design Vuetify existant.
- Pour le store, garder des responsabilités claires et éviter les effets de bord cachés.
- Pour les pages Nuxt, faire attention au comportement client-only et aux différences liées à Nuxt 2.
- Pour l’impression, les PDF, les graphiques ou les QR codes, vérifier d’abord les dépendances déjà présentes avant d’ajouter une nouvelle implémentation.

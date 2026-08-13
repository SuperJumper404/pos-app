# AGENTS.md

## But

Ce workspace correspond au frontend du projet POS, base sur Nuxt 2.
Les agents doivent faire des changements cibles, surs, et coherents avec
l'existant. Eviter les refactors larges sauf demande explicite.

## Perimetre

Ce dossier `pos-app` contient le frontend.

Le backend lie se trouve dans le workspace voisin :

- `../express-pos`

Reperes backend utiles :

- `src/routers/` : routes API
- `src/controllers/` : controleurs
- `src/modules/` : logique metier et acces aux donnees
- `db/migrations/` : migrations SQL

Reperes frontend utiles :

- `nuxt.config.js` : config Nuxt + Axios
- `plugins/axios.js` : gestion des erreurs Axios
- `config/config.json` : mapping des endpoints selon l'environnement

## Stack

- Nuxt 2
- Vue 2
- Vuetify
- Vuex
- Axios

## Structure du projet

- `pages/` : pages et routes Nuxt
- `components/` : composants reutilisables
- `layouts/` : layouts Nuxt
- `store/` : modules Vuex
- `plugins/` : plugins Nuxt
- `middleware/` : middlewares de navigation
- `assets/` : assets source
- `static/` : fichiers publics statiques
- `helpers/` : utilitaires partages
- `config/` : configuration locale du projet

## Regles de travail

- Lire les fichiers voisins avant modification pour respecter le style existant.
- Utiliser le MCP `workspace_fs` pour explorer les fichiers du projet.
- Utiliser le MCP `workspace_fs` comme source principale pour preparer les modifications.
- Garder les changements petits, cibles et lies a la demande utilisateur.
- Preserver l'architecture actuelle et les choix techniques deja en place.
- Reutiliser les helpers, patterns Vuex et composants Vuetify existants.
- Ne pas ajouter de dependance sans necessite claire.
- Ne pas faire de refactor global sans demande explicite.
- Pour toute modification liee a l'API, verifier les hypotheses d'environnement dans `.env`, `nuxt.config.js`, `plugins/axios.js` et `config/config.json`.

## Commandes utiles

- `npm run dev` : demarrage local
- `npm run network` : demarrage en mode reseau
- `npm run build` : build principal
- `npm run build-local` : build local
- `npm run start` : demarrage Nuxt
- `npm run start:static` : service du build statique
- `npm run generate` : generation statique
- `npm run lint` : lint JavaScript/Vue

## Environnement

- Une configuration `.env` est attendue avant demarrage local.
- Certains scripts utilisent `NODE_OPTIONS=--openssl-legacy-provider`.
- Conserver ce comportement sauf si la tache concerne explicitement la modernisation du tooling.

## Validation

Apres modification, lancer la verification la plus petite possible selon le changement :

- `npm run lint` pour les changements JS/Vue
- `npm run dev` pour une verification manuelle locale
- `npm run build` ou `npm run build-local` pour les changements sensibles au build

## Consignes de modification

- Pour l'UI, rester coherent avec le design Vuetify existant.
- Pour le store, garder des responsabilites claires et eviter les effets de bord caches.
- Pour les pages Nuxt, faire attention au comportement client-only et aux differences liees a Nuxt 2.
- Pour l'impression, les PDF, les graphiques ou les QR codes, verifier d'abord les dependances deja presentes avant d'ajouter une nouvelle implementation.

## Regles de navigation POS

- Les endpoints/modules Categories, Etapes produits et Stock ne doivent pas apparaitre dans le side menu ni dans la page d'accueil.
- Ces pages peuvent rester accessibles depuis les parcours internes existants, par exemple depuis la page Produits, mais pas comme entrees de navigation principale.

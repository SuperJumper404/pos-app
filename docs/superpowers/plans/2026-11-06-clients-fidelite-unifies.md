# Clients et fidélité unifiés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Réunir les comptes, contacts historiques, achats et cartes dans un annuaire administratif et un écran Clients et fidélité.

**Architecture:** Le backend produit un modèle client commun à partir de `customers`, identités vérifiées, archives et adhésions. Les rapprochements de gestion sont persistés séparément des identités et archives financières ; les anciens contacts restent lisibles avant l'import explicite. Le frontend utilise un store staff dédié et réutilise le formulaire et les opérations de fidélité existants.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, Express, MySQL ; aucune nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-06-clients-fidelite-unifies-design.md`

## Global Constraints

- Préserver les comptes, cartes, QR, points, réservations, Wallet, données financières et modifications locales existantes.
- Identifiants clients SQL conservés sous forme de chaînes ; toutes les requêtes limitées au restaurant de la session.
- Aucune adhésion ni modification de points déclenchée par la lecture ou le rapprochement des achats.
- Les correspondances de téléphone n'autorisent jamais l'accès personnel aux commandes anciennes.
- `/clients` devient l'espace commun ; `/fidelite` redirige vers le programme, `/compte/fidelite` reste distinct.
- Préparer les migrations et l'import, sans exécuter de migration sur la base réelle de l'application.

## Review Focus

1. Téléphone ancien incomplet ou ambigu : contact conservé, aucune identité ou carte choisie arbitrairement (tâche 1).
2. Compte apparu après import : une seule fiche visible, alias conservé, aucun transfert d'autorité (tâches 1–2).
3. Même numéro dans deux restaurants et grands identifiants : aucune fuite ni perte de précision (tâches 1–2).
4. Réponses périmées et échecs de fidélité : ne pas montrer un autre client ni bloquer les statistiques (tâche 3).
5. Pagination/export : les chiffres globaux ne dépendent pas des seuls éléments chargés ; CSV protégé des formules (tâches 1–3).

## Interfaces communes

`buildClientDirectory({ customers, identities, members, archives, links, canManageLoyalty, now })` retourne `{ rows, metrics, contacts }`. Chaque ligne contient `id`, `customerId`, `contactKeys`, `name`, `phone`, `email`, `aliases`, `source`, `verified`, `orderCount`, `totalSpent`, `averageSpent`, `firstOrderAt`, `lastOrderAt`, `lastVisitDays`, `lastVisitLabel`, `reconciliation` et `loyalty` seulement si autorisée. Un contact avant import utilise `historical:<sha256>` ; après import ce même identifiant reste résoluble via `contactKeys`.

`buildClientDirectoryService({ repository, runInTransaction, clock })` expose `list({shopId,canManageLoyalty,q,filter,page,pageSize})`, `detail({shopId,canManageLoyalty,id})`, `exportCsv(scope)`, `reconcile({shopId,actorId,dryRun})`, `linkContact({shopId,actorId,contactKey,customerId})`.

Routes sous le préfixe existant : GET `/clients`, GET `/clients/export`, GET `/clients/:id`, POST `/clients/reconcile` avec `{dryRun}`, POST `/clients/contacts/:contactKey/link` avec `{customerId}`. Réponses dans l'enveloppe existante `response.data.data`. Configuration programme et corrections : routes fidélité existantes.

### Task 1: Projection métier et statistiques communes

**Files:** créer backend `src/helpers/clientDirectory.js`, `test/client-directory.test.js`.

**Consumes:** tableaux de sources limités au restaurant ; normalisation `normalizeCustomerDestination` existante.
**Produces:** `buildClientDirectory`, `selectClientRows`, `clientDirectoryCsv`, `clientPhoneKey`.

- [x] Écrire des tests de fusion d'un compte avec carte et archives, adhérent sans achat, priorité du `customer_account_id`, contact `555`, variantes FR/internationales, ambiguïté, alias importé devenu compte vérifié, source protégée, absence de données fidélité sans droits, très grands identifiants, filtre/export et formules CSV.
- [x] Exécuter `node --test test/client-directory.test.js` et observer les échecs attendus.
- [x] Implémenter la projection sans mutation des sources ; donner priorité aux liens explicites puis aux correspondances persistées puis aux téléphones vérifiés uniques. Ne jamais créer de compte depuis ce helper.
- [x] Vérifier les tests et enregistrer le résultat au journal d'exécution.

### Task 2: Persistance, API et import explicite

**Files:** créer backend `db/migrations/20261106120000_client_directory.sql`, `src/modules/m_clientDirectory.js`, `src/controllers/c_clientDirectory.js`, `scripts/reconcile-client-directory.js`, `test/client-directory-service.test.js`, `test/client-directory-routes.test.js`, `test/client-directory.integration.test.js` ; modifier `src/routers/r_customers.js`, `package.json` uniquement pour les vérifications nécessaires.

**Consumes:** projection et DTO de la tâche 1.
**Produces:** service et routes décrits dans les interfaces communes ; table `customer_directory_contacts` de correspondances et table `customer_directory_events` d'audit, toutes deux limitées par restaurant.

- [x] Écrire les tests service/autorisation : import simulé sans écriture, import rejoué, rapprochement manuel protégé, verrou de restaurant, conflits, isolement, rejet sessions non staff et permissions absentes, confidentialité de fidélité, filtres, pagination et détail par alias.
- [x] Exécuter les tests avant implémentation et observer les échecs.
- [x] Implémenter les lectures limitées au restaurant, transactions/verrous, import explicite idempotent et CLI `--shop-id N [--apply]`, simulation par défaut. Ne pas modifier les tables d'authentification, les points ou les archives.
- [x] Brancher les routes, conserver les routes clients de livraison existantes, documenter la migration et la commande d'import.
- [x] Vérifier les tests ; ajouter une intégration MySQL utilisant exclusivement `DELIVERY_TEST_DATABASE_URL` et le helper de base jetable existant.

### Task 3: Écran unique et état staff

**Files:** créer frontend `store/clients.js`, `components/clients/ClientDirectory.vue`, `components/clients/ClientDetail.vue`, `components/loyalty/LoyaltyProgram.vue`, `test/client-directory-ui.test.js`, `test/client-directory-store.test.js` ; modifier `pages/clients.vue`, `pages/fidelite.vue`, `helpers/listdashboard.js`, les tests de page/navigation affectés et `helpers/persistedState.js` si nécessaire pour exclure l'annuaire staff.

**Consumes:** API de la tâche 2 ; actions `loyalty/loadProgram`, `saveProgram`, `memberHistory`, `adjust` existantes.
**Produces:** store staff `clients` avec `load`, `detail`, `exportCsv`, `reconcile`, `linkContact`, `reset` ; page Clients et fidélité à onglets Clients / Programme de fidélité, fiche détaillée et rapprochement explicite.

- [x] Écrire et exécuter des tests d'état, requêtes/recherches, réponses tardives, changements de session, droit de configuration, redirection et rendu des comptes avec/sans carte et sans achats.
- [x] Extraire sans changer ses fonctions le programme actuel dans `LoyaltyProgram.vue` ; déplacer la consultation des mouvements/corrections vers la fiche client commune.
- [x] Construire la liste Vuetify avec recherche, filtres, pagination serveur, CSV, indicateurs globaux et lecture mobile. Réserver les rapprochements et réglages aux administrateurs.
- [x] Conserver la liste visible en cas de défaillance de chargement des détails fidélité ; afficher un réessai ciblé.
- [x] Vérifier les tests et le lint ; ajuster uniquement les assertions obsolètes liées aux deux anciens écrans.

### Task 4: Vérification intégrée, rendu et relecture

**Files:** compléter les tests précédents ; créer `docs/clients-fidelite.md` pour l'installation et la reprise des données.

- [x] Vérifier les tests ciblés des deux dépôts, puis les suites complètes, les tests fidélité existants et `npm run lint` frontend.
- [x] Vérifier la migration sur une base MySQL jetable si disponible, jamais avec les identifiants applicatifs. Signaler explicitement toute vérification non exécutable.
- [x] Vérifier le rendu ordinateur/mobile dans une session locale ou une page de test avec données simulées ; une passe de corrections puis confirmation.
- [x] Faire relire les modifications complètes par un agent indépendant ; traiter les problèmes matériels avec tests de reproduction.
- [x] Terminer avec les changements réalisés, validations et étapes d'installation nécessaires, sans déploiement ni modification de données réelles.

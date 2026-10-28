# Standalone Terminal Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encaisser sur le TPE sans créer de commande, afficher une ligne dans l'historique commun et y joindre des commandes archivées sans effet financier.

**Architecture:** Réutiliser le cycle Stripe Terminal et sa table de paiements avec un type explicite. Séparer les pièces jointes des allocations de paiement. Servir les commandes archivées et les paiements autonomes dans une liste commune paginée ; le frontend conserve les actions propres à chaque type.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios ; Express, MySQL, Stripe Node existant.

**Spec:** `docs/superpowers/specs/2026-10-28-standalone-terminal-payments-design.md`

## Global Constraints

- Aucun onglet supplémentaire n'est ajouté.
- Le rattachement ne règle pas les commandes, ne change pas leur statut et ne lance aucun nouveau débit.
- Aucune dépendance supplémentaire n'est prévue.
- Aucun ajout dans `stripe_terminal_payment_orders`, `orders` ou `archives` pour un paiement autonome.
- Les commandes payées et non payées peuvent être jointes, sans comparaison des montants.
- Réutiliser les patterns voisins et `workspace_fs` comme source principale de lecture. Ne pas exposer de secrets ou effectuer de débit réel.

## Execution

L'utilisateur a validé le démarrage du code. Répartir les domaines serveur (tâches 1–2) et interface (tâches 3–4) avec le skill dispatching-parallel-agents, après fixation du contrat ci-dessous. Le contrôleur principal réalise l'interface et l'intégration, puis fait relire le résultat complet. Travailler sur `codex/standalone-terminal-payments` dans les deux dépôts propres existants ; ne pas déplacer les environnements locaux et dépendances.

## Review Focus

- Une réponse de création perdue ne doit jamais permettre un second débit : tester le même attemptKey, y compris après succès et après changement du montant.
- Un paiement libre ne doit pas être annulé par la reprise d'un paiement de commande : tester le lecteur partagé entre les deux types et la borne.
- Commande et paiement peuvent porter l'identifiant 123 : tester les clés de ligne distinctes et le filtrage des actions.
- La déconnexion d'un caissier pendant une requête ne doit pas donner sa tentative au suivant : tester les réponses tardives et le nettoyage de session.
- Un caissier peut joindre une commande de 40 EUR à un paiement de 50 EUR : tester l'absence d'allocation et de mutation de commande, et la copie conservée après disparition de l'archive.

## Contrat d'API commun

Préfixe frontend : `/baseurl/api/v1/stripe/terminal` ; serveur enregistré sous `/api/v1` selon l'existant. Réponses `{ success: true, code: 200|201, data }`.

- `POST /standalone-payments` : `{ amountCents: integer, attemptKey: UUID }` → `StandalonePayment`. Toute répétition de la clé conserve le paiement initial ; montant changé refusé.
- `GET /standalone-payments/:id` → `StandalonePayment` réconcilié, propriétaire avec droit caisse.
- `POST /standalone-payments/:id/cancel` → `StandalonePayment`, même règle de propriétaire.
- `GET /history?search=&page=1&itemsPerPage=10&sortBy=eventAt&sortDesc=true` → `{ items: HistoryEntry[], total: integer }`, droit historique, filtre commerce/archives visibles. Recherche et pagination communes à tous les types. Tri whitelist correspondant aux colonnes, bornes de page explicites ; `itemsPerPage=-1` n'est pas proposé dans l'UI.
- `GET /standalone-payments/attachment-candidates?search=&page=1&itemsPerPage=10` → `{ items: AttachmentCandidate[], total: integer }`, droit historique.
- `GET /standalone-payments/:id/attachments` → `{ payment: StandalonePayment, attachments: Attachment[] }`, droit historique et même commerce, sans contrôle de propriétaire.
- `POST /standalone-payments/:id/attachments` : `{ archiveIds: positiveInteger[] }` → même réponse, ajout idempotent, paiement confirmé.
- `DELETE /standalone-payments/:id/attachments/:archiveId` → même réponse, retrait idempotent, paiement confirmé.

`StandalonePayment = { id, paymentKind: 'standalone', readerId, status: 'creating'|'processing'|'succeeded'|'failed'|'canceled', amountCents, currency: 'eur', createdAt: string, confirmedAt: string|null, failureCode: string|null, failureMessage: string|null, cardTicket: object|null, attachmentsCount: integer }`.

`HistoryEntry` contient les champs plats historiques des archives (id, ordernumber, username, customer, taken_by_name, prepared_by_name, subtotal, payment_status, status, etc.), plus `entryType: 'order'|'terminal_payment'`, `rowKey: 'order:<id>'|'terminal-payment:<id>'`, `eventAt: string`. Une ligne de paiement contient aussi `terminalPayment: StandalonePayment`; `subtotal` correspond à son montant en EUR et les champs de commande sans objet sont nuls. Sa référence affichée est `TPE #<id>`. L'ordre est stable sur eventAt puis type/id. Les endpoints historiques existants restent disponibles.

`AttachmentCandidate = { archiveId, orderNumber: string, amountCents: integer, createdAt: string, tableName: string|null, customer: string|null }`.

`Attachment = { archiveId, orderNumber: string, amountCents: integer, attachedAt: string, available: boolean }`. Les montants/reférences proviennent du serveur et restent consultables si la source disparaît. Le lien vers le ticket n'est actif que si `available`.

## Task 1: Cycle de paiement autonome et stockage (backend)

**Files:** Modifier `../express-pos/src/services/stripeTerminalPayments.js`, `src/modules/m_stripeTerminal.js`, `src/controllers/c_stripeTerminal.js`, `src/routers/r_stripe.js`, `src/services/stripeTerminalWebhooks.js` selon les besoins ; créer une migration `db/migrations/20261028120000_standalone_terminal_payments.sql` et des tests `test/stripe-terminal-standalone-payments.test.js`.

**Interfaces:** Consomme le module Terminal et ses verrous existants. Produit les trois opérations paiement du contrat. La finalisation sélectionne le type stocké ; les validateurs et DTO des commandes restent stricts.

- [ ] Écrire des tests démontrant que 5000 centimes sans commande créent un paiement autonome, que deux appels avec la même clé ne créent qu'un intent, qu'une clé avec 6000 est refusée, et que les statuts/notifications n'altèrent aucune commande.
- [ ] Exécuter `node test/stripe-terminal-standalone-payments.test.js` ; constater l'échec pour fonctionnalité absente.
- [ ] Implémenter `payment_kind` (défaut order), `confirmed_at`, la création autonome, l'idempotence durable et le routage de finalisation. Maintenir le verrou commun du lecteur ; interdire la récupération/annulation inter-types. Montants EUR entiers entre 50 et 99999999 centimes. Une tentative ambiguë ne devient pas libre de créer un deuxième paiement.
- [ ] Exécuter les tests nouveaux et `node test/stripe-terminal-payments.test.js`, `node test/stripe-terminal-kiosk-payments.test.js`, `node test/stripe-terminal-webhooks.test.js`, `node test/stripe-terminal-locking.test.js` ; attendu aucun échec.
- [ ] Commit ciblé après vérification.

## Task 2: Historique commun et commandes jointes (backend)

**Files:** Créer `../express-pos/src/modules/m_terminalPaymentHistory.js`, `src/controllers/c_terminalPaymentHistory.js`, et `test/terminal-payment-history.test.js` ; compléter la migration de la tâche 1 et `src/routers/r_stripe.js`, `src/helpers/middleware/auth.js` pour un droit `history` cohérent avec `cashregister`.

**Interfaces:** Produit les opérations history/candidats/attachments du contrat. Ne jamais réutiliser la table d'allocations pour les pièces jointes. Réutiliser les projections ou lectures existantes quand possible sans refactor global.

- [ ] Écrire des tests de liste mêlant order:123 et terminal-payment:123, pagination/recherche communes, isolation commerce/droits, archives masquées, ajout de commandes à montants différents et retrait idempotent.
- [ ] Lancer `node test/terminal-payment-history.test.js` ; attendu échec dû aux fonctions absentes.
- [ ] Implémenter le module injectable, le contrôleur et les routes avec requêtes paramétrées, validation, transaction d'ajout/retrait et copie minimale. La modification des pièces jointes n'affecte ni date de confirmation, ni allocations, ni paiement, ni archive.
- [ ] Lancer le test puis `npm test` dans le backend ; attendu sortie 0. Commit des fichiers backend ciblés.

## Task 3: Store, clavier et modale de paiement (frontend)

**Files:** Créer `helpers/standaloneTerminal.js`, `store/terminalPayments.js`, `components/terminal/StandaloneTerminalDialog.vue`, tests `test/standalone-terminal.test.js`, `test/standalone-terminal-store.test.js`, `test/standalone-terminal-dialog.test.js`. Modifier `layouts/default.vue`, `helpers/persistedState.js`, `store/users.js`, `package.json`.

**Interfaces:** Consomme `stripeTerminal/currentReader` et les trois opérations paiement. Le nouveau store est indépendant de `stripeTerminal/activePayment`. Utilise `terminalPayments/startPayment({amountCents,attemptKey})`, `refreshPayment(id)`, `cancelPayment(id)`, `resetSession()` ; états activePayment/loading/error. La copie de reprise contient uniquement attemptKey, amountCents, paymentId et est scellée au contexte commerce/caissier.

- [ ] Écrire les tests de saisie en centimes, reprise d'une clé, DTO de succès sans commande, erreur réseau conservant la tentative et réponse tardive rejetée après reset/changement de session.
- [ ] Lancer les tests et constater les échecs avant implémentation.
- [ ] Implémenter les helpers, actions et la modale Vuetify : clavier tactile/physique, affichage 0,00 EUR, libellés français, verrou pendant attente, annulation serveur, reprise et lien vers `/history` après succès. Utiliser des cibles d'au moins 44 px et les tokens existants.
- [ ] Ajouter le bouton à côté d'Accueil, avec vérification staff/cashregister et lecteur actif en ligne ; conserver l'accès à une tentative existante si le lecteur disparaît. Nettoyer le store à la déconnexion et l'exclure de la persistance générale.
- [ ] Lancer les tests ciblés, ceux de session et de navigation ; attendu sortie 0. Commit ciblé.

## Task 4: Lignes mixtes et modale de pièces jointes (frontend)

**Files:** Modifier `pages/history/index.vue`, `store/history.js`, `helpers/history.js` si nécessaire ; créer `components/history/TerminalPaymentAttachments.vue` et `test/terminal-payment-history-ui.test.js`.

**Interfaces:** Consomme la lecture commune du contrat via `history/getEntries({search,page,itemsPerPage,sortBy,sortDesc})`, états `entries` et `entriesTotal`. Les actions de pièces jointes utilisent le module `terminalPayments` et retournent les DTO sans modifier la tentative active du caissier.

- [ ] Écrire des tests de rendu réel/Vue des deux types portant le même id, actions propres à chaque type, montant 50 EUR avec commande de 40 EUR et résultat de recherche tardif ignoré.
- [ ] Lancer le test et constater l'échec avant modification.
- [ ] Brancher la table unique sur pagination serveur, distinguer les clés/types et rendre la ligne de paiement. Garder les tickets/détails/suppression de commandes ; charger les détails des archives affichées après la liste.
- [ ] Implémenter la modale de pièces jointes avec recherche des archives, multi-ajout, retrait et message informatif ; ne montrer aucun contrôle d'égalité ni calcul de différence. Une source disparue garde sa copie et un lien désactivé.
- [ ] Vérifier les tests historiques/navigation puis `npm test`, `npm run lint`, `npm run build-local` ; attendu sortie 0, signaler les défauts préexistants si présents.
- [ ] Contrôler bureau et mobile avec API simulée, sans paiement réel, puis faire relire la modification complète et corriger les défauts matériels. Commit ciblé et livraison locale ; ne pas publier ni fusionner sans demande.

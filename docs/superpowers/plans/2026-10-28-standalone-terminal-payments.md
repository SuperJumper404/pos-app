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

- [x] Écrire des tests démontrant que 5000 centimes sans commande créent un paiement autonome, que deux appels avec la même clé ne créent qu'un intent, qu'une clé avec 6000 est refusée, et que les statuts/notifications n'altèrent aucune commande.
- [x] Exécuter `node test/stripe-terminal-standalone-payments.test.js` ; constater l'échec pour fonctionnalité absente.
- [x] Implémenter `payment_kind` (défaut order), `confirmed_at`, la création autonome, l'idempotence durable et le routage de finalisation. Maintenir le verrou commun du lecteur ; interdire la récupération/annulation inter-types. Montants EUR entiers entre 50 et 99999999 centimes. Une tentative ambiguë ne devient pas libre de créer un deuxième paiement.
- [x] Exécuter les tests nouveaux et `node test/stripe-terminal-payments.test.js`, `node test/stripe-terminal-kiosk-payments.test.js`, `node test/stripe-terminal-webhooks.test.js`, `node test/stripe-terminal-locking.test.js` ; attendu aucun échec.
- [x] Commit ciblé après vérification.

## Task 2: Historique commun et commandes jointes (backend)

**Files:** Créer `../express-pos/src/modules/m_terminalPaymentHistory.js`, `src/controllers/c_terminalPaymentHistory.js`, et `test/terminal-payment-history.test.js` ; compléter la migration de la tâche 1 et `src/routers/r_stripe.js`, `src/helpers/middleware/auth.js` pour un droit `history` cohérent avec `cashregister`.

**Interfaces:** Produit les opérations history/candidats/attachments du contrat. Ne jamais réutiliser la table d'allocations pour les pièces jointes. Réutiliser les projections ou lectures existantes quand possible sans refactor global.

- [x] Écrire des tests de liste mêlant order:123 et terminal-payment:123, pagination/recherche communes, isolation commerce/droits, archives masquées, ajout de commandes à montants différents et retrait idempotent.
- [x] Lancer `node test/terminal-payment-history.test.js` ; attendu échec dû aux fonctions absentes.
- [x] Implémenter le module injectable, le contrôleur et les routes avec requêtes paramétrées, validation, transaction d'ajout/retrait et copie minimale. La modification des pièces jointes n'affecte ni date de confirmation, ni allocations, ni paiement, ni archive.
- [x] Lancer le test puis `npm test` dans le backend ; attendu sortie 0. Commit des fichiers backend ciblés.

## Task 3: Store, clavier et modale de paiement (frontend)

**Files:** Créer `helpers/standaloneTerminal.js`, `store/terminalPayments.js`, `components/terminal/StandaloneTerminalDialog.vue`, tests `test/standalone-terminal.test.js`, `test/standalone-terminal-store.test.js`, `test/standalone-terminal-dialog.test.js`. Modifier `layouts/default.vue`, `helpers/persistedState.js`, `store/users.js`, `package.json`.

**Interfaces:** Consomme `stripeTerminal/currentReader` et les trois opérations paiement. Le nouveau store est indépendant de `stripeTerminal/activePayment`. Utilise `terminalPayments/startPayment({amountCents,attemptKey})`, `refreshPayment(id)`, `cancelPayment(id)`, `resetSession()` ; états activePayment/loading/error. La copie de reprise contient uniquement attemptKey, amountCents, paymentId et est scellée au contexte commerce/caissier.

- [x] Écrire les tests de saisie en centimes, reprise d'une clé, DTO de succès sans commande, erreur réseau conservant la tentative et réponse tardive rejetée après reset/changement de session.
- [x] Lancer les tests et constater les échecs avant implémentation.
- [x] Implémenter les helpers, actions et la modale Vuetify : clavier tactile/physique, affichage 0,00 EUR, libellés français, verrou pendant attente, annulation serveur, reprise et lien vers `/history` après succès. Utiliser des cibles d'au moins 44 px et les tokens existants.
- [x] Ajouter le bouton à côté d'Accueil, avec vérification staff/cashregister et lecteur actif en ligne ; conserver l'accès à une tentative existante si le lecteur disparaît. Nettoyer le store à la déconnexion et l'exclure de la persistance générale.
- [x] Lancer les tests ciblés, ceux de session et de navigation ; attendu sortie 0. Commit ciblé.

## Task 4: Lignes mixtes et modale de pièces jointes (frontend)

**Files:** Modifier `pages/history/index.vue`, `store/history.js`, `helpers/history.js` si nécessaire ; créer `components/history/TerminalPaymentAttachments.vue` et `test/terminal-payment-history-ui.test.js`.

**Interfaces:** Consomme la lecture commune du contrat via `history/getEntries({search,page,itemsPerPage,sortBy,sortDesc})`, états `entries` et `entriesTotal`. Les actions de pièces jointes utilisent le module `terminalPayments` et retournent les DTO sans modifier la tentative active du caissier.

- [x] Écrire des tests de rendu réel/Vue des deux types portant le même id, actions propres à chaque type, montant 50 EUR avec commande de 40 EUR et résultat de recherche tardif ignoré.
- [x] Lancer le test et constater l'échec avant modification.
- [x] Brancher la table unique sur pagination serveur, distinguer les clés/types et rendre la ligne de paiement. Garder les tickets/détails/suppression de commandes ; charger les détails des archives affichées après la liste.
- [x] Implémenter la modale de pièces jointes avec recherche des archives, multi-ajout, retrait et message informatif ; ne montrer aucun contrôle d'égalité ni calcul de différence. Une source disparue garde sa copie et un lien désactivé.
- [x] Vérifier les tests historiques/navigation puis `npm test`, `npm run lint`, `npm run build-local` ; attendu sortie 0, signaler les défauts préexistants si présents.
- [x] Contrôler bureau et mobile avec API simulée, sans paiement réel, puis faire relire la modification complète et corriger les défauts matériels. Commit ciblé et livraison locale ; ne pas publier ni fusionner sans demande.

## Validation et livraison

- Backend : `npm test` passe après les commits `0a91b22` et `e69f014`. La relecture indépendante a identifié deux défauts de reprise, corrigés avec tests RED→GREEN : réservation jamais soumise à Stripe, et intention déjà confirmée avec lecteur hors ligne. Le marqueur durable `stripe_create_submitted_at` préserve la distinction avec une création Stripe incertaine.
- Frontend : `npm test` passe sur la version finale ; `npm run lint` termine sans erreur (avertissements du projet et des scripts de test) ; `npm run build-local` passe avec les avertissements de taille des bundles.
- Les six scripts de `npm run test:standalone-terminal` couvrent montants entiers, même clé après erreur, réponses tardives/changement de session, commandes et paiements ayant le même identifiant, total de commande différent du paiement et sélection accessible.
- Parcours réel Nuxt/Vuetify vérifié en navigateur avec API simulée, à 1440 et 390 px : clavier, Enter sur Fermer/Effacer/chiffre sans débit, sélection par Espace, fermeture/réouverture pendant la requête, un seul paiement logique de 50 EUR et commande jointe de 40 EUR. Aucun appel Stripe réel.
- Relecture frontend : reprise automatique après réouverture corrigée avec test réactif RED→GREEN. Le lien vers un ancien paiement ouvre son détail même si sa ligne est hors de la page courante.
- Relecture visuelle : quatre corrections demandées résolues, disposition `ship` pour les corrections examinées. Le documenter confirme l'héritage du système existant ; aucun changement de PRODUCT.md, DESIGN.md ou du sidecar.
- Migration `20261028120000` appliquée le 28 octobre sur MySQL 8.0.33 local (`pointofsale_local`, port 3307), après sauvegarde. Le test sur la vraie base a révélé une référence à `archives.username`, colonne inexistante : les requêtes utilisent désormais `service_points.name`, comme l'historique existant, avec régressions RED→GREEN. Le test transactionnel réel vérifie les lignes mixtes, la pagination, l'isolation boutique et deux commandes de 40 EUR au total jointes à un paiement de 50 EUR sans mutation des commandes ; les données temporaires sont annulées. `npm test` backend passe après correction. Les endpoints réels d'historique et de recherche répondent 200. Aucun lecteur local n'est enregistré : la création répond `TERMINAL_NO_READER` sans paiement créé. L'application et son API locales répondent 200, Stripe est configuré en mode test. Le paiement sur lecteur et la livraison des webhooks restent à vérifier après enregistrement et affectation d'un lecteur.

## Décisions d'exécution

1. Garder les checkouts propres existants sur des branches dédiées dans les deux dépôts : préserve les dépendances et les environnements locaux. Les changements sont visibles dans le workspace jusqu'au changement de branche.
2. Répartir les domaines backend/frontend avec contrat d'API fixe puis vérifier leur intégration : évite les écritures concurrentes sur les mêmes fichiers. Le parcours navigateur utilise des réponses conformes à ce contrat ; l'intégration MySQL et la lecture des endpoints réels ont ensuite été vérifiées localement.
3. Charger les détails d'archive à l'expansion et retourner leur résultat directement : supprime la concurrence sur l'ancien détail partagé et évite de charger toute l'histoire. Le premier dépliage affiche un chargement.
4. Laisser le serveur décider de l'annulation d'une réservation `creating` sous verrou : une réservation jamais soumise est annulable ; une création incertaine reste protégée et peut exiger un rapprochement.
5. Traiter l'accès direct à un paiement hors de la page courante comme une exigence d'usage : ouvrir son détail dans l'Historique préserve l'accès aux pièces jointes sans dépendre du tri courant. Cela ouvre une modale supplémentaire quand ce lien est suivi.

Aucun défaut critique ou important non corrigé n'a été retenu. Les observations de style héritées et la taille spécifique de l'affichage du montant ne justifient pas un refactor du système de design. Les changements sont conservés localement sur `codex/standalone-terminal-payments`, sans publication ni fusion.

## Suivi staging : annulation et terminal occupé

Le déploiement Docker du 28 octobre a été effectué sur staging. Le test utilisateur était bloqué par un paiement de commande de 22 EUR encore en collecte. Cette tentative de test a été annulée et un paiement libre réel auprès de l'API Stripe en mode test de 0,50 EUR a ensuite été créé et annulé avec succès, sans encaissement.

Le lecteur courant expose maintenant un résumé limité au paiement actif du même utilisateur, sans identifiant Stripe ni clé privée. La fenêtre permet d'annuler cette tentative, commande ou paiement libre, après réouverture. Une annulation demandée pendant un contrôle automatique est exécutée dès sa fin. La collecte active aussi l'annulation sur le lecteur physique ; un abandon client confirmé est rapproché comme annulé. Une réponse de lecteur périmée après annulation est contrôlée par une nouvelle lecture, sans libérer une tentative dont la collecte reste active. Ces cas ont des tests de régression et le parcours de récupération/annulation a été vérifié dans Nuxt en navigateur avec API simulée.

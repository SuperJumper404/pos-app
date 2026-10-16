# Delivery V1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fournir le domaine livraison, les API de tarification et de dispatch et les mouvements financiers sans dependre d'un compte client.

**Architecture:** Creer les tables additives et un dossier stable, brancher le devis sur le checkout existant, puis construire les mutations operationnelles et financieres transactionnelles. Les references clientes restent nullables jusqu'au sous-plan 02.

**Tech Stack:** Express, mysql2, dbmate, crypto, Node assert, HTTP IGN via transport injectable.

**Spec:** [Specification](../specs/2026-10-16-delivery-management-design.md) ; [plan principal et contrats obligatoires](2026-10-16-delivery-management.md).

## Global Constraints

- Une remise d'especes ne constitue pas une nouvelle vente.
- Les livraisons restent desactivees par defaut pour tous les commerces.
- Le paiement ne termine pas la preparation.
- Un probleme ou une annulation logistique ne rembourse rien automatiquement.
- Les chemins `B/` et les types/signatures sont ceux du plan principal ; lire ce contrat avant toute tache.

## Review Focus

- R1 : adresse non ambigue et preuve serveur, tache 2.
- R2 : replay de checkout, collection et remise, taches 3, 6, 7.
- R3 : seuils et remises au centime, tache 2.
- R4 : role 6 refuse sur les anciennes routes generales, tache 5.
- R5 : cloture entre encaissement et remise, tache 7.

## Structure des fichiers

Les helpers purs sont `deliveryPricing.js`, `deliveryAddress.js`, `deliveryMoney.js`, `deliveryAuthorization.js`. Chaque `m_delivery*.js` possede son repository SQL injectable et son builder, conformement aux modules existants ; ne pas creer une couche ORM ou un repository global universel. Les controllers partagent uniquement les projections et contrats du plan principal. Les fichiers de migration portent les noms definis ci-dessous.

### Task 1: Persister reglages, dossiers et journal financier

**Files:** Create `B/db/migrations/20261016120000_delivery_foundation.sql`, `B/test/helpers/deliveryDatabase.js`, `B/test/delivery-schema.integration.test.js`; modify `B/package.json`.

**Interfaces:** Produit les tables livraison de la section 9, sauf tables `customer_*`/`customers` reservees a la tache 8 ; colonnes nullables `orders/archives.delivery_id`, `customer_account_id`, `fulfillment_type`, `users.courier_available`; helper SQL jetable defini dans le plan principal. Les identifiants references `shop.id`/`users.id` recopient exactement type et signedness existants. Chaque nouvelle table porte `shopid` et ses index de lecture/idempotence.

- [ ] **Step 1: Ecrire `legacyRowsStayLegacyAndLinksSurviveArchive` sur une base jetable**, en l'absence initiale de migration. Inserer les anciennes lignes dans `beforeDeliveryMigrations(db)` via `seedScenario({legacy:true})`, pas apres la migration que le test doit verifier. Assertions apres migration :
  ```js
  assert.equal(legacyOrder.delivery_id, null)
  assert.equal(legacyArchive.fulfillment_type, 'takeaway') // fixture is_takeaway = 1
  assert.equal(Boolean(settingsForShop7.enabled), false)
  await assert.rejects(insertDuplicateDeliveryForOrder31, { code: 'ER_DUP_ENTRY' })
  ```
  Verifier egalement FK cross-type, montants non negatifs et absence de cascade dossier lors d'une suppression active/archivee autorisee. La fixture ne supprime aucune base fournie par l'utilisateur.
- [ ] **Step 2: Executer** `node test/delivery-schema.integration.test.js` depuis `B` ; attendu rouge pour schema absent, pas pour une connexion mal configuree. Configurer d'abord une instance MySQL locale jetable via le compose local existant.
- [ ] **Step 3: Ajouter la migration reversible et le helper**. Creation atomique d'un seul defaut d'adresse reservee a la tache 8 ; ici garantir unicite des liens par representation, version optimiste, idempotency key/hash/result sur evenements et remises, allocation plafonnee par verrou transactionnel. Stocker les snapshots d'adresse/frais et la preuve du contexte prive de checkout. Ajouter `service_rate_limits` pour les quotas partages du geocodeur puis des codes, et `courier_cash_adjustments` pour les regularisations append-only (commerce, livreur, collection/remise source, impact signe, motif, acteur, date et idempotence). Creer un reglage desactive pour chaque commerce existant. Backfill `fulfillment_type` depuis `is_takeaway`, sans supposer un compte client historique ; pas de FK client avant tache 8.
- [ ] **Step 4: Executer le test vert**, puis migration up/down/up sur la base jetable. Creer `test:delivery:db` avec liste explicite et ajouter ce test ; aucune migration distante.
- [ ] **Step 5: Commit `feat: add delivery persistence`**, uniquement migration, helper, tests et script modifies dans `B`.

### Task 2: Valider les adresses et publier un devis fiable

**Files:** Create `B/src/helpers/deliveryPricing.js`, `B/src/helpers/deliveryAddress.js`, `B/src/helpers/deliveryMoney.js`, `B/src/services/deliveryGeocoding.js`, `B/src/modules/m_deliverySettings.js`, `B/src/modules/m_deliveryQuotes.js`, `B/src/controllers/c_delivery.js`, `B/src/routers/r_delivery.js`, `B/test/delivery-pricing.test.js`, `B/test/delivery-quotes.test.js`; modify `B/index.js`, `B/src/helpers/env.js`, `B/package.json`.

**Interfaces:** Consomme `DeliverySettings`, `quoteOrderItems` existant et schema tache 1 ; produit le builder de devis du plan principal, `distanceMeters(origin, destination)`, `priceDelivery({settings, distanceMeters, itemsNetCents}) -> {deliveryFeeCents, grandTotalCents}` et `validateAddressResolution(token, now) -> addressSnapshot`. Routes : `POST /delivery/address-resolutions`, `POST /delivery/quotes`, `GET/PUT /delivery/settings`. Le devis derive le commerce de la session staff/service-point ; le corps ne choisit pas un autre commerce.

- [ ] **Step 1: Ecrire les tests purs et HTTP** avec origin identique => 0 metre, 1 degre de longitude a l'equateur => environ 111195 metres (tolerance 2 metres), preuves expirees/falsifiees et config sans taux refusee. Fixture reglages validee : rayon 6000 m, paliers 3000/200 centimes et 6000/400 centimes, minimum 1500, gratuite a 2500 :
  ```js
  assert.deepEqual(priceDelivery({settings, distanceMeters: 3000, itemsNetCents: 2000}), {deliveryFeeCents: 200, grandTotalCents: 2200})
  assert.equal(priceDelivery({settings, distanceMeters: 3001, itemsNetCents: 2499}).deliveryFeeCents, 400)
  assert.equal(priceDelivery({settings, distanceMeters: 6000, itemsNetCents: 2500}).deliveryFeeCents, 0)
  assert.throws(() => priceDelivery({settings, distanceMeters: 6001, itemsNetCents: 2500}), {code: 'DELIVERY_OUT_OF_RANGE'})
  ```
  R1 : `12 rue de l'Eglise` avec accents et complement `interphone 42` ; le transport IGN capture uniquement la partie postale, le snapshot conserve le complement. R3 : base 2500 moins 1 centime => 2499 et frais 400. Rejeter NaN/Infinity/negatifs et les trous de paliers.
- [ ] **Step 2: Executer** `node test/delivery-pricing.test.js` puis `node test/delivery-quotes.test.js` ; attendu rouge sur exports/comportements manquants.
- [ ] **Step 3: Implementer les signatures**, les snapshots fiscaux au taux configure, les preuves signees 15 minutes et devis 5 minutes. Normaliser les erreurs `DELIVERY_DISABLED`, `DELIVERY_ADDRESS_INVALID`, `DELIVERY_OUT_OF_RANGE`, `DELIVERY_MINIMUM_NOT_MET`, `DELIVERY_QUOTE_CHANGED`. Aucun fallback geographique a 0. Cache d'adresse cote backend ; debounce de saisie sera frontend, limite globale fournisseur 40 requetes/seconde/IP au maximum, partagee entre instances, et delai HTTP 5 secondes. Ne pas cacher un refus fournisseur comme une adresse inexistante. Monter le router et configurer uniquement des noms d'environnement sans secrets.
- [ ] **Step 4: Relancer les deux tests verts** et le test SQL de tache 1. Ajouter les tests purs a `npm test` ; une configuration initiale vide laisse la livraison desactivee.
- [ ] **Step 5: Commit `feat: quote validated delivery addresses and fees`** dans `B`.

### Task 3: Creer une livraison dans le checkout existant

**Files:** Create `B/src/modules/m_deliveryOrders.js`, `B/src/helpers/deliveryTrackingToken.js`, `B/test/delivery-checkout.integration.test.js`; modify `B/src/modules/m_checkout.js`, `B/src/modules/m_orderQuote.js`, `B/src/modules/m_orderEditing.js`, `B/src/controllers/c_orderEditing.js`, `B/package.json`.

**Interfaces:** Consomme devis tache 2 et produit `createDeliveryForOrder`, `resolveDeliveryOrder`, `toDeliveryView` definis dans le plan principal. Etend l'entree checkout avec `fulfillment_type`, `delivery_quote_token`, `address_resolution_token`, `delivery_confirmation_secret`; le lien client reste derive exclusivement d'un contexte verifie et vaut null pour l'invite. `deliveryTrackingToken.js` exporte `createTrackingToken()` et `hashTrackingToken(raw)` ; 32 octets aleatoires, SHA-256, pas de jeton en clair en base. Le checkout renvoie le lien initial une fois et conserve l'empreinte du contexte prive du contrat commun pour la rotation autorisee ulterieure.

- [ ] **Step 1: Ajouter les scenarios SQL** : commande produits 2000 + frais 400 => `subtotal = 24.00`, 1 dossier et 1 mouvement de stock ; rejouer `client_order_token = 'delivery-attempt-1'` => memes identifiants, aucun nouvel evenement et lien precedent toujours valide. Changer l'adresse sous cette cle => conflit. Injecter une erreur apres insertion dossier => rollback commande/dossier/stock. Le test lit les vrais tables/compteurs, pas le nombre d'appels d'une fausse transaction.
  ```js
  assert.equal(Number(order.subtotal), 24)
  assert.equal(deliveryCountAfterReplay, 1)
  assert.equal(stockAfterReplay, stockAfterFirstCheckout)
  assert.equal(previousTrackingTokenStillValid, true)
  ```
- [ ] **Step 2: Executer** `node test/delivery-checkout.integration.test.js` ; attendu rouge sur dossier/frais absents, apres schema et devis verts.
- [ ] **Step 3: Brancher les services sur la connexion transactionnelle existante**, etendre l'empreinte canonique aux donnees livraison, conserver `order_source` et `customerID`. Stocker la revision effective, autoriser une revision explicite avant paiement/recuperation seulement, conserver l'ancienne dans les evenements et bloquer les changements payes par `DELIVERY_EDIT_NOT_ALLOWED`. Bloquer un checkout legacy split-write en livraison pour ne pas contourner le devis. Distinguer dossier provisoire non attribuable et commande acceptee lors d'un paiement en attente.
- [ ] **Step 4: Executer test vert**, `node test/checkout-contract.test.js` et `node test/order-editing.test.js` ; verifier que les valeurs sur place/emporter n'ont pas change. Ajouter le test a `test:delivery:db`.
- [ ] **Step 5: Commit `feat: attach durable delivery to checkout`** dans `B`.

### Task 4: Preserver livraison et totaux lors des paiements et archives

**Files:** Create `B/test/delivery-archive-payments.integration.test.js`; modify `B/src/modules/m_deliveryOrders.js`, `B/src/modules/m_orders.js`, `B/src/modules/m_payments.js`, `B/src/modules/m_orderTransitions.js`, `B/src/controllers/c_orders.js`, `B/src/controllers/c_stripe.js`, `B/src/helpers/cashRegisterPayment.js`, `B/src/services/stripeTerminalPayments.js`, `B/src/modules/m_stripeTerminal.js`, `B/package.json`.

**Interfaces:** Produit `archiveDeliveryOrder` et la projection financiere commune `financials` du plan principal. Le paiement demeure dans la commande active/archivee et les paiements existants ; aucun second etat paye mutable dans `deliveries`. La resolution d'une reference de paiement recherche la representation active ou archivee par lien stable, sous le commerce verifie.

- [ ] **Step 1: Ecrire `paidDoesNotFinishKitchenAndArchiveDoesNotFinishDelivery`**, puis cas paiement/refund sur archive. Avec preparation en cours et paiement paye, archiver => refus livraison specifique, commande toujours active. Apres fin de preparation, archiver => commande active absente, dossier encore attribue et montant du nul. Rejouer un webhook reussi apres archivage => aucun doublon ; remboursement complet de 2400 centimes => frais compris et etat rembourse visible dans le dossier.
  ```js
  assert.equal(viewAfterArchive.deliveryStatus, 'assigned')
  assert.equal(viewAfterArchive.remainingDueCents, 0)
  assert.equal(refundAmountCents, 2400)
  assert.equal(viewAfterRefund.paymentStatus, 'refunded')
  ```
- [ ] **Step 2: Executer** `node test/delivery-archive-payments.integration.test.js` ; attendu rouge sur disparition/total ou controle cuisine.
- [ ] **Step 3: Ajouter les branches livraison ciblees** aux transactions d'archivage/edition/paiement, sans changer les parcours historiques. Etendre les gardes de fin de preparation, copier les liens et snapshots avant suppression active, puis relire via `resolveDeliveryOrder`. Les encaissements Terminal en caisse doivent utiliser le total autoritatif incluant les frais ; une remise aux articles ne peut pas redistribuer silencieusement les frais dans les details produits. Adapter ces allocations et leurs validations, pas seulement le montant du PaymentIntent. Remboursement/logistique restent des actions distinctes.
- [ ] **Step 4: Executer test vert** puis `npm.cmd test` backend. Ajouter ce test au script SQL et verifier les tests checkout, Stripe, Terminal, annulation, refund et archive sur base jetable.
- [ ] **Step 5: Commit `fix: preserve delivery through settlement and archive`** dans `B`.

### Task 5: Restreindre les droits et gerer le dispatch

**Files:** Create `B/src/helpers/deliveryAuthorization.js`, `B/src/modules/m_deliveryDispatch.js`, `B/src/controllers/c_courier.js`, `B/src/routers/r_courier.js`, `B/test/delivery-authorization.test.js`, `B/test/delivery-dispatch.integration.test.js`; modify `B/src/helpers/staffPermissions.js`, `B/src/helpers/staffAccess.js`, `B/src/helpers/middleware/auth.js`, `B/src/controllers/c_users.js`, `B/src/controllers/c_delivery.js`, `B/src/routers/r_delivery.js`, `B/index.js`, `B/package.json`.

**Interfaces:** `COURIER=6`, permission `delivery`, compte role 6 avec seulement son espace autorise. Produit builder dispatch du plan principal et `assertStaffSurface({access, method, path})` : pour role 6, autorise seulement les routes courier, son `GET /user/me` et `POST /logout`, puis les controllers verifient l'appartenance. Le role ne se donne jamais lui-meme des permissions. `resolveIssue` prend `{action:'resume'|'retry'|'return'|'fail'|'cancel'|'confirm_unpaid_delivery', reason, ...Mutation}` ; transferts physiques apres recuperation exigent confirmation explicite.

- [ ] **Step 1: Tests de droits HTTP et transactions** : JWT role 6 ne peut lire `/orders`, `/users`, `/metrics`, `/detailorder/:id` ni modifier stock/produits, meme avec un tableau de permissions falsifie. Deux attributions concurrentes sur livraison 41 version 1 => une reussite et un conflit. Affecter au livreur 11 deux commandes pretes est permis ; recuperer la commande en preparation est refuse. Un probleme n'appelle ni remboursement ni retour stock. Apres fermeture, `toDeliveryView` pour le livreur supprime interphone/consignes privees mais garde reference et montants a remettre ; la lecture d'un ancien dossier ne rend pas ces donnees accessibles de nouveau.
  ```js
  assert.equal(responseForCourierGetOrders.status, 403)
  assert.equal(responseForOtherShopDelivery.status, 404)
  assert.equal(acceptedAssignments, 1)
  assert.equal(conflictingAssignments, 1)
  ```
- [ ] **Step 2: Executer** `node test/delivery-authorization.test.js` puis `node test/delivery-dispatch.integration.test.js` ; attendu rouge sur nouveau role/garde absents.
- [ ] **Step 3: Implementer les transitions spec section 5** sous version/idempotence et verrous deterministes compatibles avec l'archivage. Reload du compte actif cote backend pour chaque action livreur. Ajouter les routes de disponibilite, lecture de ses missions et mutations. La desactivation laisse l'historique et le solde accessibles aux operateurs autorises. Appliquer le refus role 6 dans l'authentification partagee pour couvrir aussi les anciennes routes, sans ouvrir un acces staff aux sessions clientes.
- [ ] **Step 4: Relancer les tests verts**, les tests staff-login/module-permissions/service-point existants et enregistrer les nouveaux tests dans leurs scripts respectifs.
- [ ] **Step 5: Commit `feat: authorize couriers and dispatch deliveries`** dans `B`.

### Task 6: Enregistrer le paiement manuel du livreur une seule fois

**Files:** Create `B/src/modules/m_deliveryCollections.js`, `B/test/delivery-collections.integration.test.js`; modify `B/src/controllers/c_courier.js`, `B/src/routers/r_courier.js`, `B/src/modules/m_deliveryOrders.js`, `B/package.json`.

**Interfaces:** Produit `buildDeliveryCollections().collect` du plan principal. `/courier/deliveries/:id/collect-payment` accepte uniquement methode, version et cle, jamais un montant autoritatif. `cash` alimente la dette ; `external_card` est une declaration manuelle distincte de Stripe. Les deux utilisent le reglement commercial existant et un evenement lie.

- [ ] **Step 1: Test SQL concurrent** pour commande due 2400 : deux requetes meme cle => un paiement et une collection de 2400 ; nouvelle cle sur commande deja payee => refus. Carte externe => dette especes 0. Stripe en cours => refus/reconciliation ; un webhook reussi concurrent ne peut permettre deux paiements. Reponse perdue puis replay => meme collection.
  ```js
  assert.equal(collectionCount, 1)
  assert.equal(cashDebtCents, 2400)
  assert.equal(externalCardCashDebtCents, 0)
  ```
- [ ] **Step 2: Executer** `node test/delivery-collections.integration.test.js` ; attendu rouge sur endpoint/collection manquants.
- [ ] **Step 3: Implementer `collect`** dans une transaction verrouillant dossier et representation commerciale ; exiger affectation courante, etat `in_transit`, preparation finie et paiement eligible. Conserver la cle et son hash/resultat ; une cle reusee pour une autre methode renvoie `DELIVERY_IDEMPOTENCY_CONFLICT`. Un rollback ne laisse ni dette ni commande payee partielle. Les corrections et restitutions physiques sont des evenements autorises distincts, pas une modification d'une collection existante.
- [ ] **Step 4: Test vert**, regression paiement/archive taches 3-4 et test de refus d'une collection role staff sans mission. Ajouter le test au script SQL.
- [ ] **Step 5: Commit `feat: collect delivery cash and external card payments`** dans `B`.

### Task 7: Rapprocher les especes et les periodes de caisse

**Files:** Create `B/src/modules/m_courierCash.js`, `B/test/courier-cash.integration.test.js`; modify `B/src/controllers/c_delivery.js`, `B/src/routers/r_delivery.js`, `B/src/helpers/cashClosure.js`, `B/src/modules/m_cashClosures.js`, `B/src/controllers/c_orders.js`, `B/package.json`.

**Interfaces:** Produit `balance`/`remit` du plan principal et un recap de cloture additionnel `courier_cash:{collected_cents, received_cents, outstanding_cents, discrepancy_cents}`. Le resume des ventes ne recompte pas les remises. `balance` retourne une version pour le formulaire caissier ; `receivedCents` est le montant physique compte, l'attendu est calcule par le serveur.

- [ ] **Step 1: Ecrire les tests SQL avec horloge injectee** : collection 3000, remise 2800 => attendu 3000, ecart -200, restant 200 ; remise suivante 200 => solde 0. Recu 3200 sur attendu 3000 => surplus 200 distinct, jamais vente supplementaire ni dette negative. Deux caissiers meme version => une validation. `adjust` par livreur/caissier => 403 ; regularisation admin justifiee de -200 sur un manque de 200 => solde 0 et nouvelle trace, vente initiale inchangee. Un remboursement effectue physiquement par la caisse n'efface pas les especes encore chez le livreur. R5 : archive a `2026-10-24T21:55:00Z`, cloture a `22:00:00Z`, remise a `2026-10-25T01:10:00Z` => vente seulement dans premiere periode, entree physique seulement dans seconde.
  ```js
  assert.equal(first.remainingDueCents, 200)
  assert.equal(first.discrepancyCents, -200)
  assert.equal(second.remainingDueCents, 0)
  assert.equal(secondPeriodNewSalesFromRemittanceCents, 0)
  ```
- [ ] **Step 2: Executer** `node test/courier-cash.integration.test.js` ; attendu rouge pour rapprochement absent.
- [ ] **Step 3: Implementer allocations, regularisations auditees et snapshots de cloture**, en UTC et avec les bornes de periode existantes. Une correction exige permission admin et motif ; une restitution client n'abaisse la dette que si l'acteur ayant physiquement rembourse est bien le livreur. Aucun effacement d'ecart ou reecriture d'ancienne cloture. Router lecture soldes, POST remises et corrections avec droits admin/caissier respectifs.
- [ ] **Step 4: Executer test vert**, `node test/cash-closure.test.js`, puis `npm.cmd test` et `npm.cmd run test:delivery:db` backend ; attendu zero echec. Relever le SHA backend pour le sous-plan 02.
- [ ] **Step 5: Commit `feat: reconcile courier cash with cashier handovers`** dans `B` ; pas de deploiement.

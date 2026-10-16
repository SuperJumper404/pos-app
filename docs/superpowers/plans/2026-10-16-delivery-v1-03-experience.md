# Delivery V1 Experience and Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la livraison utilisable de bout en bout depuis la caisse, le site, l'espace livreur et le suivi prive, avec documents et recette coherents.

**Architecture:** Composer les services des deux premiers sous-plans dans les ecrans existants. Le navigateur affiche les valeurs serveur ; il ne cree pas un deuxieme modele de paiement. La recette commune verifie les deux depots et les deux canaux d'authentification.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, generateurs de tickets existants, Express, tests Node assert et verification navigateur desktop/mobile.

**Spec:** [Specification](../specs/2026-10-16-delivery-management-design.md) ; [contrats communs](2026-10-16-delivery-management.md). Prerequis : sous-plans 01 et 02 verts avec leurs SHA compatibles releves.

## Global Constraints

- Une commande invite reste possible.
- Le TPE de livraison reste independant.
- La suspension des nouvelles livraisons ne bloque aucune mission deja acceptee.
- Aucun montant fourni par le navigateur n'est autoritatif.
- Aucun envoi automatique de notification n'est ajoute.
- Les categories, etapes produits et stock ne sont pas reintroduits dans la navigation principale.

## Review Focus

- R1 : adresse longue et revision du carnet ne remplacent pas un snapshot de commande, taches 12 et 14.
- R2 : double clic/rechargement/reponse perdue conservent tentative et actions autoritatives, taches 12, 14 et 16.
- R3 : frais revenant apres remise d'un centime imposent reconfirmation avant paiement, tache 12.
- R4 : lien direct et URL manipulee ne donnent ni carnet etranger ni vue caisse au livreur, taches 13 et 14.
- R5 : affichage de ventes/TVA/especes autour de la cloture correspond aux snapshots backend, taches 15 et 17.

## Structure des fichiers

Les composants sous `components/delivery/` sont limites a devis, adresse, suivi, dispatch et remise. Les pages `livraison/index.vue` et `livreur/index.vue` composent ces composants ; les services et autorisations restent backend. `store/delivery.js` gere l'etat operateur/devis et `store/courier.js` l'etat de l'espace livreur, sans copier les paiements existants dans un troisieme store financier.

### Task 12: Relier la livraison au checkout caisse et site

**Files:** Create `F/components/delivery/DeliveryCheckout.vue`, `F/components/delivery/DeliveryAddressInput.vue`, `F/store/delivery.js`, `F/test/delivery-checkout.test.js`, `B/test/delivery-customer-checkout.integration.test.js`; modify `F/pages/cart.vue`, `F/pages/caisse/menu.vue`, `F/pages/click-and-collect/_shopId/_shopName.vue`, `F/store/cart.js`, `F/helpers/counterCheckout.js`, `F/helpers/stripeCheckout.js`, `F/package.json`, `B/src/routers/r_orders.js`, `B/src/routers/r_stripe.js`, `B/src/modules/m_checkout.js`, `B/src/controllers/c_stripe.js`, `B/package.json`.

**Interfaces:** `DeliveryCheckout` recoit `{shopId, cart, discount, value}` et emet `input` et `quote` avec `DeliveryQuote`, jamais `paid`. `DeliveryAddressInput` emet l'adresse resolue et ses consignes ; recherche debounce 300 ms, ignore les reponses obsoletes. Store livraison : `loadSettings`, `resolveAddress`, `quote`, `resetForShop`. Etendre `buildCheckoutPayload` et l'identite de tentative avec les tokens de devis/adresse, le mode et `delivery_confirmation_secret` genere avant l'envoi selon `PrivateCheckoutContext`. Le middleware client optionnel/CSRF de tache 10 attache un compte verifie sans remplacer la session publique du point de service.

- [ ] **Step 1: Ecrire tests Vue/store et SQL** : meme panier caisse/site => meme total ; invite sans e-mail accepte, compte e-mail ou WhatsApp rattache uniquement au bon commerce ; payload `customer_account_id` falsifie ignore/refuse. Garder l'essai lie a la meme adresse et aux frais jusqu'a sa resolution. R3 : devis gratuit base 2500, remise d'un centime => nouveau total 2899 avec frais 400 ; l'ancien bouton payer reste bloque jusqu'a confirmation. Une requete lente pour Adresse 1 ne remplace pas Adresse 2 selectionnee ensuite.
  ```js
  assert.equal(repriced.financials.grand_total, 28.99)
  assert.equal(paymentStartsBeforeReconfirmation, 0)
  assert.equal(createdGuest.customer_account_id, null)
  assert.equal(checkoutRetriesAfterLostResponse, 1) // meme tentative, pas nouvelle creation
  ```
- [ ] **Step 2: Executer** `node test/delivery-checkout.test.js` depuis `F`, puis `node test/delivery-customer-checkout.integration.test.js` depuis `B` ; attendu rouge sur parcours manquant.
- [ ] **Step 3: Integrer sans refondre `cart.vue`** : extraire seulement la section livraison dans les composants nouveaux. Afficher Sur place/Emporter/Livraison selon le contexte et les modes reellement autorises ; le site ne propose pas sur place. Conserver le parcours Stripe existant avec montant incluant frais, la commande invite et les controles d'essais non resolus. Ajouter `withCredentials` et CSRF seulement aux requetes qui portent l'identite cliente ; une erreur de ce compte ne deconnecte pas la caisse. Suspension ou changement de devis ne basculent jamais silencieusement en emporter. Produits, adresse et prix payes deviennent non editables en livraison selon la spec.
- [ ] **Step 4: Tests verts**, regressions counter-checkout, stripe-checkout, order-edit et auth QR. Ajouter les tests aux scripts adequats. Verifier manuellement un panier invite et connecte sur mobile avec une adresse hors rayon et un minimum non atteint, panier conserve.
- [ ] **Step 5: Commits `feat: support delivery checkout on POS and storefront`** dans les deux depots pour leurs seuls changements.

### Task 13: Ajouter l'onglet operateur Livraison et ses reglages

**Files:** Create `F/pages/livraison/index.vue`, `F/components/delivery/DeliveryDispatch.vue`, `F/components/delivery/DeliveryCouriers.vue`, `F/components/delivery/DeliveryCashRemittances.vue`, `F/components/delivery/DeliverySettings.vue`, `F/middleware/delivery.js`, `F/test/delivery-operator.test.js`; modify `F/helpers/staffRoles.js`, `F/layouts/default.vue`, `F/pages/staff/index.vue`, `F/store/staff.js`, `F/store/delivery.js`, `F/package.json`.

**Interfaces:** Quatre vues Commandes/Livreurs/Remises d'especes/Reglages ; `delivery` est la permission de module, `COURIER=6` le role. Les composants emettent les commandes du backend avec version/idempotence ; ils ne calculent pas un montant attendu a partir d'une liste locale partielle. Les pages utilisent les APIs des taches 2, 5 et 7.

- [ ] **Step 1: Ecrire tests de roles, store et composants** : admin voit les quatre vues, caissier autorise ne peut editer reglages/comptes, livreur ne voit pas la console. Affectation concurrente => erreur/relecture sans faux changement local ; toggle suspension n'annule aucune mission existante. Paliers invalides et TVA non renseignee empechent l'activation. Une remise avec expectedBalanceVersion obsolete affiche l'attendu actuel avant une nouvelle confirmation.
  ```js
  assert.equal(courierCanOpenOperatorPage, false)
  assert.equal(cashierCanSaveSettings, false)
  assert.equal(cancelCallsWhenSuspendingDelivery, 0)
  ```
- [ ] **Step 2: Executer** `node test/delivery-operator.test.js` ; attendu rouge sur navigation/vue absentes.
- [ ] **Step 3: Implementer Vuetify sobre et dense** : une navigation principale Livraison, filtres et tableaux lisibles, pas de nouvelle page marketing. Les actions de role courier sont verrouillees sur leurs droits propres meme si l'UI generale de permissions staff est modifiee. Gestion du compte via les actions staff existantes ; disponibilite par toggle distinct de desactivation du compte. Reglages : position validee, rayon, paliers TTC, minimum 0 autorise, gratuite facultative, taux des frais explicite. La confirmation des especes affiche attendu, recu, ecart et nouveau solde serveur.
- [ ] **Step 4: Tests verts**, `node test/staff-roles.test.js`, `node test/admin-navigation.test.js`, lint cible. Inspection batchee desktop/mobile des quatre vues et des conflits. Les pages Categories/Etapes/Stock restent hors menu principal.
- [ ] **Step 5: Commit `feat: add delivery operations workspace`** dans `F`.

### Task 14: Donner au livreur un espace mobile limite

**Files:** Create `F/pages/livreur/index.vue`, `F/layouts/courier.vue`, `F/components/delivery/CourierMission.vue`, `F/components/delivery/CourierPayment.vue`, `F/store/courier.js`, `F/middleware/courier.js`, `F/test/courier-mobile.test.js`; modify `F/middleware/auth.js`, `F/helpers/staffRoles.js`, `F/layouts/default.vue`, `F/package.json`.

**Interfaces:** Actions store `loadMissions`, `pickup`, `collectPayment`, `deliver`, `reportIssue`, `loadCashBalance`; signatures du backend, pas de montant libre en paiement. Reprise par la meme idempotencyKey tant que resultat incertain. L'ordre manuel de passage reste une preference locale des missions attribuees, pas une tournee optimisee ni une nouvelle transaction commerciale.

- [ ] **Step 1: Ecrire tests comportementaux** : role 6 redirige sur `/livreur`, pas sur caisse ; deux missions peuvent etre recuperees et terminees separement. Une commande deja payee n'offre pas encaisser ; carte externe est libellee comme declaration manuelle. Etat `issue` bloque la conclusion normale, livreur ne peut annuler/rembourser. R2 : coupure apres encaissement garde la cle et relit le resultat avant toute nouvelle collecte. R1 : une mission terminee garde le recap/solde mais ne renvoie plus interphone/consignes privees. Les URLs d'appel/itineraire sont construites avec des schemes fixes et valeurs encodees.
  ```js
  assert.equal(paymentRequestsForDoubleTap, 1)
  assert.equal(cashDebtAfterExternalCardCents, 0)
  assert.equal(closedMission.addressSnapshot.instructions, undefined)
  ```
- [ ] **Step 2: Executer** `node test/courier-mobile.test.js` ; attendu rouge sur page/store inexistants.
- [ ] **Step 3: Implementer cartes de mission tactiles et commandes explicites** : recuperer, appeler, itineraire, paiement, livree, probleme. Reponse serveur remplace l'etat local ; boutons bloques pendant mutation et aucune validation hors ligne. Recuperation exige preparation prete. Ne pas stocker les donnees d'acces client dans la persistance generale longue duree. Montrer la disponibilite manuelle du livreur, son solde et ses remises, sans droit de les confirmer lui-meme.
- [ ] **Step 4: Tests verts**, auth/session/staff existants et tests HTTP de role 6 de la tache 5. Inspection sur telephone de portrait et paysage avec nom/adresse longs, erreur reseau et deux missions de paiements differents.
- [ ] **Step 5: Commit `feat: add courier mobile delivery workflow`** dans `F`.

### Task 15: Integrer les frais aux tickets, historiques et rapports

**Files:** Create `F/test/delivery-receipts.test.js`, `B/test/delivery-reports.integration.test.js`; modify `F/helpers/cashierReceipt.js`, `F/helpers/orderTicket.js`, `F/helpers/vat.js`, `F/helpers/receiptBundle.js`, `F/components/orders/VatBreakdown.vue`, `F/components/orders/TakeawayChip.vue`, `F/pages/orders/index.vue`, `F/pages/history/index.vue`, `F/pages/history/ticket/_id.vue`, `F/pages/orders/detail/_id.vue`, `F/pages/reports.vue`, `F/store/cashClosures.js`, `B/src/modules/m_orders.js`, `B/src/controllers/c_orders.js`, `B/src/helpers/orderMetrics.js`, `F/package.json` et `B/package.json`.

**Interfaces:** Consomme uniquement `financials`/`delivery_charge` des taches 2-4 et le recap de caisse tache 7. Etendre `buildCashierReceiptPayload` existant avec `deliveryCharge` ; garder `totalAmount` et `vatBreakdown` existants avec les valeurs serveur completes. Les renderers caisse et cuisine savent afficher le mode `Livraison` sans le confondre avec le canal `click_collect`. La charge n'incremente pas `itemCount` ni le stock. Les rapports separent vente et remise physique ; les vieilles archives sans delivery_id passent par leur chemin actuel.

- [ ] **Step 1: Tester des snapshots litteraux**, produits 2000 centimes a 10 %, frais 400 a 20 % configure => total TTC 2400, TVA produits 182, TVA frais 67, HT total 2151. Livraison gratuite => ligne 0, aucune TVA de frais ; modifier le tarif restaurant apres archivage ne modifie pas la reimpression. R5 : remise 2400 apres cloture ne cree ni vente ni TVA supplementaire. Ticket client et ticket cuisine n'exposent que les donnees utiles, pas le jeton prive ou l'interphone dans les logs.
  ```js
  assert.equal(receipt.totalAmount, 24)
  assert.deepEqual(receipt.vatBreakdown, [
    {vatRate:10, totalHt:18.18, totalVat:1.82, totalTtc:20},
    {vatRate:20, totalHt:3.33, totalVat:0.67, totalTtc:4},
  ])
  assert.match(buildCashierCloudXml(receipt), /livraison/i)
  assert.equal(reprintAfterSettingsChange.totalAmount, 24)
  ```
- [ ] **Step 2: Executer** `node test/delivery-receipts.test.js` depuis `F` et `node test/delivery-reports.integration.test.js` depuis `B` ; attendu rouge sur ligne/ventilation absentes.
- [ ] **Step 3: Ajouter les adaptations bornees** aux generateurs SmartPrint/cloud/PDF deja disponibles et aux projections historiques/statistiques. Les regroupements de ventes et la ventilation TVA lisent le snapshot des frais par delivery_id ; pas de produit technique ni de doublon dans les top produits. Un remboursement complet conserve le document initial et expose son etat financier sans le reecrire.
- [ ] **Step 4: Tests verts**, tests receipt-printing, receipt-bundle, history-ticket, vat-breakdown, cash-closure et order-metrics existants. Rendre un PDF et verifier un ticket physique en recette, avec memes totaux que le paiement ; ne pas envoyer une impression reelle sans destination de test identifiee.
- [ ] **Step 5: Commits `feat: include delivery charges in receipts and reports`** dans chaque depot touche.

### Task 16: Exposer un suivi prive utilisable sans compte

**Files:** Create `B/src/modules/m_deliveryTracking.js`, `B/test/delivery-tracking.integration.test.js`, `F/pages/livraison/suivi.vue`, `F/helpers/deliveryTracking.js`, `F/test/delivery-tracking.test.js`; modify `B/src/controllers/c_delivery.js`, `B/src/routers/r_delivery.js`, `F/store/cart.js`, `F/pages/cart.vue`, `F/pages/orders/detail/_id.vue`, `F/package.json` et `B/package.json`.

**Interfaces:** `buildDeliveryTracking({repository, clock, tokenCodec}).read({token}) -> PublicDeliveryView`, `rotate({actor|privateCheckoutContext, deliveryId, idempotencyKey}) -> {trackingUrl}`. Projection : reference, etape publique, identite/contact du restaurant, adresse de remise utile au client et etat/montant du paiement ; aucun courierId, consigne d'interphone, autre commande ou journal interne. Route `POST /delivery/tracking/read`, rotation privee `POST /deliveries/:id/tracking-token`. Frontend parse le fragment, ne le copie ni dans les query strings ni dans une requete d'analytics.

- [ ] **Step 1: Tests serveur et frontend** : jeton inconnu/expire => refus non enumerant ; avant/apres archivage => meme etape ; une reattribution n'expose pas l'autre client. R2 : replay de checkout ne revoque pas le lien existant ; rotation explicite privee le revoque et laisse les paiements intacts. Horloges : read a fermeture +7 jours refuse ; creation +30 jours ferme meme une mission non terminee. Poll toutes les 15 secondes uniquement page visible, arret sur jeton expire/destruction et backoff 15/30/60 secondes apres erreurs reseau.
  ```js
  assert.equal(publicView.courierId, undefined)
  assert.equal(publicView.addressSnapshot.instructions, undefined)
  assert.equal(readByOrderNumberWithoutToken.status, 404)
  assert.equal(paymentsAfterTokenRotation, paymentsBeforeTokenRotation)
  ```
- [ ] **Step 2: Executer** `node test/delivery-tracking.integration.test.js` depuis `B` et `node test/delivery-tracking.test.js` depuis `F` ; attendu rouge sur endpoint/page absents.
- [ ] **Step 3: Implementer la page publique et la projection explicite**, `Cache-Control: no-store` et `Referrer-Policy: no-referrer`, limitations de lecture par IP. Autoriser cette route exacte dans les guards/layouts sans ouvrir l'onglet operateur. Le client invite peut copier le lien depuis la confirmation ; en caisse, un operateur autorise peut en demander un. Aucune notification e-mail/WhatsApp de livraison n'est ajoutee. Pour la rotation invite, verifier le contexte prive de confirmation stocke en tache 3 ; numero/telephone seuls ne suffisent jamais.
- [ ] **Step 4: Tests verts**, regression des routes publiques QR/site et navigation ; test sur navigateur prive sans session staff/client, puis affichage apres archivage et expiration simulee. Verifier dans les requetes/logs que le fragment et les consignes ne sont pas transmis en URL.
- [ ] **Step 5: Commits `feat: add private delivery tracking for guests`** dans les deux depots.

### Task 17: Recetter la V1 complete et preparer la mise en service

**Files:** Create `B/test/delivery-journey.integration.test.js`, `F/docs/delivery-v1-acceptance.md`, `B/.env.delivery.example` sans secrets ; modify `B/package.json` et `F/package.json` pour les scripts de test concernes. Aucun `B/.env.example` n'existait lors de la preparation du plan. Ne modifier ni `B/.env.production` ni `F/.env.production` reels, ni workflow de deploiement, a cette tache sans necessite verifiee et autorisation correspondante.

**Interfaces:** Consomme tous les services et ecrans precedents. Produit une fiche de recette avec paire de SHA, commandes executees, preuves desktop/mobile, resultats des deux canaux de code et procedure de suspension sans perte de missions.

- [ ] **Step 1: Ajouter trois parcours SQL/HTTP complets** en reutilisant les vrais routers et middlewares sur Express et la base jetable : (a) invite site paye en ligne puis archive avant livraison ; (b) client WhatsApp avec adresse enregistree, caisse payee au livreur en especes puis remise 200 centimes trop faible ; (c) deux commandes sur un depart, l'une carte externe, l'autre probleme puis retour decide par restaurant. Les transports/paiements externes sont doubles au niveau HTTP uniquement ; leur reconciliation metier est reelle. R5 : rejouer le parcours autour d'une cloture et du changement d'heure ne double aucune vente. Ajouter checks compte desactive en mission et origine cliente non autorisee.
  ```js
  assert.equal(completedScenarioA.deliveryStatus, 'delivered')
  assert.equal(completedScenarioB.cashRemainingDueCents, 200)
  assert.equal(completedScenarioC.automaticRefundCount, 0)
  assert.equal(totalSalesAfterReplayingAllScenarios, initialTotalSales)
  ```
- [ ] **Step 2: Executer** `node test/delivery-journey.integration.test.js` ; tout echec doit designer un contrat manque, pas etre masque par un skip ou un fournisseur non configure.
- [ ] **Step 3: Corriger uniquement les ecarts de contrat** et completer la fiche de recette : migrations additives, canaux centraux/preuves d'expediteur et modele, variables serveur documentees sans valeurs, restaurant desactive par defaut, activation exigeant position/tarifs/fiscalite, suspension et procedure de traitement des missions deja engagees. Les exemples d'environnement ne contiennent ni vrais tokens ni identifiants personnels. Un retour arriere ne supprime pas de table et ne remet pas en service un calcul de paiement ignorant les frais existants.
- [ ] **Step 4: Executer les controles finaux** : `npm.cmd test` dans chacun des depots, `npm.cmd run test:delivery:db` dans `B`, `npm.cmd run lint` et `npm.cmd run build-local` dans `F`. Ne pas lancer un serveur sur un port deja utilise ; utiliser un port libre pour Nuxt. En recette autorisee avec configuration centrale reelle, recevoir/verifier un code e-mail et un code WhatsApp sur des destinations de test consenties, puis les parcours decrits dans les taches 11 a 16 sur desktop et mobile. Une configuration absente est rapportee comme validation incomplete, pas comme integration reussie. Le deploiement en staging/production est une demande distincte ; aucun workflow distant n'est declenche ici.
- [ ] **Step 5: Commits `test: verify delivery v1 end to end`** limites aux tests, corrections liees et fiche de recette, puis revue globale des deux branches et rapport des SHA compatibles, tests passes et prerequis encore externes.

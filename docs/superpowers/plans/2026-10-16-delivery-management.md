# Delivery Management V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le parcours valide caisse/site, comptes clients e-mail/WhatsApp, livreurs internes, suivi prive et rapprochement des especes.

**Architecture:** Etendre le checkout et les paiements existants, avec un dossier de livraison qui survit a l'archivage. Isoler comptes clients, transports d'authentification et operations livreurs. Les trois sous-plans ci-dessous produisent chacun un ensemble testable ; seule leur recette commune constitue la V1 complete.

**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Vuex, Axios, Node.js, Express, mysql2, dbmate, crypto natif, Mailjet existant, WhatsApp Cloud API, Geoplateforme IGN, Node assert.

**Spec:** [Specification validee](../specs/2026-10-16-delivery-management-design.md).

## Global Constraints

- Le document de reference est valide ; les fichiers ci-dessous sont des plans a relire avant execution.
- La preparation reutilise les transitions actuelles ; le paiement reutilise notamment les etats impaye, en attente, paye et rembourse.
- Les codes de connexion e-mail/WhatsApp servent a acceder au compte client. Ils ne constituent ni un code de remise du colis ni une notification de progression de commande.
- SMS, y compris pour la connexion ; aucun fournisseur SMS a integrer : hors perimetre.
- Une remise d'especes ne constitue pas une nouvelle vente.
- Aucun montant d'exemple discute pendant le cadrage ne devient une valeur de production.
- Les livraisons restent desactivees par defaut pour tous les commerces.
- Aucun secret fournisseur dans Nuxt, les commits, les logs ou les exemples de configuration.
- Garder Nuxt 2/Vue 2/Vuetify, les prefixes API et les conventions routers/controllers/modules. Pas de refactor global.
- Ne pas faire reapparaitre Categories, Etapes produits ou Stock dans la navigation principale.
- Aucun envoi fournisseur, migration distante, push ou deploiement n'est realise pendant la preparation de ces plans.

## Review Focus

| Ref. | Entree ou situation a proteger | Test proprietaire |
| --- | --- | --- |
| R1 | Adresse accentuee, appartement et changement de carnet : conserver une adresse de commande stable, sans envoyer l'interphone au geocodeur. | Tache 2 et tache 11. |
| R2 | Reponse perdue apres creation, encaissement ou remise : aucun deuxieme debit, dossier ou mouvement ; le lien de suivi deja communique reste valide. | Taches 3, 6, 7 et 16. |
| R3 | Une remise de 1 centime fait repasser le panier sous le seuil gratuit : recalculer les frais et reconfirmer le total. | Taches 2 et 12. |
| R4 | Meme navigateur pour staff/client, et passage d'un restaurant a un autre : ni deconnexion staff, ni carnet du mauvais commerce, ni acces livreur aux anciennes API generales. | Taches 5, 10 et 11. |
| R5 | Encaissement avant cloture, remise apres cloture et changement d'heure : conserver une vente unique et rattacher l'entree physique a la bonne periode. | Taches 7 et 17. |

## Organisation et points de depart

- `F` designe la racine `pos-app` ; `B` designe la racine du depot voisin `express-pos`. Les chemins des sous-plans portent explicitement ce prefixe.
- Points de depart observes : frontend `15cfc50` sur `master`, backend `9bd0a1e` sur `staging`. Les reverifier avant execution ; ne pas ecraser un travail apparu depuis.
- A l'execution, preparer une branche de travail par depot et des checkouts voisins afin de conserver `../express-pos`. Appliquer le skill worktrees a cette etape, pas pour la simple redaction.
- Les fichiers de specification et de plans vivent uniquement dans `F/docs/superpowers/`. Un intervenant backend doit lire ces documents depuis le checkout frontend voisin.
- Les commandes `npm.cmd` sont celles de PowerShell Windows ; `npm` est leur equivalent dans les conteneurs Linux. Une commande backend s'execute depuis `B`, une commande frontend depuis `F`.

## Sous-plans et dependances

| Plan | Taches | Livrable verifiable |
| --- | --- | --- |
| [01 - Backend livraison](2026-10-16-delivery-v1-01-backend.md) | 1 a 7 | Tarifs et API utilisables sans compte client ; commandes invites, archivage durable, dispatch et mouvements financiers coherents. |
| [02 - Comptes clients](2026-10-16-delivery-v1-02-customers.md) | 8 a 11 | Connexion par code sur les deux canaux, sessions isolees et carnet client utilisable. |
| [03 - Interfaces et recette](2026-10-16-delivery-v1-03-experience.md) | 12 a 17 | Parcours caisse/site, espaces restaurant/livreur, suivi client, documents et recette V1. |

Ordre recommande : 1 a 7, puis 8 a 11, puis 12 a 17. Les travaux d'interface ne redefinissent pas les montants ou les autorisations. Pas d'edition concurrente des memes fichiers de checkout, d'authentification ou de rapports.

## Carte des responsabilites

| Unite | Fichiers principaux | Responsabilite |
| --- | --- | --- |
| Distance/tarifs/adresse | `B/src/helpers/deliveryPricing.js`, `deliveryAddress.js`, `B/src/services/deliveryGeocoding.js`, `B/src/modules/m_deliverySettings.js`, `m_deliveryQuotes.js` | Geocodage, preuve d'adresse resolue, regles pures et devis autoritatif. |
| Commande et archive | `B/src/modules/m_checkout.js`, `m_orderQuote.js`, `m_orders.js`, `m_payments.js`, `m_orderEditing.js`, `m_deliveryOrders.js`, `B/src/helpers/deliveryMoney.js` | Creer le dossier en transaction, conserver les liens et garantir les totaux/paiements. |
| Operations | `B/src/modules/m_deliveryDispatch.js`, `m_deliveryCollections.js`, `m_courierCash.js`, `B/src/helpers/deliveryAuthorization.js` | Affectation, etats, declarations manuelles, remises et refus d'acces. |
| Clients | `B/src/modules/m_customers.js`, `m_customerAuth.js`, `B/src/helpers/customerIdentity.js`, `customerSession.js`, `B/src/helpers/middleware/customerAuth.js` | Identite verifiee, carnet, codes/quota et session client. |
| Fournisseurs | `B/src/services/customerCodeTransports.js`, `B/src/helpers/env.js` | Mailjet et WhatsApp centraux ; aucun envoi de notification de livraison. |
| API nouvelles | `B/src/routers/r_delivery.js`, `r_customers.js`, `r_courier.js`, `B/src/controllers/c_delivery.js`, `c_customers.js`, `c_courier.js` | Adaptation HTTP, validation d'entree et projections selon l'acteur. |
| Interfaces | `F/components/delivery/`, `F/components/customer/`, `F/pages/livraison/`, `F/pages/livreur/`, `F/pages/compte/` | Vues Vuetify et composants bornes, sans seconde caisse. |
| Etat navigateur | `F/store/delivery.js`, `courier.js`, `customer.js`, `F/plugins/customerApi.client.js` | Etat par commerce, appels independants, erreurs et reprise. |
| Documents/recette | `F/helpers/cashierReceipt.js`, `orderTicket.js`, `vat.js`, `F/test/`, `B/test/` | Ligne frais, ventilation, preuves de non-regression et coherence physique. |

## Contrats communs a tous les sous-plans

### Identifiants et monnaie

Les nouvelles cles SQL sont des `BIGINT UNSIGNED` transmis en chaines aux services/API ; aucun cast en Number d'un nouvel identifiant. Les identifiants historiques gardent leur type. Les nouveaux montants internes sont des entiers surs en centimes. `deliveryMoney.js` exporte `toCents(euros)`, `fromCents(cents)` et `buildDeliveryFinancials({itemsTotalCents, itemsDiscountCents, deliveryFeeCents, vatRate})` ; rejeter NaN, Infinity, negatif ou depassement d'entier sur.

```text
DeliverySettings = {
  shopId, revision, enabled, origin: {latitude, longitude}|null,
  maxDistanceMeters, minimumItemsCents,
  freeDeliveryEnabled, freeDeliveryThresholdCents|null,
  fiscalPolicy: {mode: 'configured_rate', vatRate: 5.5|10|20|null},
  bands: [{upToMeters, feeCents}]
}
DeliveryQuote = {
  shopId, settingsRevision, addressSnapshot,
  distanceMeters, itemsTotalCents, itemsDiscountCents, itemsNetCents,
  deliveryFeeCents, grandTotalCents, chargeSnapshot, quoteToken, expiresAt
}
DeliveryView = {
  id, version, shopId, orderReference, preparationStatus, paymentStatus,
  deliveryStatus, courierId|null, remainingDueCents,
  addressSnapshot, financials, allowedActions
}
Actor = {subject: 'staff'|'service_point'|'customer', id|null, shopId, access|null}
Mutation = {expectedVersion, idempotencyKey}
```

Le taux des frais est explicitement configure par le restaurant avant activation ; aucun taux n'est deduit de cette liste. Une politique plus complexe que le taux configure devra faire l'objet d'une evolution specifique, pas d'un calcul fiscal invente par l'implementer.

`buildDeliveryFinancials` renvoie les champs internes en centimes et `chargeSnapshot` avec TTC/HT/TVA. La projection HTTP `financials` expose les champs historiques en euros `items_total`, `items_discount`, `delivery_fee`, `grand_total`, ainsi que `delivery_charge` avec son snapshot fiscal. Pour une livraison, `subtotal = grand_total`. Les anciens consommateurs non-livraison continuent de recevoir leurs valeurs usuelles.

### Services stables

- `buildDeliveryQuotes({repository, quoteOrderItems, geocoder, clock, tokenCodec}).createQuote({shopId, items, discount, addressResolutionToken}) -> Promise<DeliveryQuote>` ; les articles et remises sont recharges et autorises cote serveur.
- `m_deliveryOrders.js` exporte `createDeliveryForOrder({checkout, quote, connection})`, `resolveDeliveryOrder({shopId, deliveryId, connection, forUpdate})`, `archiveDeliveryOrder({shopId, deliveryId, archiveId, preparationStatus, connection})` et `toDeliveryView({delivery, order, actor})`. Les fonctions de mutation n'ouvrent pas de transaction imbriquee.
- `buildDeliveryDispatch({repository, runInTransaction, clock})` produit `assign`, `pickup`, `reportIssue`, `resolveIssue`, `deliver` ; chaque methode prend `{actor, deliveryId, ...Mutation, ...payload}` et renvoie `DeliveryView`.
- `buildDeliveryCollections({repository, runInTransaction, clock})` produit `collect({actor, deliveryId, method: 'cash'|'external_card', ...Mutation}) -> {collectionId, delivery, idempotentReplay}`.
- `buildCourierCash({repository, runInTransaction, clock})` produit `balance({actor, courierId})`, `remit({actor, courierId, receivedCents, expectedBalanceVersion, idempotencyKey}) -> {remittanceId, expectedCents, receivedCents, discrepancyCents, remainingDueCents}` et `adjust({actor, courierId, collectionId|null, remittanceId|null, deltaDueCents, reason, idempotencyKey}) -> {adjustmentId, balance}`. `adjust` est reserve a l'admin, exige une source et un motif, et ne modifie pas la vente ; une restitution client doit etre reliee a son remboursement financier confirme et au detenteur physique des fonds.
- `buildCustomerAuth({repository, transports, clock, randomCode, secret})` produit `requestChallenge({shopId, channel: 'email'|'whatsapp', destination, ip, browserBinding, purpose: 'login'|'link', customerId|null})`, `verifyChallenge({shopId, challengeId, code, browserBinding}) -> {shopId, customerId, verifiedChallengeId}` et `linkIdentity({customerSession, challengeId, code})`. `purpose='link'` et `customerId` sont derives par le controller d'une session cliente valide, jamais acceptes sur la seule declaration publique ; les codes login/link ne sont pas interchangeables.
- `buildCustomerSession({repository, clock, secret, allowedOrigins})` produit `create({shopId, customerId, verifiedChallengeId}) -> {rawToken, session, csrfToken}`, `read({rawToken, shopId}) -> session|null`, `revoke({rawToken, shopId})`, `csrfToken(session) -> string`, `verifyCsrf({session, token, origin}) -> boolean`. Une session est toujours liee a `shopId` et `customerId` ; une contrainte unique sur `verifiedChallengeId` interdit une seconde session pour un meme challenge consomme.
- Les reponses d'erreur utilisent `DomainError` et les conventions `helpers/response.js`. Les codes de conflit nouveaux sont explicites : `DELIVERY_QUOTE_CHANGED`, `DELIVERY_VERSION_CONFLICT`, `DELIVERY_IDEMPOTENCY_CONFLICT`, `CUSTOMER_IDENTITY_CONFLICT`.

### Horloges, secrets et reprise

- Horodatages UTC serveur avec precision coherente avec les migrations existantes. Les dates ne sont jamais celles du telephone.
- OTP : 6 chiffres, 10 minutes, 5 essais ; renvoi apres 60 secondes ; 5 envois/contact/heure et 20 envois/IP/heure, quotas partages en SQL.
- Session client : 30 jours au maximum. Cookie API host-only `__Host-smarteat_customer` en HTTPS, `Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax` ; nom local `smarteat_customer` en HTTP de developpement.
- Jeton de suivi : aleatoire 256 bits, empreinte seule en base, expiration au plus tot de creation +30 jours ou fermeture +7 jours ; rotation seulement explicite et autorisee.
- Precision de plan : preuve d'adresse selectionnee signee valable 15 minutes ; devis signe valable 5 minutes. La signature est verifiee, mais ne remplace pas le recalcul au checkout.
- Variables backend nouvelles : `CUSTOMER_AUTH_SECRET`, `DELIVERY_TOKEN_SECRET`, `CUSTOMER_ALLOWED_ORIGINS`, `CUSTOMER_WHATSAPP_ACCESS_TOKEN`, `CUSTOMER_WHATSAPP_PHONE_NUMBER_ID`, `CUSTOMER_WHATSAPP_TEMPLATE_NAME`, `CUSTOMER_WHATSAPP_TEMPLATE_LANGUAGE`, `CUSTOMER_WHATSAPP_GRAPH_VERSION`, `DELIVERY_GEOCODING_BASE_URL`. Pas de valeurs secretes dans les plans. Mailjet reutilise `EMAIL`, `MAILAPIKEY`, `MAILSECRETKEY` existants.
- Charger et valider les nouvelles configurations a la frontiere du service concerne, sans faire echouer le demarrage des parcours historiques lorsque la livraison est desactivee et qu'un nouveau secret manque. Le canal est alors indisponible ; la V1 ne peut etre declaree recettee sans ses deux canaux operationnels.
- Pas de version Graph API devinee : configurer une version supportee et testee lors de la recette fournisseur. Pas de route HTTP composee depuis une URL fournie par le client.
- La reprise du checkout garde `client_order_token` et son contexte prive. Elle ne cree ni deuxieme dossier ni nouveau jeton de suivi implicitement. Un lien perdu se renouvelle par une action autorisee distincte.
- Precision de plan : `PrivateCheckoutContext = {clientOrderToken, confirmationSecret}` ; le navigateur genere le secret de confirmation de 32 octets avant le checkout et le conserve avec la tentative. Le serveur ne stocke que son empreinte dans le dossier. Il ne suffit jamais d'envoyer un identifiant de commande pour faire tourner le jeton. Le `browserBinding` de connexion est un autre nonce aleatoire par tentative, lie au challenge des sa demande et conserve seulement pendant cette connexion.
- Derriere un reverse proxy, les quotas utilisent `req.ip` avec une liste `CUSTOMER_TRUSTED_PROXIES` explicite ; ne jamais faire confiance a tout `X-Forwarded-For` ou a une IP envoyee dans le corps. En local, le defaut reste sans proxy de confiance.

## Verification et politique de commits

Chaque tache comporte son cycle rouge/vert et un commit borne dans le depot concerne. Les tests purs et contrats HTTP utilisent `node assert` et les builders injectables existants, sans assertions sur des lignes de source. Les transactions et courses SQL ont des tests sur base jetable.

La tache 1 cree `B/test/helpers/deliveryDatabase.js` : `withDeliveryDatabase(callback, {beforeDeliveryMigrations} = {})` exige `DELIVERY_TEST_DATABASE_URL`, cree uniquement une base de nom `smarteat_delivery_test_<nonce>`, applique les migrations, fournit `{pool, seedScenario, readRows}`, puis supprime uniquement cette base nommee. Pour tester une migration de vraies anciennes lignes, appliquer d'abord les migrations historiques, appeler le hook optionnel `beforeDeliveryMigrations(db)`, puis les nouvelles migrations de livraison avant `callback(db)`. Sans configuration explicite, le test refuse de tourner ; il ne se rabat jamais sur la base de l'application. `seedScenario({legacy:false} = {})` fournit des lignes litterales pour commerces 7/8, caissier 10, livreurs 11/12, produit 21, commande 31 et livraison `41`, avec les champs obligatoires historiques ; en mode legacy, il n'utilise aucune nouvelle colonne/table. Ajouter les donnees clients au meme helper en tache 8.

Les extraits de tests dans les sous-plans se placent dans ces fixtures ou dans les fixtures unitaires explicitement decrites par leur tache. Aucun calcul attendu n'est reconstruit avec la fonction testee. Les fichiers `.integration.test.js` sont executes par `test:delivery:db`, pas silencieusement sautes dans `npm test`. Les tests unitaires sont ajoutes a `npm test` sans perdre de commande existante ; cote frontend, conserver aussi le `pretest` image-library existant.

Les commits du backend ne sont pas supposes etre inclus dans un commit frontend. A chaque jalon, relever les deux SHA compatibles. Aucune autorisation ancienne de deploiement d'une autre fonctionnalite ne vaut demande de publication de celle-ci.

## Criteres de sortie du plan

Couverture de la specification lors de la relecture :

| Sections de specification | Taches proprietaires |
| --- | --- |
| 1-3 : perimetre, existant et dossier durable | 1-5, puis integration 12. |
| 4 : site, caisse, operateur, livreur et suivi | 11-14, 16. |
| 5 : etats, attributions et problemes | 5-6, 13-14. |
| 6 : adresse, rayon, tarifs, frais et documents | 2-4, 8, 12, 15. |
| 7 : paiement, archive, especes et clotures | 4, 6-7, 15, 17. |
| 8 : identite, canaux, codes et session | 8-11. |
| 9 : donnees et contraintes | 1, 8 et tests SQL de chaque service. |
| 10-11 : droits, contrats, erreurs et projections | 2-16, controles transverses 17. |
| 12-13 : integration, validation et mise en service | Ensemble des trois plans, recette 17. |
| 14 : choix techniques valides | Contrats communs de ce plan et taches 2, 8-11. |

- Toutes les exigences des sections 1 a 13 de la specification ont une tache dans les trois sous-plans.
- Les scenarios R1 a R5 sont testes dans leurs taches proprietaires.
- Les migrations, devis, fonds detenus par les livreurs et frais sur les documents sont verifies, pas seulement les boutons de l'interface.
- Les deux canaux de connexion sont testes en recette avec les comptes centraux ; une configuration manquante reste un prerequis visible, jamais un succes declare.
- La V1 n'est activable qu'apres recette complete et configuration du restaurant. L'execution de ce plan n'inclut pas de deploiement distant automatique.

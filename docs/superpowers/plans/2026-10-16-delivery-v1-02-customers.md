# Delivery V1 Customer Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fournir les comptes clients facultatifs, les codes e-mail/WhatsApp et un carnet d'adresses prive par commerce.

**Architecture:** Ajouter des identites clientes verifiees distinctes des utilisateurs staff et points de service. Les canaux centraux n'ont aucun pouvoir sur les roles ; une session opaque propre au commerce protege le carnet. Ce lot ne cree pas encore le nouveau checkout visuel.

**Tech Stack:** Express, mysql2/dbmate, crypto, node-mailjet existant, WhatsApp Cloud API, Nuxt 2/Vuex, cookie HttpOnly et Node assert.

**Spec:** [Specification](../specs/2026-10-16-delivery-management-design.md) ; [contrats et contraintes communs](2026-10-16-delivery-management.md). Prerequis : sous-plan 01 vert et son SHA releve.

## Global Constraints

- Les nouveaux comptes clients sont distincts de `users` staff et des comptes/jetons de points de service.
- Aucun rapprochement automatique sur le nom ou un telephone non verifie.
- Code aleatoire a 6 chiffres, valable 10 minutes, a usage unique et verifie uniquement par le backend.
- SMS, y compris pour la connexion ; aucun fournisseur SMS a integrer : hors perimetre.
- Les comptes et autorisations Meta, l'expediteur Mailjet et les secrets sont des prerequis d'exploitation a fournir, pas des ressources supposees deja creees.
- Les codes ne sont ni des codes de livraison ni des notifications de commande.

## Review Focus

- R1 : edition d'une adresse du carnet sans changement de la livraison existante, tache 8.
- R2 : reponse perdue d'un fournisseur ou de verification, aucun faux succes ni deuxieme session par rejeu du code, tache 9.
- R3 : le carnet ne calcule aucun frais ; la demande de devis reste celle du sous-plan 01, tache 11.
- R4 : cookie client, CORS et erreurs 401 n'ecrasent pas les sessions staff et ne traversent pas les commerces, taches 10-11.
- R5 : les dates de validite des codes/sessions utilisent l'horloge serveur UTC, tache 9.

## Structure des fichiers

`m_customers.js` possede fiches et carnet. `customerIdentity.js` normalise les contacts sans leur accorder de droits. `m_customerAuth.js` gere challenges et quotas SQL. `customerCodeTransports.js` est la seule frontiere d'envoi externe. `customerSession.js` gere tokens/cookies/CSRF ; le middleware dedie attache un sujet client sans changer `req.access` staff. Le frontend utilise sa propre instance API et un store namespace, pas `store/users.js` pour le client.

### Task 8: Creer fiches, identites et carnet isoles

**Files:** Create `B/db/migrations/20261016130000_delivery_customers.sql`, `B/src/helpers/customerIdentity.js`, `B/src/modules/m_customers.js`, `B/src/controllers/c_customers.js`, `B/src/routers/r_customers.js`, `B/test/customer-identity.test.js`, `B/test/customer-addresses.integration.test.js`; modify `B/test/helpers/deliveryDatabase.js`, `B/index.js`, `B/package.json` et `B/package-lock.json` si ajout du parseur telephone.

**Interfaces:** Produit les tables `customers`, `customer_identities`, `customer_addresses`, `customer_otp_challenges`, `customer_sessions` et leurs cles de quotas dans `service_rate_limits` creee en tache 1. Ajoute les FK clientes compatibles aux colonnes preparees en tache 1. `normalizeCustomerDestination({channel, value, countryCode}) -> string` ; `buildCustomers({repository, runInTransaction}).listAddresses({shopId, customerId})`, `saveAddress({shopId, customerId, addressId|null, addressResolutionToken, complement, instructions, makeDefault})`, `deleteAddress({shopId, customerId, addressId})`. La verification du token d'adresse reutilise la tache 2.

- [ ] **Step 1: Ecrire les tests** : defaut unique, creation `Adresse 1/2/3`, suppression d'Adresse 2 puis ajout => `Adresse 4`, aucune renumerotation, editions limitees au client/commerce. La selection par defaut est un pointeur unique sur `customers`, change sous verrou client ; suppression du defaut choisit la plus ancienne adresse restante ou null. R1 : modifier le complement du carnet ne change pas `deliveries.address_snapshot`. Normalisation : domaine e-mail en minuscules/IDN, pas de suppression des `+alias` ou des points de la partie locale ; telephone international valide canonise en E.164.
  ```js
  assert.equal(newAddress.label, 'Adresse 4')
  assert.equal(deliverySnapshot.instructions, 'Ancien interphone')
  assert.equal(normalizeCustomerDestination({channel:'whatsapp', value:'06 12 34 56 78', countryCode:'FR'}), '+33612345678')
  await assert.rejects(readShop8AddressesAsShop7, {code: 'CUSTOMER_NOT_FOUND'})
  ```
- [ ] **Step 2: Executer** `node test/customer-identity.test.js` et `node test/customer-addresses.integration.test.js` depuis `B` ; attendu rouge sur tables/services absents.
- [ ] **Step 3: Implementer les contrats**, avec VARCHAR/UTF8MB4 pour les nouvelles donnees et compteurs de libelles monotones. Ajouter `libphonenumber-js` comme dependance backend seulement si aucun parseur fiable n'existe : la validation internationale de l'identite de connexion justifie cet ajout ; ne pas transformer le helper statistique historique en authentification. Utiliser le parseur strict et la validation du paquet, sans extraction d'un numero depuis un texte libre ; inclure les metadonnees de validation necessaires. [Documentation officielle du parseur](https://github.com/catamphetamine/libphonenumber-js). Les fixtures nouvelles sont clients `51`/`52`, commerces 7/8. Creer les routes staff de recherche/creation de fiches reservees au module livraison operateur ; aucune recherche publique par telephone. Les routes carnet ne seront montees avec acces client qu'apres tache 10.
- [ ] **Step 4: Tests verts**, up/down/up de cette migration sur base jetable, regression de l'historique clients et des cles etrangeres. Enregistrer les tests purs et SQL dans leurs scripts respectifs.
- [ ] **Step 5: Commit `feat: add verified customer identities and address book`** dans `B`.

### Task 9: Emettre et verifier des codes avec quotas partages

**Files:** Create `B/src/services/customerCodeTransports.js`, `B/src/modules/m_customerAuth.js`, `B/test/customer-code-transports.test.js`, `B/test/customer-auth.integration.test.js`; modify `B/src/controllers/c_customers.js`, `B/src/routers/r_customers.js`, `B/src/helpers/env.js`, `B/package.json`.

**Interfaces:** Produit `buildCustomerAuth` du contrat commun ; `transports.sendCode({channel, destination, code, expiresInMinutes, locale}) -> Promise<{providerMessageId, accepted}>`. `requestChallenge` retourne `{challengeId, expiresAt, resendAfter, status}` sans code ; `verifyChallenge` consomme le code une fois et retourne un contexte d'identite verifiee exploitable uniquement par le service de session. Aucun cookie ni role staff n'est fabrique par le transport.

- [ ] **Step 1: Ecrire les tests avec clock/randomCode injectes**, valeur de test `123456` exclusivement dans les fixtures. A 599 secondes => valable, a 600 => expire ; 5 erreurs => challenge ferme ; renvoi a 59 secondes refuse, a 60 accepte et invalide l'ancien ; sixieme envoi/contact/heure refuse, vingt-et-unieme/IP/heure refuse, meme depuis deux instances du module sur le meme SQL. Liaison d'un second contact exige le compte authentifie et verification ; conflit d'identite => aucune fusion. Capturer le payload HTTP de transport uniquement dans le test, et verifier modele WhatsApp d'authentification, absence de message de livraison et expediteur central Mailjet.
  ```js
  assert.equal(publicResponse.code, undefined)
  assert.notEqual(storedChallenge.code_hash, '123456')
  assert.equal(verifiedIdentitiesAfterConcurrentVerify, 1)
  assert.equal(requestsAfterQuotaExceeded, requestsBeforeQuotaExceeded)
  ```
  R2 : timeout fournisseur => pas de faux statut livre ; si le code a effectivement ete recu, sa verification cryptographique peut reussir tant que le challenge est ouvert. Un code consomme n'est pas rejoue pour recreer une session apres perte de reponse : demander un nouveau challenge. Cette tache verifie une identite ; l'emission effective de la session HTTP est branchee en tache 10.
- [ ] **Step 2: Executer** `node test/customer-code-transports.test.js` puis `node test/customer-auth.integration.test.js` ; attendu rouge sur service manquant.
- [ ] **Step 3: Implementer HMAC, consommation atomique et quotas** avec `CUSTOMER_AUTH_SECRET` distinct de JWT, nombres aleatoires crypto, comparaison constante et erreurs non enumerantes. Reserver le challenge/quota en SQL, envoyer hors transaction, puis enregistrer le resultat sans stocker le code clair. Mailjet reutilise les credentials et SDK existants avec un nouveau contenu ; ne pas modifier le parcours d'activation historique. WhatsApp appelle la version Graph configuree, le numero et le modele central ; erreur de configuration => canal indisponible, jamais SMS de secours. Delai HTTP 5 secondes, aucun retry automatique d'envoi ni log de contenu/secret.
- [ ] **Step 4: Tests verts** et regression du login staff. Enregistrer les tests ; les doubles HTTP sont les seules frontieres faussees, la verification et le stockage restent reels. Ne pas envoyer de messages reels pendant les tests unitaires.
- [ ] **Step 5: Commit `feat: authenticate customers with email and WhatsApp codes`** dans `B`.

### Task 10: Isoler les sessions clientes et securiser les appels avec cookie

**Files:** Create `B/src/helpers/customerSession.js`, `B/src/helpers/middleware/customerAuth.js`, `B/src/helpers/customerCors.js`, `B/test/customer-session.integration.test.js`, `B/test/customer-cors.test.js`; modify `B/index.js`, `B/src/controllers/c_customers.js`, `B/src/routers/r_customers.js`, `B/src/helpers/env.js`, `B/package.json`, `B/package-lock.json`.

**Interfaces:** Produit `buildCustomerSession` du contrat commun et les middlewares `requireCustomerSession`, `attachOptionalCustomerSession`, `requireCustomerCsrf`. Les middlewares exposent `req.customerSession` et ne changent jamais `req.id/access/shopid/sessionSubject` staff/service-point. Endpoints session, logout, liaison de contact et carnet definis par la specification. L'optionnelle ne rattache jamais un compte d'un autre commerce au checkout.

- [ ] **Step 1: Ecrire des tests HTTP avec vrais cookies** : code valide => cookie opaque de 32 octets minimum, attributs HTTPS requis, empreinte seule en base ; expiration 30 jours, logout/revocation et mauvais commerce => refus. R4 : requete portant simultanement bearer staff et cookie client garde les deux contextes ; cookie ne donne jamais acces aux anciennes routes staff. Origine permise => CORS exact, `Vary: Origin`, credentials autorises ; origine etrangere => pas de credentials ni mutation cliente. Absence/mauvais `X-CSRF-Token` => 403, preflight autorise => reponse sans effet.
  ```js
  assert.equal(staffContextAfterCustomerRead.access, 1)
  assert.equal(customerMutationWithoutCsrf.status, 403)
  assert.equal(untrustedOriginMutation.status, 403)
  assert.equal(customerCookieAgainstStaffRoute.status, 401)
  ```
- [ ] **Step 2: Executer** `node test/customer-cors.test.js` et `node test/customer-session.integration.test.js` ; attendu rouge sur cookie/CSRF/CORS actuels incompatibles.
- [ ] **Step 3: Implementer sessions et CORS cible**. Declarer le parseur `cookie` comme dependance directe s'il n'est que transitif, avec version compatible Node 18 et CommonJS, pour parser/serialiser sans parseur artisanal ; verifier l'API de cette version dans sa [documentation officielle](https://github.com/jshttp/cookie). La politique des routes clientes et checkouts portant des cookies utilise l'allowlist exacte ; conserver les usages bearer/public historiques sans wildcard credentialed. Ajouter explicitement `X-CSRF-Token` aux preflights concernes et la configuration `CUSTOMER_TRUSTED_PROXIES` au calcul de l'IP. Tester qu'un `X-Forwarded-For` forge depuis un pair non approuve ne contourne pas les quotas. Le token CSRF est lie a la session et verifie au serveur ; jamais confondu avec le code OTP. Erreurs de session cliente ne declenchent aucun logout staff. Brancher les routes carnet, les sujets clients et la liaison verifiee des identites.
- [ ] **Step 4: Tests verts** puis tests auth staff, point de service, table QR et `npm.cmd test` backend. Tests SQL : deux verifications concurrentes ne creent qu'un compte/session ; une identite existante ne traverse pas les commerces.
- [ ] **Step 5: Commit `feat: isolate customer sessions and address permissions`** dans `B`.

### Task 11: Fournir la connexion et le carnet sur le site

**Files:** Create `F/plugins/customerApi.client.js`, `F/store/customer.js`, `F/components/customer/CustomerCodeLogin.vue`, `F/components/customer/CustomerAddressBook.vue`, `F/pages/compte/index.vue`, `F/layouts/customer.vue`, `F/test/customer-account.test.js`; modify `F/nuxt.config.js`, `F/package.json`.

**Interfaces:** `$customerApi` est une instance API independante avec cookies, CSRF et erreurs clientes locales. Store : `loadSession({shopId})`, `requestCode({channel,destination,purpose})`, `verifyCode({challengeId,code})`, `linkIdentity({challengeId,code})`, `logout()`, `loadAddresses()`, `saveAddress(payload)`, `deleteAddress(id)`, `resetForShop(shopId)`. Etat : `shopId`, `session`, `addresses`, `challenge`, `busy`, `error`. `CustomerCodeLogin` a le mode `login` ou `link`, et emet `authenticated` ou `identity-linked` ; `CustomerAddressBook` emet `select` avec identifiant/adresse resolue, jamais un prix.

- [ ] **Step 1: Ajouter les tests de comportement Vue/store**, avec instance API doublee seulement a la frontiere HTTP : code vide/incomplet refuse, countdown derive de `resendAfter` serveur, echec fournisseur propose l'autre canal ou retour invite, double soumission bloquee. R4 : 401 client vide uniquement l'etat client, laisse le bearer staff intact ; changement shop 7 vers 8 efface challenge/adresses precedents. R1 : changement de defaut/suppression ne renumerote pas les labels affiches.
  ```js
  assert.equal(staffTokenAfterCustomer401, staffTokenBefore)
  assert.equal(customerState.addresses.length, 0) // apres changement de commerce
  assert.equal(checkoutQuoteCallsDuringLoginOnly, 0)
  ```
- [ ] **Step 2: Executer** `node test/customer-account.test.js` depuis `F` ; attendu rouge sur composants/store absents. Utiliser le chargement SFC comportemental deja pratique dans les tests, pas seulement des recherches de texte.
- [ ] **Step 3: Implementer les composants Vuetify et le store**. Utiliser `$axios.create` pour une instance sans les interceptors de logout generaux et verifier ce comportement ; si l'extension Nuxt transmet des interceptors, creer une instance Axios independante explicitement. Le layout client reste leger, avec l'identite du restaurant et le logo existant, sans shell staff. Lire `process.env.privateURL` deja expose, pas des secrets neufs ; charger le contexte public de restaurant existant. Aucun stockage du cookie en localStorage ni bouton de canal non configure presente comme fonctionnel. Le client peut quitter vers la commande invite. Dans son compte, il peut ajouter son autre contact via un challenge `link` ; tester qu'apres liaison verifiee e-mail et WhatsApp retrouvent exactement le meme carnet et qu'un conflit ne cree pas de fusion silencieuse.
- [ ] **Step 4: Test vert**, lint cible des fichiers JS/Vue puis `npm.cmd test` frontend. Ajouter le test sans ecraser `pretest`. Verification sur desktop et telephone de la saisie du code, du focus, des erreurs et des libelles d'adresse longs. Relever les deux SHA compatibles avant le sous-plan 03.
- [ ] **Step 5: Commits bornes dans `F` et dans `B` si ajustement de contrat**, message frontend `feat: add customer code login and address book`. Ne pas publier cette etape comme une V1 livraison complete.

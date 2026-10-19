# Google Delivery Addresses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la saisie postale des trois parcours de livraison par une autocompletion Google, sans GPS Google persistants ni modification des montants historiques.

**Architecture:** Un service backend Google traite Autocomplete puis Place Details et conserve seulement les positions dans un cache memoire de 15 minutes. Une reference durable remplace les GPS Google en base ; les preuves de resolution et de devis restent temporaires et signees. Le composant Vuetify commun utilise ces endpoints et les carnets restent exploitables en cas de panne fournisseur.

**Tech Stack:** Node.js/CommonJS, Express, mysql2/MySQL 8, tests Node et fixtures SQL existantes ; Nuxt 2, Vue 2, Vuex, Vuetify, Axios, uuid deja installe.

**Spec:** `../specs/2026-10-19-google-delivery-addresses-design.md`, approuvee par l'utilisateur le 2026-10-19 apres le commit frontend `7f892c5`.

## Global Constraints

- "Google est appele uniquement par le backend. La cle `GOOGLE_PLACES_API_KEY` ne doit apparaitre ni dans Nuxt, ni dans le navigateur, ni dans les logs ou messages d'erreur."
- "Les references Google sont durables ; les GPS Google ne sont pas enregistres en base. Un cache memoire de 15 minutes maximum suffit a reutiliser les coordonnees pendant une operation."
- "Les distances restent calculees a vol d'oiseau et les tarifs restent ceux des paliers existants. Pas de Routes API, de carte integree, de suivi GPS du livreur ou de nouvel operateur SMS."
- "Les anciens dossiers et origines IGN restent utilisables sans conversion automatique ni recherche Google en masse."
- "Reutiliser Nuxt 2, Vue 2, Vuetify, Axios et les icones MDI ; aucune nouvelle dependance necessaire."
- France uniquement ; seuil de 3 caracteres utiles, debounce 300 ms, au plus 5 suggestions ; timeout fournisseur 5 secondes, corps maximal 1 Mio, quota partage 40 appels/seconde glissante conservative.
- Preuves d'adresse : 900000 ms ; devis : 300000 ms ; cache GPS : 900000 ms depuis reception, maximum 1000 entrees, aucune extension a la lecture.
- Ne pas modifier les migrations appliquees, les protections des journaux, les anciennes adresses ou la configuration de livraison d'un restaurant au demarrage.
- Pas de paiement, impression, OTP, appel Google payant de test ou deploiement automatique. Les modifications chiffrees existantes de `.env.staging` et `.env.production` backend restent hors des commits de code ci-dessous.

## Review Focus

1. Un SAVE ou une nouvelle frappe apres selection ne doit ni reutiliser une session Google terminee ni valider une ancienne reponse (taches 1, 3 et 4).
2. Une position cachee d'un autre restaurant, une preuve forgee ou un changement d'acteur ne doit jamais autoriser un calcul ou une fuite (taches 1, 3 et 4).
3. Une reponse de checkout copiee dans un journal imbrique ne doit contenir aucun GPS Google, meme apres modification, archivage ou rejeu (taches 2 et 5).
4. Une origine Google valide dont le cache expire ne doit pas desactiver la livraison ; une panne fournisseur doit bloquer seulement les nouveaux devis qui ont besoin de sa position (taches 2 et 5).
5. Une ancienne adresse IGN ou un carnet partiellement indisponible doit rester consultable ; defaut/suppression/rejeu ne doivent pas dependre de Google (taches 2, 4 et 5).

## Reperes et contrats communs

`F` = `C:/Users/kalag/Desktop/projects/clone-pos/pos/.worktrees/delivery-v1/pos-app` ; `B` = le dossier frere `express-pos`. Utiliser les worktrees existants `feat/delivery-v1`, pas les checkouts originaux. Les chemins `F/...` et `B/...` ci-dessous sont relatifs a ces racines.

- `GoogleReference` : `{ provider: 'google_places', placeId: string }`. Identifiant non vide, <=1024 caracteres, sans caracteres de controle ; ne pas imposer de prefixe `ChIJ`. L'URL fournisseur reste fixe et encode l'identifiant comme un segment, jamais comme une URL libre.
- `ResolvedAddress` : reference + `street, postalCode, city, country: 'FR', precision: 'housenumber', latitude, longitude`, plus les champs prives normalises existants et, pour une nouvelle selection, `selectedLabel` issu de la suggestion signee. Objet temporaire uniquement.
- `Suggestion` HTTP : `{ placeId, label, selectionToken }` ; retour `{ suggestions: Suggestion[] }`. Le jeton signe contient `kind: 'place_selection', shopId, placeId, label, sessionToken, issuedAt, expiresAt`, avec TTL 900000 ms. Aucun jeton de selection ne remplace une preuve d'adresse validee par Place Details.
- Recherche HTTP, staff et client : `{ input, sessionToken }`. Nouvelle resolution : `{ selectionToken }`, exclusive des anciennes formes postales et de `addressId`. Les IDs du restaurant/client proviennent toujours des sessions, jamais de ce corps.
- `AddressResolution` conserve le contrat existant `{ addressSnapshot, addressResolutionToken, expiresAt }`. Les resolutions de carnet utilisent les endpoints existants et l'adresse autorisee lue en base, pas un `placeId` libre fourni par le navigateur.
- `origin` conserve son nom : point numerique pour IGN, `GoogleReference` pour une origine Google durable. Une origine Google hydratee ajoute des GPS uniquement dans la copie de calcul ; la reference sauvegardee n'en contient pas.
- Les erreurs reutilisent `DELIVERY_ADDRESS_INVALID` (422), `DELIVERY_GEOCODING_UNAVAILABLE` (503) et `DELIVERY_GEOCODING_RATE_LIMITED` (429), avec messages francais dans les clients existants.

Les trois premieres taches sont un ensemble backend a terminer avant tout deploiement. Les commits intermediaires ne constituent pas des versions publiables.

## Task 1: Service Google et cycle de vie memoire

**Files:** Create `B/src/services/googleDeliveryPlaces.js`, `B/test/google-delivery-places.test.js` ; modify `B/src/helpers/env.js`, `B/package.json`. Reutiliser `buildSqlGeocodingQuota` de `B/src/services/deliveryGeocoding.js` sans changer son allocation globale ni son contrat IGN.

**Interfaces:** `buildGoogleDeliveryPlaces({ transport, reserveQuota, apiKey, clock, timers })` produit `suggest({shopId,input,sessionToken}) -> Promise<{placeId,label}[]>`, `resolve({shopId,placeId,sessionToken?}) -> Promise<ResolvedAddress>`, `position({shopId,placeId}) -> Promise<{latitude,longitude}>`, `purgeExpired() -> number` (nombre d'entrees supprimees) et `dispose()`. `clock()` retourne une Date, `timers` fournit `setTimeout/clearTimeout`, et `transport(url,{method,headers,body?,timeoutMs})` retourne le JSON. Exporter une instance partagee `googleDeliveryPlaces`, a configuration lazy, pour les services par defaut ; les tests injectent leurs dependances. `getDeliveryConfig()` ajoute `googlePlacesApiKey` sans exiger cette cle au boot legacy.

- [ ] **Step 1: Ecrire les tests fournisseur et horloge** dans `google-delivery-places.test.js`. Pinner POST `/v1/places:autocomplete`, `includedRegionCodes:['fr']`, `languageCode:'fr'`, `regionCode:'fr'`, types postaux `street_address/premise/subpremise`, `includeQueryPredictions:false`, masque `suggestions.placePrediction.placeId,suggestions.placePrediction.text.text`. Pinner GET `/v1/places/{id}` avec masque `id,addressComponents,formattedAddress,location` et meme session pour la selection ; la lecture de position seule utilise `id,location`. Verifier qu'une selection termine toujours sa session par Details, meme si sa position etait cachee. Chaque appel sortant reserve le quota partage.

```js
test('position cache expires at exactly 900000ms without sliding its TTL', async () => {
  let now = 0; let calls = 0;
  const service = buildGoogleDeliveryPlaces({ apiKey: 'fixture-only',
    clock: () => new Date(now), reserveQuota: async () => {},
    transport: async () => { calls++; return { id: 'fixture-place', location: { latitude: 48.8, longitude: 2.3 } }; },
    timers: { setTimeout: () => ({ unref() {} }), clearTimeout() {} } });
  await service.position({ shopId: 7, placeId: 'fixture-place' });
  now = 899999;
  await service.position({ shopId: 7, placeId: 'fixture-place' });
  assert.equal(calls, 1);
  now = 900000;
  assert.equal(service.purgeExpired(), 1);
  await service.position({ shopId: 7, placeId: 'fixture-place' });
  assert.equal(calls, 2);
  service.dispose();
});
```
- [ ] **Step 2: Executer les tests rouges.** Depuis B, `node test/google-delivery-places.test.js` doit echouer sur le module/service absent, sans reseau ni base applicative.
- [ ] **Step 3: Implementer le transport HTTPS et la conversion.** Utiliser `https.request(options, callback)` avec un seul objet d'options, cle en en-tete `X-Goog-Api-Key`, timeout 5000 ms, limite 1048576 octets, statut 200 et JSON valide seulement. Verifier cle non vide non chiffree avant quota, et expurger les erreurs. Valider numero/voie/commune/code postal/pays et GPS a la selection, y compris tableaux malformes ou composants dupliques contradictoires. Ne jamais utiliser une suggestion de ville ou un lieu sans numero comme destination de repli.
- [ ] **Step 4: Ajouter le cache de positions uniquement.** Cle `(shopId,placeId)`, valeurs copiees, FIFO borne a 1000 entrees, TTL fixe depuis reception et suppression programmee a expiration avec timers `unref()`/nettoyage dans `dispose()`. Coalescer seulement les lectures de position sans session ; ne pas fusionner deux terminaisons de sessions differentes. Ne pas cacher les libelles, composants, objets Details ou suggestions. Tester `t=899999` puis `t=900000`, changement de restaurant, mutation d'un objet retourne, eviction, rejet non mis en cache et absence d'allongement apres une lecture. Une instance neuve doit etre vide.
- [ ] **Step 5: Verifier le vert et la regression transport.** `node test/google-delivery-places.test.js` puis `node test/delivery-quotes.test.js` doivent passer, notamment le test chargeant le vrai SDK Mailjet avant le transport. Ajouter le nouveau test a `npm test`.
- [ ] **Step 6: Commit cible.** Depuis B : `git -c core.hooksPath=NUL add -- src/services/googleDeliveryPlaces.js src/helpers/env.js test/google-delivery-places.test.js package.json`, verifier `git diff --cached --check`, puis commit `feat: add server-side Google delivery places service`.

## Task 2: References durables, origines et ecritures de commande

**Files:** Create `B/src/helpers/deliveryAddressStorage.js`, `B/db/migrations/20261019120000_delivery_google_references.sql`, `B/test/google-delivery-storage.test.js`, `B/test/google-delivery-storage.integration.test.js` ; modify `B/src/modules/m_customers.js`, `B/src/modules/m_deliverySettings.js`, `B/src/modules/m_deliveryQuotes.js`, `B/src/modules/m_deliveryOrders.js`, `B/src/helpers/deliveryPricing.js`, `B/package.json`. Completer les regressions dans `B/test/customer-addresses.integration.test.js` et `B/test/delivery-quotes.test.js` sans remplacer leurs fixtures IGN.

**Interfaces:** Le helper exporte `isGoogleReference(value)`, `toStoredAddress(snapshot,{purpose:'book'|'transaction'|'origin'})`, `sameDeliveryDestination(accepted,resolved)` et `sanitizeGoogleDeliveryPayload(value)` (copie recursive des enveloppes, projection explicite des seuls snapshots Google). Les modules customers/settings/quotes acceptent l'instance `places` de la tache 1 en injection. Les signatures publiques existantes de sauvegarde, checkout et revision sont preservees.

- [ ] **Step 1: Ecrire les tests rouges de serialisation et SQL.** Une reference de carnet ne garde que fournisseur, ID et champs prives autorises ; une origine ne garde que la reference ; une adresse de transaction garde au plus la reference, les champs postaux selectionnes et les champs prives, jamais GPS, session ou jeton. Un objet declarant `provider: google_places` avec un ID invalide doit etre rejete, jamais traite comme IGN. Placer des GPS dans `previous.delivery.addressSnapshot`, `next.delivery.addressSnapshot`, `result.delivery.addressSnapshot` et les preuves temporaires pour verifier qu'aucune enveloppe persistee ne les conserve. Les objets IGN doivent etre inchanges et les entrees ne doivent pas etre mutees.

```js
test('book serialization never stores provider postal text or GPS', () => {
  const source = { provider: 'google_places', placeId: 'fixture-place',
    street: '60 rue Test', postalCode: '75008', city: 'Paris', country: 'FR',
    latitude: 48.8, longitude: 2.3, instructions: 'Portail B' };
  assert.deepEqual(toStoredAddress(source, { purpose: 'book' }),
    { provider: 'google_places', placeId: 'fixture-place', instructions: 'Portail B' });
  assert.equal(source.latitude, 48.8);
});
```
- [ ] **Step 2: Executer le rouge.** `node test/google-delivery-storage.test.js`, puis `node test/google-delivery-storage.integration.test.js` sur la base Docker dediee ; le premier echoue sur le helper absent, le second sur le schema incapable de stocker une reference sans GPS.
- [ ] **Step 3: Ajouter le schema sans conversion de donnees.** Ajouter `origin_google_place_id varchar(1024)` nullable aux reglages et `google_place_id varchar(1024)` nullable aux dossiers ; rendre les colonnes GPS des dossiers nullables. Les CHECK exigent des alternatives exclusives : IGN avec paire numerique valide et sans reference ; Google avec paire NULL, ID non vide et correspondance stricte au fournisseur/ID du JSON. Les verifications de cles JSON doivent refuser explicitement les valeurs manquantes/NULL, pas compter sur la logique SQL a trois valeurs. L'activation accepte l'origine Google referencee, en conservant rayon/TVA/paliers obligatoires. Aucun trigger de journal n'est retire. Le `down` refuse explicitement de tourner s'il reste une reference Google, avant de retablir les anciennes contraintes ou supprimer une colonne.
- [ ] **Step 4: Adapter les origines et le calcul.** `validateDeliverySettings` accepte une reference structurellement valide sans appel fournisseur. Sauver une nouvelle origine exige la preuve signee ; sans preuve, seul le maintien exact de l'origine existante est autorise. La sauvegarde Google ecrit la reference et deux NULL, jamais les GPS de la preuve. `createQuote` resout l'origine en memoire via `places.position`, puis passe le point temporaire au calcul existant. Un echec n'ecrit ni `enabled=false`, ni nouvelle revision. Tester cache expire/panne avec settings inchanges, maintien des frais/TVA et revision concurrente de l'origine.
- [ ] **Step 5: Adapter le carnet sans reseau sous ses verrous SQL.** Sauvegarder les nouvelles adresses Google avec `toStoredAddress(...,{purpose:'book'})` ; une modification de complement/defaut sans preuve n'exige pas `normalizeAddress` sur une reference seule. Lire et autoriser l'adresse dans la transaction existante, puis resoudre Google apres liberation des verrous avant de signer la preuve temporaire. Les anciennes adresses IGN continuent a etre resignees sans fournisseur. `listAddresses` retourne les references et libelles sans lancer de recherche en masse ; defaut/suppression restent purement metier.
- [ ] **Step 6: Adapter creation/revision/rejeu.** Utiliser la projection de transaction avant les INSERT/UPDATE de `deliveries`, deux NULL GPS et l'ID Google dans sa colonne. Appliquer `sanitizeGoogleDeliveryPayload` aux resultats/evidences avant chaque journal de creation/revision ; ne jamais enregistrer des preuves temporaires. Pour une revision Google, l'egalite exacte fournisseur/lieu autorise la conservation des champs prives, meme si les GPS recuperees ont change ; un autre lieu reste refuse suivant les gardes actuelles. Les anciennes comparaisons IGN restent strictes. Ne pas fabriquer une provenance Autocomplete pour une adresse simplement hydratee depuis le carnet : conserver seulement la reference si l'exception d'adresse selectionnee de la transaction ne s'applique pas. Une vue postale courante sera enrichie separement par la tache 3.
- [ ] **Step 7: Verifier le vert.** `node test/google-delivery-storage.test.js`, `node test/google-delivery-storage.integration.test.js`, `node test/customer-addresses.integration.test.js`, `node test/delivery-schema.integration.test.js`, `node test/delivery-quotes.test.js`. Attendre zero echec ; verifier avant/apres les montants, revisions et journaux IGN. Ajouter les nouveaux tests aux scripts unitaires/SQL respectifs.
- [ ] **Step 8: Commit cible.** Ajouter uniquement les fichiers enumeres de cette tache dans B, verifier le diff indexe, puis commit `feat: persist Google delivery references without coordinates`. Ne pas ajouter les environnements ni les anciennes migrations.

## Task 3: Endpoints signes, autorisations et lectures degradees

**Files:** Modify `B/src/helpers/deliveryAddress.js`, `B/src/modules/m_deliveryQuotes.js`, `B/src/controllers/c_delivery.js`, `B/src/controllers/c_customers.js`, `B/src/routers/r_delivery.js`, `B/src/routers/r_customers.js`, `B/src/modules/m_deliveryDispatch.js`, `B/src/modules/m_deliveryTracking.js` ; create `B/src/services/deliveryAddressViews.js`, `B/test/google-delivery-api.test.js` ; extend `B/test/customer-cors.test.js`, `B/test/delivery-authorization.test.js`, `B/package.json`.

**Interfaces:** `quotes.suggestAddresses({shopId,input,sessionToken}) -> {suggestions}` et `quotes.resolveAddress({shopId,selectionToken}) -> AddressResolution`. Dans `deliveryAddress.js`, `signPlaceSelection({shopId,placeId,label,sessionToken,now,tokenCodec}) -> string` et `validatePlaceSelection(token,now,{tokenCodec,shopId}) -> selectionClaims` suivent le contrat commun et le secret existant ; refus 422 `DELIVERY_ADDRESS_INVALID`. `buildDeliveryAddressViews({places}).hydrate({shopId,addressSnapshot}) -> Promise<{addressSnapshot,displayStatus:'ready'|'unavailable'|'invalid'}>` ne fait aucune ecriture ni signature et ne renvoie pas de GPS.

- [ ] **Step 1: Ecrire le rouge HTTP.** Utiliser Express avec les fixtures de sessions/roles existantes et un fournisseur fake. Tester POST suggestions autorise pour order-taker/service point verifie/client CSRF, interdit pour livreur/inactif/autre client ; les corps qui imposent shopId, GPS, placeId libre ou melangent adresse et selection sont refuses. Zero appel fournisseur/quota avant ces controles et avant disponibilite du signer. Tester preflight staff 204, origine client interdite 403 et responses `Cache-Control:no-store`, y compris les erreurs.

```js
test('a selection proof cannot be used by another restaurant', () => {
  const tokenCodec = buildDeliveryTokenCodec({ secret: 'disposable-google-selection-secret-32-bytes' });
  const now = new Date('2026-10-19T12:00:00Z');
  const token = signPlaceSelection({ shopId: 7, placeId: 'fixture-place', label: '60 rue Test, Paris',
    sessionToken: '147ab164-bb20-4b99-9a51-19a9832619cb', now, tokenCodec });
  assert.throws(() => validatePlaceSelection(token, now, { tokenCodec, shopId: 8 }),
    { code: 'DELIVERY_ADDRESS_INVALID' });
});
```
- [ ] **Step 2: Executer le rouge.** `node test/google-delivery-api.test.js` doit echouer sur routes/methodes absentes ; le test n'utilise pas les secrets du workspace.
- [ ] **Step 3: Signer les suggestions et resoudre les selections.** Normaliser input NFC/trim, 3..255 caracteres sans controles ; session UUID v4. Le signer preflight precede les appels ; verification de kind/restaurant/TTL/schema du jeton avant Details. Ne pas traiter un jeton d'adresse ou de devis comme une selection. La label de la suggestion est signee et independante du JSON Details brut. Ne pas imposer une egalite textuelle `1er/Ier`. Conserver la resolution structuree legacy explicitement identifiee pour compatibilite avec l'ancien client, sans repli automatique IGN depuis une requete Google.
- [ ] **Step 4: Monter les deux POST et etendre les resolutions existantes.** Staff : meme acteur que `resolveAddress` ; client : meme session/CSRF et controle strict de corps que `/customer/address-resolutions`. Garder l'ordre de montage du CORS client et des routes avant l'auth staff globale. Ne pas ouvrir la recherche aux livreurs ni aux routes publiques.
- [ ] **Step 5: Enrichir seulement les vues autorisees.** Les vues disposant du texte selectionne d'une transaction n'ont pas besoin de Google. Pour une reference seule, `hydrate` appelle Details a la demande, ne conserve que les donnees d'affichage pendant la reponse et signale une panne par dossier sans effacer le resultat metier. Appliquer apres controle d'acces, hors journaux/idempotence et hors verrou transactionnel ; masquer les dossiers fermes livreur et les champs du suivi public avant tout appel. Les listes de missions ne declenchent pas une hydratation de toute l'histoire : hydrater le detail ouvert seulement. Le suivi ref-only respecte sa duree d'acces, son plafond de lectures et ses champs publics actuels.
- [ ] **Step 6: Verifier le vert.** `node test/google-delivery-api.test.js`, `node test/customer-cors.test.js`, `node test/delivery-authorization.test.js`, `node test/delivery-quotes.test.js`. Couvrir token forge/expire/autre shop, pays non FR, absence de numero, erreur fournisseur expurgee, et changement de session pendant une lecture.
- [ ] **Step 7: Commit cible.** Ajouter seulement les fichiers de cette tache, verifier le diff indexe, puis commit `feat: expose authorized Google address lookup and delivery views`.

## Task 4: Champ unique et carnet hydrate a la demande

**Files:** Modify `F/components/delivery/DeliveryAddressInput.vue`, `F/components/delivery/DeliveryCheckout.vue`, `F/components/delivery/DeliverySettings.vue`, `F/components/customer/CustomerAddressBook.vue`, `F/components/delivery/DeliveryDispatch.vue`, `F/components/delivery/CourierMission.vue`, `F/pages/livraison/suivi.vue`, `F/store/delivery.js`, `F/store/customer.js`, `F/plugins/customerApi.client.js` ; create `F/components/customer/CustomerAddressSummary.vue`, `F/static/google-maps-attribution.png` ; extend `F/test/delivery-checkout.test.js`, `F/test/customer-account.test.js`, `F/test/delivery-operator.test.js`, `F/test/courier-mobile.test.js`, `F/test/delivery-tracking.test.js`, `F/test/persisted-state.test.js`. `F/helpers/persistedState.js` est une cible de verification, pas de refactor : il exclut deja delivery/customer/courier.

**Interfaces:** Prop obligatoire `suggester({input,sessionToken}) -> Promise<{suggestions}>` ajoutee au composant partage ; `resolver({selectionToken}|{addressId})` et `resolved`/`resolve()` preserves. Le composant expose `query`, `suggestions` et `chooseSuggestion(suggestion)` pour le select et ses tests. Actions `delivery/suggestAddresses` et `customer/suggestAddresses` deleguent selon le meme contexte que leurs resolutions. `delivery/displayAddress` / `customer/displayAddress` utilisent le endpoint existant de resolution du carnet autorise, puis retournent seulement `{addressSnapshot,displayStatus}` pour l'affichage sans conserver GPS ou preuve dans le carnet. `CustomerAddressSummary` recoit `value`, `loader` et `contextKey` ; aucune ecriture automatique du carnet.

- [ ] **Step 1: Ecrire les tests rouges avec Vue/Vuex montes** dans les harness existants de `delivery-checkout.test.js` et `customer-account.test.js`, pas seulement des recherches de texte et sans copier ces harness dans un nouveau test. Verifier un champ Adresse, 3 caracteres/300 ms, 5 suggestions, appel serveur et selection au clavier/tactile, optionnels replies et erreurs distinctes. Deux sessions enchainant selection puis nouvelle frappe doivent avoir des UUID differents ; un SAVE reutilise une resolution non expiree au lieu d'envoyer un second Details avec la meme session. Pinner les actions staff/client et le CSRF, sans cle Google ni coordonnees dans les requetes de recherche/resolution.

```js
test('SAVE reuses the selected unexpired proof without ending the session twice', async () => {
  let calls = 0;
  const input = new Vue({ ...load('components/delivery/DeliveryAddressInput.vue').default,
    propsData: { suggester: async () => ({ suggestions: [] }),
      resolver: async () => { calls++; return { ...proof('google'), expiresAt: new Date(Date.now() + 900000).toISOString() }; } } });
  try {
    const choice = { placeId: 'fixture-place', label: '60 rue Test', selectionToken: 'fixture-selection' };
    input.suggestions = [choice];
    await input.chooseSuggestion(choice);
    await input.resolve();
    assert.equal(calls, 1);
  } finally { input.$destroy(); }
});
```

- [ ] **Step 2: Executer le rouge.** Depuis F, `node test/delivery-checkout.test.js` doit echouer sur `chooseSuggestion` absent ou le comportement multi-champs actuel, pas sur une erreur de chargement du harness.
- [ ] **Step 3: Implementer avec Vuetify existant.** Utiliser `v-autocomplete` sans filtrage local des reponses serveur, `search-input`, `no-filter`, etendu pour charger/reessayer/selectionner sans HTML brut. Generer les UUID avec uuid deja installe. Sequence + contexte protegent toutes les reponses, erreurs et finally ; invalider preuve/devis avant la nouvelle recherche. Expirer la resolution a `expiresAt`, nettoyer les timers au changement de contexte/destruction, et ne pas rappeler Google pour complement/consignes. Conserver `.resolve()` pour SAVE/checkout et la resolution des IDs enregistres.
- [ ] **Step 4: Brancher les trois parents et representations d'origine.** Reglages : accepter un GoogleReference valide sans demander des coordonnees visibles, envoyer la preuve seulement pour un changement. Checkout : suggestions staff pour POS/guest, client verifie pour compte site, sans perdre un panier ou une tentative de paiement deja verrouillee. Traduire les erreurs fournisseur dans les deux clients Axios existants sans toucher l'intercepteur logout staff.
- [ ] **Step 5: Afficher les carnets sans recherche en masse.** `CustomerAddressSummary` affiche les champs deja connus ou le libelle Adresse N, puis hydrate quand la ligne devient visible (`IntersectionObserver`, deconnexion au destroy ; bouton de reessai explicite si indisponible). Les parents bornent a deux hydratations en vol, dedupliquent par `(contexte,addressId)` et ignorent les retours apres changement de session ; defaut/suppression restent disponibles. Reutiliser le resume dans les lignes du carnet et le slot item du select du checkout ; l'adresse choisie utilise la resolution du carnet existante. `displayStatus` est local a l'affichage et ne transforme pas une panne fournisseur en deconnexion.
- [ ] **Step 6: Attribution et vues operationnelles.** Telecharger depuis les ressources officielles Google l'asset bitmap non modifie, respecter ratio et hauteur 16..19 px, espace autour, alt Google Maps et lisibilite mobile ; ne pas inventer de logo. Afficher l'attribution pres des suggestions et des donnees Google courantes. Dispatch/courier/tracking distinguent adresse indisponible d'adresse absente ; un itineraire Google s'appuie sur adresse/reference, jamais sur un GPS persiste. Ne pas afficher les donnees privees fermees d'un livreur. Ajouter dans la checklist de livraison les liens publics de conditions/confidentialite a valider avant activation, sans inventer un texte juridique.
- [ ] **Step 7: Verifier le vert et les cas tardifs.** `node test/delivery-checkout.test.js`, `npm.cmd run test:delivery`, `node test/persisted-state.test.js`. Couvrir frappe apres selection, destruction, changement shop/client, minuit/expiration avec fake clock, complement sans appel, carnet partiellement indisponible, retry individuel, ancienne adresse IGN et readonly/disabled. Serialiser l'etat reel avec resolution/devis/Google GPS et verifier qu'aucune preuve ou position n'atteint le stockage persistant.
- [ ] **Step 8: Commit cible.** Ajouter les fichiers frontend enumeres uniquement apres verification du diff et du test, puis commit `feat: add shared Google delivery address autocomplete`. Ne pas changer `nuxt.config.js` pour exposer la cle.

## Task 5: Recette de conservation et verification complete

**Files:** Create `B/test/google-delivery-journey.integration.test.js`, `F/docs/superpowers/checklists/2026-10-19-google-delivery-addresses.md` ; modify `B/package.json` pour inclure le nouveau test SQL. Les tests frontend etendus sont deja inclus dans les scripts existants. Les captures et logs de recette sans secrets restent dans le dossier ignore `.superpowers/`.

**Interfaces:** Reutiliser `withDeliveryDatabase`, les factories et transports injectables des taches 1..4. Aucune nouvelle API produit ni nouvelle ecriture sur staging/production.

- [ ] **Step 1: Ecrire la recette SQL rouge avant les derniers correctifs.** Dans un parcours reel sur fixtures, resoudre avec fake Google, creer puis modifier une commande non payee, attribuer, archiver et relire cote operateur/livreur/suivi. Comparer chaque champ monetaire et chaque numero de revision attendu avant/apres purge du cache et panne du fournisseur. Rejouer checkout et revision avec leurs memes cles : succes metier identique, pas de nouvel appel Google impose au rejeu, pas de nouvelles charges/ecritures.

Assertions du sous-test `Google checkout and revision journals contain no coordinates` apres creation puis revision du dossier `deliveryId` par ce parcours :

```js
const [row] = await db.readRows('SELECT latitude,longitude,address_snapshot FROM deliveries WHERE shopid=7 AND id=?', [deliveryId]);
assert.equal(row.latitude, null);
assert.equal(row.longitude, null);
const journals = await db.readRows('SELECT previous_state,next_state,result FROM delivery_events WHERE shopid=7 AND delivery_id=?', [deliveryId]);
assert.ok(journals.length >= 2);
const decode = value => typeof value === 'string' ? JSON.parse(value) : value;
const evidence = [decode(row.address_snapshot), ...journals.map(event =>
  Object.fromEntries(Object.entries(event).map(([key, value]) => [key, decode(value)])))];
assert.equal(/"(?:latitude|longitude|addressResolutionToken|deliveryQuoteToken|quoteToken|address_resolution_token|delivery_quote_token)"\s*:/.test(JSON.stringify(evidence)), false);
```
- [ ] **Step 2: Verifier toutes les copies.** Scanner les lignes creees dans deliveries/customer_addresses/shop_delivery_settings et les JSON imbriques de delivery_events/collections/refunds ; absence de GPS Google, token de resolution/devis, label du carnet copie de Google ou corps fournisseur. Les empreintes irreversibles existantes des preuves sont autorisees. Comparer les fixtures IGN et tester que les triggers de journaux refusent toujours UPDATE/DELETE. Une seule coordonnee NULL, un ID vide/manquant ou une reference contradictoire doit etre refusee par SQL.
- [ ] **Step 3: Executer et corriger jusqu'au vert.** `node test/google-delivery-journey.integration.test.js`, puis depuis B `npm.cmd test` et `npm.cmd run test:delivery:db`. Depuis F `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build-local` avec le comportement OpenSSL existant. Conserver les sorties et codes de retour ; ne pas declarer le build ou la recette passes sur un test partiel. Les warnings historiques sont signales distinctement des nouveaux echecs.
- [ ] **Step 4: Recette navigateur locale.** Lancer le Nuxt local sur un port libre sans arreter un service existant, et un backend de recette branche uniquement aux fixtures/transport fake. Avec les trois vrais parcours, capturer a 1440x900 et 390x844 : frappe publique `60 rue Francois 1er`, choix, correction du texte, erreur/reessai, optionnels, carnet et origine enregistree reference-only. Verifier clavier, focus, dropdown non coupe, absence de chevauchement et console sans erreur. Donner l'URL locale au demandeur ; indiquer clairement que le fournisseur est simule. Ne pas reutiliser une session production.
- [ ] **Step 5: Completer la checklist de sortie.** Noter tests executes, schema compatible, absence de secrets dans les bundles/captures et absence de GPS Google dans les lignes/journaux. Lister les prerequis externes non encore verifies : Places API (New), facturation, restriction IP/API, quotas, conditions/confidentialite accessibles. Une recette avec vraie cle n'est pas necessaire aux tests ; si executee ulterieurement, l'annoncer et la borner a une seule adresse publique. Aucun push/deploiement n'est inclus.
- [ ] **Step 6: Commit cible final et revue.** Apres les verifications, committer uniquement tests/checklist et correctifs lies a la recette, puis faire la revue de branche independante prevue par la methode d'execution choisie. Signaler tout blocage externe sans le confondre avec une integration deployee.

## Environnement de verification et garde-fous

Avant tout test backend, utiliser un shell dedie avec `$env:ENV_FILE='NUL'`, un JWT de fixture et `PUBLICIMAGEPATH` pointant vers un dossier temporaire de recette. Ne pas charger/dechiffrer les environnements reellement deployes pour lancer les tests. Ne jamais afficher la cle utilisateur.

Les tests SQL exigent `DELIVERY_TEST_DATABASE_URL`, accepte seulement un MySQL local jetable via le helper existant. Creer un conteneur de recette MySQL 8.0.33 avec credentials de fixture, port lie a `127.0.0.1`, nom propre a cette execution et port libre ; attendre son healthcheck. N'utiliser ni le MySQL staging ni un service local non identifie. Le helper cree/supprime uniquement ses bases aleatoires `smarteat_delivery_test_*`. Arreter seulement le conteneur cree pour cette recette a la fin, sans supprimer de volume partage.

Avant les edits UI, relire les consignes Impeccable et les references de finition applicables, puis PRODUCT.md/DESIGN.md du worktree. Utiliser la bibliotheque MDI du projet, pas une nouvelle dependance d'icones. Verifier les adresses d'API dans `.env` (sans afficher les valeurs sensibles), `nuxt.config.js`, `plugins/axios.js` et `config/config.json` ; ne pas modifier les URLs de production pour faciliter la recette.

Sources techniques primaires a relire si leur contrat change : [Autocomplete New](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Place Details New](https://developers.google.com/maps/documentation/places/web-service/place-details), [sessions](https://developers.google.com/maps/documentation/places/web-service/place-session-tokens). Ce plan ne cree aucun compte, abonnement, service externe ou accord juridique.

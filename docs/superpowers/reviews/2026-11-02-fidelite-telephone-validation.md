# Fidélité par téléphone — staging du 2 novembre 2026

Le parcours fidélité utilise uniquement le numéro de téléphone, sans e-mail ni code SMS. Depuis le QR actif d'une table, un numéro déjà inscrit rouvre sa carte existante. La caisse et la borne conservent la recherche, le cumul et la dépense des points, sans inscription.

## Versions déployées

- Frontend : `6d883d35cd842de2fd26054d3ddbe95dd9ec7daa`, [déploiement Docker réussi](https://github.com/SuperJumper404/pos-app/actions/runs/41441194912).
- Backend : `9726bbd2fdeb7148a32ef8d422085ab738a180ac`, [déploiement Docker réussi](https://github.com/SuperJumper404/express-pos/actions/runs/41441182112).
- Production et PM2 inchangés.
- Sauvegarde privée de la base, des sources, de la configuration et des conteneurs avant déploiement. Certificats conservés hors Git, montés en lecture seule ; secrets préservés.

## Vérifications

- Suites générales frontend et backend réussies ; suites fidélité réussies ; lint sans erreur (162 avertissements existants) ; génération staging réussie.
- Intégration dans une base MySQL 8 jetable réussie : migration, concurrence `06…`/`+336…`, réouverture et recherche, isolation entre restaurants, absence d'identité vérifiée artificiellement.
- Revue indépendante : aucun défaut Critical, Important ou Minor établi ; 80 tests réexécutés avec succès par le relecteur.
- Base staging : 57 migrations, dont `20261102010000`, colonne `phone_e164` présente.
- API publique téléphone : HTTP 200, CORS limité à l'origine staging avec cookies, réponses non mises en cache. Les tentatives d'imposer un faux protocole ou une fausse adresse via les en-têtes transmis n'ont pas changé la reconnaissance de la connexion HTTPS. Confiance limitée au relais effectivement observé.
- Interface publique HTTP 200 ; empreinte SHA-256 de l'index identique au fichier du conteneur (`979cf3733e908198ea2189de8fd8dbcd010e9d1ab587cd33afa7eb62a85983cb`) ; trois scripts Nuxt référencés disponibles en HTTP 200.
- Parcours réel vérifié dans le navigateur : QR « Table Test », menu, lien « Ma fidélité », champ téléphone seul, affichage mobile 390 × 844.
- Une ancienne session conservée par le navigateur a d'abord affiché « Session expirée » ; « Reprendre la commande », puis une nouvelle ouverture du QR ont correctement rouvert le menu et la fidélité.

## Pour tester

1. Dans [l'onglet Fidélité du staging](https://staging.smarteat.fr/fidelite), activer le programme et configurer les points, récompenses et visuels.
2. Sur iPhone, scanner le QR actif d'une table, puis ouvrir « Ma fidélité ».
3. Saisir un numéro : créer la carte ou retrouver la même carte si le numéro existe déjà.
4. Ajouter la carte à Apple Wallet, puis vérifier le cumul et l'utilisation des points sur une commande de test.
5. Vérifier sur l'iPhone l'actualisation et la réception d'une notification d'offre, avec le consentement du client.

Au contrôle, le programme du restaurant `demo` était désactivé, version 4, avec zéro adhérent et zéro carte Wallet. Aucun programme, membre, point, récompense, paiement ou notification n'a été créé pour ces contrôles. L'écran présente donc « Retrouver ma carte » et indique que les nouvelles adhésions sont suspendues. L'installation Wallet et la réception APNs sur un appareil réel restent à valider.

## Décisions conservées

Le journal d'exécution ci-dessous conserve les décisions prises pendant le travail, y compris les limites explicitement laissées aux tests réels.

- Ruling: retain general account email authentication outside loyalty — user instruction concerns joining loyalty; changing private delivery/address authentication would expand scope and access. Cost if wrong: user may later request a separate general account login change.
- Ruling: execution continues inline in this session under the existing feature/staging authorization — this implements the user's explicit correction; no new approval for a deployment already authorized.
- Ruling: existing cards can reopen while a programme is suspended, but new members are refused — preserves access to existing points. Cost if wrong: suspended programmes may prefer hiding card retrieval, not implemented.
- Ruling: the old email enrolment HTTP endpoint now returns LOYALTY_PHONE_REQUIRED after its table checks — enforces the explicit phone-only requirement on cached clients as well. Cost if wrong: an old cached enrolment screen needs a reload.
- Final: Ruling: phone access without OTP stands — explicit user decision; cost if wrong: a person knowing the number and holding a valid table QR can reopen the card.
- Final: Ruling: active signed table QR is the access boundary — physical-presence detection is outside scope; cost if wrong: a copied active QR also works.
- Final: Ruling: public HTTPS proxy behavior must be verified live before completion — source review cannot establish it; cost if wrong: secure cookies could fail or trust an incorrect forwarding header.
- Final: Ruling: actual Wallet installation and APNs reception remain physical iPhone tests — no simulated success claim; cost if wrong: device-specific problems may remain.
- Final: Ruling: recorded real disposable MySQL integration is accepted without a second independent database run — same migration/module code; cost if wrong: a test fixture may miss a real data shape.

Aucun point mineur différé.

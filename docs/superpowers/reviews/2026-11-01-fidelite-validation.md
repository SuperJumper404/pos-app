# Validation fidélité caisse, borne et Apple Wallet — 1 novembre 2026

Implémentation dans deux copies de travail isolées, sans modification des bases applicatives, déploiement, envoi SMS ou diffusion réelle de campagne. Les modifications terminal/impression déjà présentes ont été conservées dans des instantanés de référence séparés.

## Vérifications obtenues

- Frontend : `npm run test:loyalty`, `npm test`, `npm run lint` et `npm run build-local` réussis. Lint : 0 erreur, 162 avertissements. Build : avertissements de taille des bundles existants.
- Backend : `npm run test:loyalty`, `npm test`, `node test/checkout-contract.test.js`, `node test/stripe-terminal-kiosk-payments.test.js` (15 cas) et `node test/checkout-payment-authority.test.js` (2 cas) réussis.
- Les nouveaux tests couvrent normalisation/recherche cloisonnée et quota, numéros anciens et collisions, preuve table et consentement, transaction borne/cumul/dépense/replay/rollback, total nul et petit reste, variantes PNG/publication, signature OpenSSL réelle locale, audience figée et reprises de campagnes. La numérotation des campagnes conserve les entiers SQL longs sans arrondi JavaScript.
- Contrôle mécanique Impeccable : un avis sur le rayon de l'aperçu, corrigé vers la valeur 12 px du design existant.
- Contrôle navigateur : composants/pages réels Nuxt/Vuetify dans une route de démonstration temporaire, avec tous les transports remplacés par des données fictives. Administration desktop (quatre onglets), aperçu et import/recadrage du logo, brouillon de campagne avec un destinataire puis confirmation simulée ; caisse et borne (recherche téléphone, confirmation de 30 points pour 2 € de remise, total 10 € → 8 €), page personnelle avec habillage client à 390×844, adhésion puis carte/solde/QR/Wallet. La borne a été observée à 768×1024. Aucun paiement ni fournisseur réel dans ces essais d'écran. Les transactions et annulations sont vérifiées par les tests automatisés ; le parcours complet de navigation d'une commande borne reste à vérifier avec l'API locale.

## Limites explicites

- `node test/loyalty.integration.test.js` : **SKIP**, absence de `DELIVERY_TEST_DATABASE_URL` explicite et d'un MySQL 8 local jetable. Les scénarios SQL (migrations, lookup/backfill, réservations concurrentes, prix/TVA/rollback, checkout borne et retrait de consentement d'une audience figée) sont écrits mais leur exécution SQL réelle reste requise avant mise en service.
- Aucun certificat Apple de production ni iPhone utilisé. Le test de signature utilise un certificat local autosigné : il ne prouve ni la chaîne Apple, ni l'installation, ni APNs ou l'affichage d'une notification. Il faut configurer le Pass Type ID, les certificats, icônes, répertoire persistant et URL HTTPS puis réaliser ces essais. Wallet demande la confirmation du client pour ajouter la carte ; l'affichage des messages n'est pas garanti.
- Google Wallet conserve son fonctionnement précédent ; aucun nouvel essai fournisseur Google.

## Copies de travail et reprise

- Frontend : `C:/Users/kalag/.codex/worktrees/loyalty-wallet/pos-app`, après l'instantané `80b5bf0d2bec94d4f0a1e42056934a99b5c0cafc`.
- Backend : `C:/Users/kalag/.codex/worktrees/loyalty-wallet/express-pos`, après l'instantané `343fd64`.
- Ne transférer que les commits après ces références : les instantanés contiennent du travail préexistant. Le frontend est une copie de travail gérée par l'application ; le backend a été attaché manuellement comme voisin.

## Revue indépendante

Revue finale de l'ensemble des deux plages de commits prévue après ces vérifications. Les résultats et corrections seront consignés ici avant la remise.

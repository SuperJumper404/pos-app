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

Une revue indépendante de l'ensemble des deux plages de commits a trouvé trois problèmes, corrigés dans une seule passe avec des régressions observées en échec puis réussies :

1. Deux listes de champs autorisés perdaient la fidélité entre l'écran et le service TPE. Le nouveau test traverse le vrai store, le contrôleur HTTP, le service terminal et le checkout jusqu'au fournisseur simulé : 10 € bruts, 2 € de récompense, 8 € effectivement envoyés au terminal et 30 points réservés.
2. La confirmation ne protégeait que la remise. Elle transporte désormais le coût en points et la version du programme, liés à l'adhérent et à l'offre et inclus dans les signatures d'idempotence. Un changement administratif entre aperçu et paiement provoque un rollback et une nouvelle confirmation.
3. Les erreurs métier étaient converties en erreurs terminal génériques. Une liste explicite préserve seulement les codes fidélité connus et leurs statuts ; la borne efface la sélection périmée. Les exceptions inconnues restent génériques, sans détail privé.

Le test `test/loyalty-terminal-flow.test.js` nécessite les deux dépôts voisins et leurs dépendances locales. Il n'utilise ni serveur SQL ni réseau. Les suites générales, les suites fidélité, le lint et le build ont été relancés après la correction. Aucune remarque mineure différée et aucune seconde revue déléguée.

La revue a écarté explicitement les modifications terminal/impression des instantanés de référence et les nouvelles fonctions Google, hors périmètre. Les essais réels iPhone/APNs restent une étape de mise en service, sans validation présumée.

## Complément avant déploiement Docker staging

À la demande de l'utilisateur, les seuls commits de la feature ont été réintégrés sur les branches staging actuelles (frontend `98b66db`, backend `efe81e1`), en conservant les autres correctifs présents. Les branches `codex/loyalty-wallet-implementation` conservent les versions initiales de travail. Un conflit limité à la documentation a été résolu en conservant le plan et sa spécification.

Les suites générales et fidélité des deux dépôts passent après intégration ; le lint frontend reste à 0 erreur et 162 avertissements. La génération statique avec `ENV=staging` est réussie. Le contrôle local utilise un cache Nuxt isolé car `node_modules` est une jonction vers le checkout original ; cette adaptation de vérification ne modifie pas le produit.

**La validation MySQL n'est plus ignorée pour ce déploiement** : le test a été exécuté avec MySQL 8 dans Docker, dans une base jetable créée puis supprimée par le helper existant. Résultat PASS pour les migrations, recherche/remplissage des numéros, isolation des restaurants, réservations concurrentes, paiement/remboursement/rollback, remise borne/replay et audience figée/retrait de consentement.

Avant modification du staging, une sauvegarde privée de la base `pointofsalestaging`, des sources backend/frontend et de la configuration des conteneurs a été préparée. Le programme du restaurant `demo` reste à configurer par l'utilisateur, conformément à son choix. Aucun client ni programme de démonstration supplémentaire n'est créé, et aucune notification réelle n'est envoyée par le déploiement.

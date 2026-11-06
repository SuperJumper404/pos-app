# Clients et fidélité

L'administration utilise désormais `/clients` pour les contacts, les comptes, leurs achats et leur fidélité. L'ancien lien `/fidelite` ouvre le programme dans ce même espace. Le parcours personnel `/compte/fidelite` reste distinct.

L'onglet « Programme de fidélité » conserve les offres, l'éditeur de carte Wallet et les notifications. Depuis la fidélité d'une fiche client, « Préparer une notification » ouvre le message avec cette carte comme destinataire ; l'envoi demande toujours la confirmation existante.

## Données et compatibilité

La fiche `customers` existante reste la référence des comptes et des cartes. L'annuaire inclut les comptes sans commande et les contacts des archives, même avec un ancien numéro incomplet. Les identités vérifiées et le journal de points ne sont pas reconstruits.

Les achats sont affectés en priorité au client déjà indiqué sur la commande. Sinon, un téléphone valide correspondant à une identité vérifiée unique du restaurant permet leur regroupement dans l'annuaire. Les cas ambigus ne sont pas sélectionnés arbitrairement.

Ces rapprochements servent à la gestion du restaurant : ils n'accordent pas l'accès personnel aux commandes anciennes, ne réécrivent pas leurs montants et n'attribuent pas de points rétroactifs. Les cartes, QR, points et réservations existants sont conservés.

## Installation

Déployer ensemble les changements frontend et backend. L'annuaire reste consultable avant l'import : les anciens contacts disposent alors d'une référence d'historique stable.

Pour conserver les rapprochements et importer les fiches de contacts, appliquer avec la procédure habituelle du backend la migration `20261106120000_client_directory.sql`. Elle crée les tables de correspondance et de journal, sans modifier les archives, identités ou points.

L'administrateur peut ensuite utiliser « Rapprocher l’historique » dans la liste. Une simulation affiche les contacts à créer et les correspondances à rattacher avant confirmation. Les contacts sans numéro exploitable restent des contacts historiques ; ils ne deviennent pas des comptes de connexion.

Une opération déjà appliquée est réutilisable sans duplication. Les cas ambigus restent accessibles avec le filtre « À rapprocher » ; depuis la fiche, choisir le compte destinataire et utiliser « Rattacher à la fiche choisie ». Une fiche possédant déjà un compte vérifié, une carte, des adresses ou des commandes explicitement liées ne peut pas être fusionnée par cette action.

## Import en ligne de commande

Depuis le dépôt backend, sélectionner l'environnement de la même manière que pour les autres commandes du projet. La simulation est le mode par défaut :

```powershell
node scripts/reconcile-client-directory.js --shop-id 7
```

Après examen du résultat, appliquer le rapprochement pour ce restaurant :

```powershell
node scripts/reconcile-client-directory.js --shop-id 7 --apply
```

Ne pas sélectionner un restaurant ou un environnement par déduction. L'application des migrations et de l'import sur les données réelles n'est pas effectuée par les tests.

## Vérifications

Dans chacun des deux dépôts : `npm run test:clients`. Pour la migration et les transactions MySQL, utiliser une instance locale jetable explicitement désignée par `DELIVERY_TEST_DATABASE_URL`, puis exécuter depuis le backend `node test/client-directory.integration.test.js`. Le helper de test crée et supprime sa propre base et n'utilise jamais les identifiants de l'application.

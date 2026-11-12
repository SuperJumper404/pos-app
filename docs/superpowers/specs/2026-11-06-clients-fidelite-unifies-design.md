# Clients et fidélité : fiche commune et écran unique

Date : 6 novembre 2026.
Statut : conception relue et validée par l'utilisateur (« go »), le 6 novembre 2026.

## Demande et résultat attendu

Réunir la logique Clients, les comptes clients et leurs cartes de fidélité dans un modèle métier commun. Fusionner les pages administratives `/clients` et `/fidelite` pour consulter et gérer un client depuis un seul endroit.

La fiche client réunit son identité, ses coordonnées, ses achats et, lorsqu'il est adhérent, sa carte et ses points. Les contacts historiques restent consultables même sans compte connecté ni adhésion. Un compte sans commande reste également visible.

Cette demande ne crée pas d'adhésion automatique et ne change pas les règles de gain, de réservation ou de dépense des points.

## Constat dans le code

- `pages/clients.vue` reconstruit actuellement les clients depuis les archives, regroupées par téléphone par `helpers/clients.js`. Ce regroupement ne consulte ni `customers` ni les cartes. Il accepte aussi des anciens numéros incomplets, visibles dans la capture fournie.
- `pages/fidelite.vue` présente le programme, ses récompenses et la liste des adhérents, avec une fenêtre de mouvements et de correction de points.
- Le backend possède déjà `customers`, les identités vérifiées et les comptes globaux. `loyalty_members.customer_id` référence `customers.id`, avec une seule adhésion par client et restaurant. Il existe donc déjà un lien de données à conserver.
- Les commandes et archives peuvent déjà posséder `customer_account_id`. Les achats anciens sans ce lien n'identifient pas un compte authentifié.
- L'authentification distingue explicitement les identités vérifiées des téléphones libres des commandes ou fiches créées par le personnel.
- La liste actuelle des adhérents est plafonnée à 250 ; la recherche des profils de livraison à 50. Ces listes ne suffisent pas à construire un annuaire complet en les assemblant dans le navigateur.

## Approche retenue dans cette proposition

Étendre la fiche `customers` existante et servir une représentation commune du client depuis le backend. Conserver la carte, le journal des points et les réservations comme des données liées à cette fiche. Un modèle métier unique ne nécessite pas de mettre toutes les données dans une seule table SQL.

C'est l'approche qui répond à la demande en préservant les comptes, les cartes Wallet et les soldes. Un simple regroupement des deux écrans laisserait les identités et statistiques séparées ; créer un autre système de comptes ou déplacer les points ferait doublon avec les relations déjà en place. Ces deux solutions ne répondent pas au besoin de continuité.

Le choix des noms précis des nouvelles tables de correspondance, des DTO et des fonctions revient au constructeur. Les responsabilités et règles ci-dessous sont à conserver.

## Modèle métier commun

La référence d'une fiche est le couple restaurant et identifiant client existant, conservé sous forme de chaîne pour les grands identifiants SQL.

Une fiche expose :

- Identité : nom principal, autres noms utilisés dans les commandes, téléphone et email affichables.
- Compte : présence d'un compte vérifié, sans exposer ses sessions, codes ou identifiants globaux aux listes.
- Achats : nombre de commandes archivées visibles, total dépensé, panier moyen, première commande et dernière visite.
- Fidélité facultative : identifiant de l'adhésion existante, numéro de carte s'il existe, solde total, points réservés et disponibles.
- Origine et rapprochement : contact historique, profil existant ou compte vérifié, et éventuel rapprochement à examiner.

Conserver les identifiants des cartes, QR, écritures de points, passes Wallet, adresses et références des commandes. Les soldes restent propres à chaque restaurant. Une fiche sans adhésion a une fidélité absente, distincte d'un adhérent avec zéro point.

## Historique et rapprochement

Règle choisie par l'utilisateur le 6 novembre 2026 : rattacher automatiquement les achats historiques uniquement lorsqu'un téléphone valide, normalisé avec les outils existants, correspond à une identité vérifiée unique du même restaurant. Les rapprochements ambigus restent à confirmer.

Ordre de résolution :

1. Utiliser le client explicitement rattaché à la commande lorsque `customer_account_id` est renseigné.
2. Pour un achat non rattaché, chercher une correspondance exacte avec une identité téléphonique vérifiée du restaurant, après normalisation complète. Ne pas comparer seulement les derniers chiffres.
3. Sans correspondance, conserver le contact historique dans le même annuaire, sous forme de fiche de contact non vérifiée. Importer les groupes déjà visibles dans `/clients`, y compris leurs anciens numéros incomplets. Ne pas regrouper entre elles les commandes anonymes sans téléphone.
4. En cas de conflit entre plusieurs fiches ou d'informations déjà rattachées à des comptes différents, proposer un rapprochement explicite. Un nom similaire ne suffit jamais.

Préparer un import et une réconciliation idempotents, avec un mode de simulation et des correspondances traçables. Les fiches de contact créées par cet import peuvent être rapprochées d'un compte vérifié ; les profils existants avec des adresses ou d'autres données ne sont pas fusionnés arbitrairement sur un champ téléphone libre.

Les anciennes références restent résolubles si une fiche importée devient un alias d'un compte existant. Pour une identité vérifiée créée après l'import, le même rapprochement doit pouvoir être rejoué sans produire de doublon. Il reste indépendant de la réussite de la connexion personnelle.

Décision de cadrage de l'agent après relecture : l'action de rapprochement explicite concerne uniquement un contact importé sans identité vérifiée, sans carte et sans adresses personnelles. Elle rattache ses associations de gestion à une fiche existante et conserve une correspondance traçable. Elle ne fusionne pas deux comptes existants, deux adhésions ou leurs soldes et ne remplace pas le propriétaire explicite d'une commande. Si plusieurs comptes ou cartes sont en conflit, les signaler et conserver leurs données séparées ; une fusion de comptes serait un autre besoin à définir.

Les associations déduites du téléphone servent à la gestion et aux statistiques du restaurant. Elles ne prouvent pas à elles seules la propriété personnelle des anciennes commandes : ne pas réécrire leur `customer_account_id` et ne pas les rendre automatiquement accessibles dans un compte personnel. Conserver une correspondance de gestion distincte quand nécessaire.

Ne modifier ni les montants ni les instantanés financiers des archives. Ne pas attribuer rétroactivement de points pour les achats rapprochés. Les statistiques restent fondées sur les commandes archivées visibles, comme aujourd'hui, avec une commande comptée une seule fois et les règles existantes de montants conservées.

## Écran administratif fusionné

Conserver `/clients` comme adresse principale et afficher le titre « Clients et fidélité ». Une seule entrée de navigation ouvre cet espace. `/fidelite` redirige vers la partie programme de cet espace afin de conserver les anciens liens. La page personnelle `/compte/fidelite` reste un parcours distinct du client final.

L'espace commun contient :

- Une liste Clients qui réunit les contacts historiques, profils et comptes, avec leurs informations d'achat et leur état de fidélité. Afficher aussi les adhérents sans commande.
- Une recherche par nom, téléphone, email et numéro de carte disponible ; des filtres pour les adhérents, non-adhérents et contacts à rapprocher ; une pagination serveur et un export CSV cohérent avec les données consultables.
- Une fiche détaillée ouverte depuis la liste : coordonnées, achats et statistiques, carte, points et mouvements. La correction motivée de points reprend le mécanisme existant et ses restrictions.
- Une partie « Programme de fidélité » dans le même espace, réservée aux administrateurs, reprenant activation, règles de points, récompenses, exclusions et apparence actuellement disponibles.

Conserver les informations utiles de la page Clients actuelle : indicateurs, recherche, export, autres noms employés et dernières visites. Leur disposition précise est à concevoir dans les composants Vuetify existants ; ne pas ajouter de nouveaux indicateurs commerciaux ou fonctionnalités Wallet sans demande.

Sous mobile, permettre la consultation de la liste et de la fiche sans imposer la largeur complète d'un tableau de bureau. Réutiliser les couleurs, espacements, typographie et composants du projet.

## API, état et autorisations

Créer une API administrative d'annuaire et de détail qui retourne ce modèle commun, avec pagination, recherche et filtres côté serveur. Les agrégats sont calculés sur l'ensemble autorisé et non seulement sur la page courante.

Les écritures de fidélité continuent de passer par les services transactionnels existants. La lecture d'une fiche ne crée ni adhésion ni compte personnel et ne réserve aucun point. Les routes et services d'adresses et de connexion existants continuent de fonctionner avec les mêmes identifiants.

Isoler l'état de l'annuaire staff de `store/customer.js`, qui contient la session personnelle. Réutiliser les actions de fidélité existantes pour les opérations sur le programme et les mouvements. Ignorer les réponses périmées après changement de restaurant, d'utilisateur ou de fiche sélectionnée.

Conserver les droits actuels de consultation Clients/Historique. La consultation des données de fidélité, les corrections et le réglage du programme respectent les droits administratifs existants ; leur présence sur une page commune ne les accorde pas à d'autres rôles. L'API applique ces restrictions, pas seulement l'affichage. Si un utilisateur peut consulter les achats sans administrer la fidélité, la réponse et l'écran omettent les données ou actions qui lui sont interdites.

Les sessions borne, table et comptes personnels n'accèdent pas à l'annuaire du restaurant. Chaque requête et chaque correspondance sont limitées au restaurant déterminé par la session autorisée.

## Compatibilité et limites du chantier

Conserver Nuxt 2, Vue 2, Vuetify, Vuex, Axios et Express/MySQL, sans nouvelle dépendance tant que l'existant suffit. Préserver les changements locaux des tâches QR, tickets carte et livraisons.

La fusion remplace l'organisation administrative séparée Clients/Fidélité évoquée dans l'ancien cadrage du 1 novembre. Les parcours de caisse, borne et client personnel ainsi que les règles actuelles d'adhésion et de paiement ne sont pas étendus par ce chantier. Les fonctionnalités Wallet envisagées dans cet ancien document mais non encore réalisées ne deviennent pas des exigences de cette fusion.

Préparer les éventuelles migrations et l'import avec des contrôles de volumes et de doublons ; leur exécution sur les données réelles relève d'une étape distincte de la préparation du code et de sa validation locale.

## Validation attendue

- Un compte avec carte et achats apparaît une seule fois, avec son solde inchangé et les bonnes statistiques.
- Un compte sans achat, un profil sans carte et un ancien numéro incomplet restent consultables dans les cas appropriés.
- Les variantes valides d'un téléphone sont normalisées ; les numéros ambigus ou les seuls noms ne fusionnent pas des comptes.
- Les achats explicitement liés sont prioritaires ; les associations de gestion ne modifient ni les archives financières ni l'accès personnel aux commandes.
- Une réexécution de l'import, un premier compte vérifié après import et des requêtes concurrentes ne produisent ni doublon ni double comptage.
- Le journal, les points réservés, les corrections motivées, les offres et les identifiants Wallet existants sont préservés.
- Les recherches, filtres, compteurs, pagination et CSV correspondent à l'ensemble autorisé.
- Les refus d'accès, changements de restaurant et réponses tardives n'exposent pas les données d'un autre contexte.
- Les anciens liens `/fidelite` fonctionnent et il ne reste qu'un espace administratif principal.
- Vérifier les parcours sur ordinateur et mobile, puis les tests pertinents des deux dépôts et le lint du frontend.

## Validation

- Fiche commune et espace administratif unique : validés par l'utilisateur.
- Rapprochement historique : automatique pour les correspondances téléphoniques valides et uniques ; confirmation des cas ambigus.

# Fiche client à la saisie du téléphone

Date : 9 novembre 2026. Statut : approuvé par « Valider et réaliser ».

## Demande et décisions confirmées

Depuis le menu caisse et le panier d'un QR de table, un téléphone valide doit retrouver la fiche du restaurant ou la créer immédiatement. La commande doit garder ce rattachement. Son détail doit montrer les informations du client et ses points ; le menu caisse montre uniquement le nombre de points. L'entrée latérale « Fidélité » disparaît, tandis que « Clients et fidélité » et l'ancien lien de redirection restent disponibles.

Décision explicite : un nouveau téléphone crée **une fiche client seule**, sans carte de fidélité automatique. Si une carte existe, ses points sont retrouvés. Le programme, les cartes, Wallet et les notifications restent en place. La demande de déploiement Docker frontend/backend en production précède cette évolution ; la publication intervient après sa validation et ses contrôles.

## Approche

Réutiliser `customers` et les cartes existantes, avec une seule résolution de téléphone côté serveur partagée entre la caisse, le QR et la création des commandes. Cette approche prolonge le modèle unifié déjà livré. Une liste de contacts distincte recréerait la séparation que l'utilisateur a demandé de supprimer. La création automatique d'une carte est écartée par sa réponse.

La recherche immédiate et la résolution définitive lors de l'enregistrement de la commande ont des fonctions complémentaires : la première affiche le résultat sans bouton de recherche ; la seconde garantit le bon rattachement même si la réponse visuelle tarde ou si le client change le numéro juste avant de valider.

## Résolution et conservation des données

- Normaliser et valider avec les helpers existants et `libphonenumber-js`, pays FR par défaut et indicatif international accepté. Une saisie partielle ou invalide ne crée rien. Les anciens téléphones incomplets de l'historique restent conservés.
- Rechercher dans le restaurant courant : liens de rapprochement canoniques existants, téléphone des fiches, identités vérifiées locales/globales et téléphone des cartes. Dédupliquer les candidats par fiche et respecter les correspondances manuelles déjà confirmées.
- Un candidat unique est réutilisé. Aucun candidat : créer une fiche avec le téléphone normalisé. Plusieurs candidats incompatibles : signaler le rapprochement nécessaire, sans choix arbitraire ni nouvelle fiche supplémentaire. La commande peut rester un contact non rapproché, selon les possibilités de commande en invité existantes.
- Sérialiser les créations par restaurant dans la transaction existante pour éviter deux fiches en cas de saisies simultanées. Réutiliser les correspondances persistantes de l'annuaire ; une migration additive peut étendre leur origine de rapprochement pour les saisies de téléphone.
- Ne pas modifier le nom, l'e-mail, les identités vérifiées, les cartes ou les points d'une fiche existante depuis une simple saisie. En caisse, le nom retrouvé peut compléter un champ encore vide ; un nom déjà saisi reste celui de la commande. Une nouvelle fiche peut rester sans nom tant qu'il n'a pas été renseigné.
- La création d'une fiche ne vaut ni adhésion fidélité, ni consentement marketing, ni authentification d'un compte personnel. Les parcours d'adhésion explicite et de connexion existants restent disponibles. Leur inscription par téléphone doit réutiliser une fiche compatible au lieu d'en créer une deuxième.

## Commandes, fidélité et droits

Le lien issu d'un téléphone saisi est un rattachement de gestion. Il doit rester distinct de `customer_account_id`, qui sert déjà à l'accès personnel authentifié. Ajouter un identifiant interne de fiche, par exemple `customer_profile_id`, nullable sur les commandes et archives, référant au même `customers` ; conserver l'identifiant authentifié existant. Un client reconnu par téléphone ne gagne pas l'accès aux anciennes commandes, aux adresses ou à un compte global.

Le serveur résout le téléphone dans les parcours caisse/table QR autorisés lors de la création de commande ; aucun identifiant de fiche fourni librement par le navigateur ne fait autorité. La résolution doit pouvoir réutiliser la transaction de checkout. Une répétition idempotente retrouve la commande et son rattachement d'origine avant toute création supplémentaire. La valeur de téléphone et les éventuels contextes existants restent dans la signature du checkout.

Pour une carte déjà existante, le rattachement peut préparer l'accumulation de points par les hooks de paiement déjà présents. Les points ne sont crédités qu'après paiement confirmé. Dépenser une récompense conserve toutes les confirmations, réservations et vérifications existantes. Sans carte, aucun solde ni journal de fidélité n'est créé. Si le programme est suspendu, la fiche peut quand même être créée et le solde existant consulté ; l'attribution suit les règles existantes.

Limiter cette évolution au menu caisse et aux QR de table. Préserver la distinction actuelle des bornes, des sessions OTP, des commandes de livraison et des paiements déjà commencés. Un contexte authentifié incompatible avec le téléphone ne doit jamais être remplacé silencieusement. Les règles exactes de refus ou de conservation de contexte sont à préciser dans le plan à partir des contrats existants, sans étendre les droits.

Une route POST de résolution partage le service et produit deux réponses :

- Staff autorisé du restaurant : résumé de fiche (nom, téléphone, e-mail) et solde utile de la carte éventuelle.
- QR de table valide : résultat minimal et points disponibles, sans révéler l'e-mail, les adresses, le QR de carte, l'historique ni les informations privées d'un compte. Réutiliser les contrôles de table, d'origine et de quota.

Aucune session personnelle ni nouvelle session de fidélité n'est délivrée par cette résolution. Le rattachement au checkout se refait côté serveur à partir du téléphone ; il n'exige pas de nouveau jeton de connexion. Les actions volontaires de fidélité continuent d'utiliser leur transport et leurs protections propres.

## Interface

- Déclencher la résolution après une courte pause sur un numéro complet. Utiliser un résultat lié au téléphone courant, au restaurant, à l'utilisateur et à la génération de requête.
- À chaque changement de téléphone, effacer immédiatement le précédent résultat. Invalider également toute fidélité/récompense issue du numéro précédent avant la prochaine validation ; ne jamais récupérer un ancien résultat arrivé tardivement.
- Menu caisse : une ligne discrète « X points disponibles » près du téléphone, sans ajouter un panneau de fidélité ni une seconde saisie. Une fiche sans carte affiche 0 point ; les détails distinguent explicitement l'absence de carte.
- Panier QR : exploiter le téléphone déjà saisi, afficher les points retrouvés et conserver les actions volontaires de récompense/adhésion. Le lookup de fiche seul ne crée pas de carte.
- Détail de commande interne : afficher le nom, le téléphone, l'e-mail disponible, la carte éventuelle et les points actuels (solde/réservés/disponibles si utile), y compris pour une commande payée. Les contrôles de dépense restent réservés aux commandes et rôles éligibles.
- Enrichir seulement le DTO de détail destiné au staff et strictement dans son restaurant. Ne pas enrichir les réponses publiques par token, les réponses QR ou un détail provenant d'un autre restaurant.
- Retirer « Fidélité » des entrées principales avec le mécanisme existant de navigation masquée. Conserver `/fidelite` vers `/clients?tab=programme`. Appliquer aussi la règle AGENTS existante : Catégories, Étapes produits et Stock restent absents du menu principal et de l'accueil, même si un ancien test attend encore Stock visible.
- Respecter les composants Vuetify, les styles et le français actuels ; pas de nouvelle dépendance ni de refonte de l'écran.

## Validation et publication

Tests métier et MySQL : numéros FR/internationaux équivalents, fiche sans carte, membre existant, programme suspendu, anciens contacts importés, ambiguïtés, reprises et créations concurrentes, isolation entre restaurants, absence de création de carte/points/identité vérifiée lors d'une résolution.

Tests de parcours : saisie/effacement/changement rapide du numéro, réponse tardive après changement de restaurant, caisse avec puis sans carte, QR avec ancien contexte de fidélité, checkout pay-before/pay-later et Stripe/TPE, répétition après réponse perdue, rattachement conservé en archive, affichage interne après paiement et absence d'informations privées dans les réponses publiques.

Vérifier les suites pertinentes, le lint frontend et la génération Docker, puis un contrôle visuel groupé ordinateur/mobile. Revue indépendante avant publication. Tester les migrations sur une base jetable et sauvegarder les données de la cible avant application. Publier ensemble frontend et backend avec les workflows Docker existants, vérifier d'abord staging, puis la production demandée, les migrations, la disponibilité des API et le maintien de Wallet. Ne jamais exécuter un import historique en masse par déduction.

## Choix laissés au plan d'implémentation

Nom exact des méthodes, route et nouveau champ interne ; réutilisation précise des liens canoniques ; durée du debounce ; présentation des états de chargement/ambiguïté ; découpage des tests et migrations ; ordre des petites modifications. Ces choix doivent préserver les comportements et les limites décrits ci-dessus.

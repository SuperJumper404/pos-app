# Carte Apple Wallet : récompense et progression

## Demande et choix validé

Le 12 novembre 2026, l'utilisateur demande de supprimer « Prochain palier »,
garder « Récompense » et ajouter une barre de progression. Il choisit la barre
graphique intégrée à la bannière en conservant l'image du restaurant.

## Format

- Points dans l'en-tête natif, à côté de l'identité du programme : la bannière
  reste dégagée et la jauge ne chevauche aucun texte natif.
- Bannière du restaurant conservée ; jauge discrète dans ses 32 derniers points
  de hauteur, avec contraste garanti par un fond sombre translucide.
- Une seule zone « RÉCOMPENSE » sous la bannière : nom de l'objectif et
  progression chiffrée, par exemple « Dessert offert — 20 / 30 points ».
- Retrait de « PROCHAIN PALIER ». Le numéro reste sous le QR existant, sans
  répétition dans une zone « CARTE » ; identifiant, jeton, QR et numéro inchangés.
- L'offre déjà utilisable reste consultable au verso, ainsi que le lien vers
  les offres et les conditions.

## Progression (choix d'implémentation)

Le compteur utilise les points disponibles, donc le solde moins les points
réservés. L'objectif est la récompense active au plus petit seuil strictement
supérieur à ce compteur. Si toutes les récompenses sont atteintes, l'objectif
est le plus grand seuil et la barre reste pleine. Le compteur de progression
est plafonné au seuil ; le solde réel reste visible dans l'en-tête.

Les récompenses expirées ou les seuils non entiers/positifs sont ignorés.
Sans récompense active, aucune jauge trompeuse : la bannière reste inchangée et
le texte d'information existant est conservé. L'utilisation ou l'acquisition
de points modifie la prochaine génération de la même carte ; aucune règle de
calcul, réservation ou remboursement ne change.

## Approches

1. Indicateur texte dans un champ natif : simple, mais ne produit pas une vraie
   barre graphique et encombre les champs.
2. Barre graphique dans les PNG de bannière : choix de l'utilisateur ; conserve
   le visuel et les couleurs propres au restaurant, compatible avec le format
   `storeCard` imposé par Apple.

Le serveur compose les variantes 375×144, 750×288 et 1125×432 à chaque signature
à partir des images originales, sans modifier les fichiers publiés. Sans image,
il génère un fond de la couleur configurée. `pngjs` 7.0.0, pur JavaScript et sans
dépendance transitive, évite un décodeur PNG artisanal ou des binaires natifs.
Les images sont bornées avant décodage.

L'aperçu administrateur reprend cette composition avec un solde illustratif
calculé depuis une récompense réellement configurée, clairement identifié comme
exemple. Sans récompense, il explique pourquoi la jauge n'apparaît pas.

## Limites et protection des données

Google Wallet et les règles métier restent inchangés. Aucun client, point,
récompense ou campagne de test n'est créé. Aucun envoi APNs/SMS ni actualisation
massive de cartes. Les cartes existantes recevront le format lors de leur
prochaine récupération normale ; leurs identifiants sont conservés.
Apple contrôle le rendu final sur iPhone/Watch : l'aperçu web reste indicatif.

## Validation

Tests des seuils, réservations, expirations, objectifs atteints/absents ; pixels
préservés hors du pied de bannière, progression vide/intermédiaire/pleine,
variantes PNG et bornes ; manifeste/signature réels avec identifiants stables ;
aperçu accessible et cas vide. Revue globale avant intégration et déploiement
Docker, avec contrôles isolés sans écriture SQL ni notification.

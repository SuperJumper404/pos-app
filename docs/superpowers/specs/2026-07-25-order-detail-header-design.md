# En-tête du détail d'une commande

## Objectif

Déplacer les informations répétées de chaque produit vers un en-tête unique afin de libérer davantage d'espace pour les choix et personnalisations.

## Garantie fonctionnelle

La route `GET /detailorder/:id` filtre les données avec `WHERE orders.id = ?`. Toutes les lignes affichées par `pages/orders/detail/_id.vue` appartiennent donc à une seule commande, un seul numéro et un seul client.

Lorsque plusieurs personnes commandent à la même table, chacune possède une commande distincte. L'écran de suivi mobile liste ces commandes séparément et chaque lien de détail ouvre un seul identifiant de commande. Le client reste ainsi identifiable dans l'en-tête sans devoir être répété sur chaque produit.

## En-tête

Ajouter en haut de la carte principale un en-tête compact contenant :

- le numéro de commande ;
- le nom du client ;
- le statut de paiement avec sa couleur existante ;
- le mode de service, toujours explicite : « À emporter » ou « Sur place ».

Sur écran large, les informations tiennent sur une ligne avec retour à la ligne naturel si nécessaire. Sur mobile, elles se répartissent sur deux lignes sans débordement.

## Mode de service

Faire évoluer le composant actuel `TakeawayChip.vue` pour qu'il puisse afficher « Sur place » lorsque `is_takeaway` est faux, uniquement quand le consommateur le demande. Les autres listes conservent leur comportement actuel : aucune chip n'est affichée pour une commande sur place.

Le détail de commande active ce mode explicite afin que l'une des deux valeurs soit toujours visible dans son en-tête.

## Lignes de produit

Supprimer de chaque ligne :

- le numéro de commande ;
- le nom du client.

Chaque ligne conserve uniquement l'image, le nom, le prix, les groupes de choix et la quantité. La grille desktop passe de trois zones de contenu à deux zones principales : produit et personnalisations. Sur mobile, les personnalisations occupent toute la largeur sous le produit.

## Données manquantes

Si une ancienne réponse ne contient pas de client ou de numéro, afficher `—` dans l'en-tête. Le chargement, l'erreur de récupération et les actions existantes ne changent pas.

## Validation

- Test du mode explicite « Sur place » de `TakeawayChip`.
- Test du header alimenté par `orderSummary`.
- Test de l'absence des métadonnées répétées dans les lignes.
- Suite frontend complète, ESLint ciblé et build Nuxt.

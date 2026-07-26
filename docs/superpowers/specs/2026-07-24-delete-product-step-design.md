# Suppression définitive d’une étape produit

## Objectif

Permettre à un administrateur de supprimer définitivement une étape de personnalisation depuis la page « Étapes produits », même lorsqu’elle est utilisée par un ou plusieurs produits, sans altérer les commandes historiques.

## Comportement utilisateur

L’action existante « Désactiver » reste disponible et continue de rendre une étape inactive et réactivable.

Une nouvelle action « Supprimer définitivement » est affichée pour l’étape sélectionnée. Elle ouvre une confirmation qui :

- nomme l’étape concernée ;
- affiche le nombre et la liste des produits qui l’utilisent ;
- indique que l’étape sera retirée de ces produits ;
- précise que l’action est irréversible ;
- bloque les doubles validations pendant la requête.

Après une suppression réussie, la bibliothèque est rechargée et la première étape restante est sélectionnée. Si aucune étape ne reste, l’état vide existant est affiché.

## Architecture frontend

La page `pages/customizations/index.vue` gère un dialogue de suppression distinct du dialogue de désactivation. Elle conserve explicitement l’identifiant de l’étape ciblée afin qu’un changement de sélection pendant l’ouverture du dialogue ne puisse pas supprimer une autre étape.

L’action Vuex `customizations/deleteStep` continue d’appeler `DELETE /baseurl/api/v1/customization-steps/:id`, recharge les étapes après succès et affiche la notification retournée par l’API. En cas d’erreur, le dialogue reste ouvert afin de permettre une nouvelle tentative ou une annulation.

## Architecture backend

La route `DELETE /customization-steps/:id` devient une suppression réelle et atomique. Le module vérifie que l’étape appartient à la boutique, puis exécute dans une transaction, dans cet ordre :

1. récupérer les fichiers image des choix simples liés à l’étape ;
2. supprimer les associations `product_customization_step_choices` ;
3. supprimer les associations `product_customization_steps` ;
4. supprimer les choix `customization_step_choices` ;
5. supprimer l’étape `customization_steps`.

Les snapshots de commande et d’archive ne sont pas modifiés : ils contiennent déjà les libellés, positions et prix historiques et ne possèdent pas de clé étrangère vers les tables supprimées.

Le contrôleur supprime les fichiers image après validation de la transaction, en mode best effort. Une erreur de fichier est journalisée sans annuler une suppression SQL déjà validée.

## Erreurs et sécurité

- Seul un administrateur authentifié peut utiliser la route existante.
- Une étape inexistante ou appartenant à une autre boutique retourne `404 CUSTOMIZATION_STEP_NOT_FOUND` sans suppression partielle.
- Toute erreur SQL annule la transaction.
- La réponse de succès indique « Étape de personnalisation supprimée. ».
- Le frontend empêche une seconde soumission tant que la première est en cours.

## Tests

Les tests backend vérifient la propriété de l’étape, l’ordre des suppressions, la transaction, la suppression des associations et le maintien des snapshots historiques. Les tests du contrôleur vérifient le nouveau message et le nettoyage best effort des images.

Les tests frontend vérifient la présence de l’action, le dialogue séparé, la liste des produits impactés, la conservation de la cible pendant l’opération, la fermeture après succès et le maintien du dialogue après échec.

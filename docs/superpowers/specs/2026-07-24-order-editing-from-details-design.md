# Modification d'une commande depuis ses détails

Date : 2026-07-24

## Résumé

Une commande active peut être rouverte depuis la page **Détails**, chargée dans le parcours catalogue/panier existant, puis enregistrée sans changer son identifiant ni son numéro. L'utilisateur peut ajouter ou supprimer des produits, modifier les quantités et reconfigurer les suppléments.

La modification est autorisée uniquement tant que la commande est au statut **En attente** (`status = 1`) et que son paiement n'est pas encaissé. Le serveur reste l'autorité : il revérifie l'éligibilité au moment de l'enregistrement, recalcule les prix, valide les personnalisations et ajuste les stocks dans une transaction unique.

## Contexte existant

Le frontend Nuxt 2 possède déjà :

- une page de détail active dans `pages/orders/detail/_id.vue` ;
- un catalogue dans `pages/menus.vue` ;
- un panier dans `pages/cart.vue` ;
- un assistant de personnalisation réutilisable ;
- des helpers capables de fusionner, séparer et remplacer des lignes configurées ;
- un checkout transactionnel qui valide les prix, les choix et les stocks côté serveur.

La page de détail est actuellement en lecture seule. L'action `PATCH /orders/:id` existante ne modifie que le statut de la commande et ne doit pas être étendue pour accepter du contenu de panier. Les lignes de commande et leurs instantanés de personnalisation doivent être remplacés par une opération métier dédiée.

## Décisions validées

1. Le point d'entrée utilisateur reste la page **Détails**.
2. Le bouton **Modifier la commande** ouvre le parcours catalogue/panier existant en mode modification.
3. La commande conserve son identifiant et son numéro.
4. Les champs client, table, téléphone, note, moyen de paiement et statut ne sont pas modifiables dans ce parcours.
5. Les produits, suppressions, quantités et suppléments sont modifiables.
6. Une commande devient non modifiable dès qu'elle est encaissée ou qu'elle quitte le statut **En attente**.
7. Une commande Stripe non encore payée reste modifiable ; son ancien PaymentIntent est annulé et un nouveau paiement est généré pour le montant actualisé.
8. Le serveur recalcule tous les prix et applique seulement la différence de stock entre l'ancien et le nouveau contenu.

## Objectifs

- Réutiliser le catalogue, le panier et l'assistant de suppléments existants.
- Empêcher toute modification après encaissement ou début de préparation.
- Éviter la création d'une nouvelle commande lors de l'enregistrement.
- Préserver la cohérence entre `orders`, `orderdetail`, les instantanés, les réservations, les mouvements et le stock des produits liés.
- Gérer correctement les courses avec un encaissement, un passage en préparation ou une deuxième modification concurrente.
- Conserver la commande originale intacte jusqu'à la validation finale.

## Hors périmètre

- Modifier le client, la table, le téléphone, la note ou le moyen de paiement.
- Modifier une commande en préparation, terminée, annulée, archivée, remboursée ou encaissée.
- Réutiliser l'endpoint de changement de statut pour modifier les lignes.
- Modifier une archive ou réécrire son historique.
- Autoriser un panier vide ; l'annulation de commande reste une action séparée.

## Règle d'éligibilité

Une commande est modifiable lorsque les deux conditions suivantes sont vraies au moment de la lecture **et** au moment de l'écriture :

- `status = 1` ;
- `payment_status` appartient à `unpaid` ou `requires_payment`.

Le frontend utilise cette règle seulement pour présenter l'interface. Le backend verrouille la commande et impose la règle. Les états `paid`, `refunded`, `canceled` et tout autre état terminal sont refusés.

Un refus métier utilise le code stable `ORDER_NOT_EDITABLE` et fournit le statut courant afin que le frontend recharge les détails.

## Parcours utilisateur

### Démarrage

La page Détails affiche **Modifier la commande** uniquement lorsque la commande semble éligible. Au clic :

1. le frontend demande la représentation éditable de la commande ;
2. le backend revérifie la boutique, l'état et le paiement ;
3. la réponse est transformée en lignes compatibles avec le panier existant ;
4. une session `orderEdit` est créée ;
5. l'utilisateur est envoyé vers le catalogue avec le panier prérempli.

Si un panier local ou une tentative de checkout non résolue existe déjà, le frontend demande confirmation avant de le remplacer. Une tentative Stripe incertaine ne peut pas être effacée silencieusement : elle doit d'abord être résolue ou annulée par le mécanisme existant.

### Catalogue et panier

Un bandeau persistant indique `Modification de la commande #<numéro>` sur le catalogue et le panier. Le catalogue permet d'ajouter des produits avec le même assistant que lors d'une nouvelle commande.

Dans le panier, l'utilisateur peut :

- augmenter ou diminuer une quantité ;
- supprimer une ligne ;
- rouvrir l'assistant d'une ligne personnalisable ;
- remplacer les suppléments ;
- revenir au catalogue pour ajouter un produit.

Le bouton principal devient **Enregistrer les modifications**. Le checkout standard et la création d'une nouvelle commande sont désactivés tant que `orderEdit` est actif.

### Annulation et navigation

**Annuler la modification** efface la session locale et revient aux détails sans requête d'écriture. Quitter une session contenant des changements affiche une confirmation. La session peut être persistée avec l'état Vuex existant afin de survivre à un rechargement, mais elle est toujours revalidée par le serveur avant enregistrement et supprimée à la déconnexion.

### Succès

Après un enregistrement non-Stripe, le panier et la session d'édition sont vidés, puis les Détails actualisés sont affichés.

Pour Stripe, le frontend affiche le nouveau QR et le nouveau montant lorsque la régénération réussit. L'utilisateur peut ensuite revenir aux Détails. Si la commande a bien été modifiée mais que Stripe n'a pas pu générer le nouveau paiement, l'interface le dit explicitement et propose **Régénérer le paiement** ; elle ne prétend pas que l'ensemble de l'opération a échoué.

## État frontend

Un module Vuex dédié `orderEdit` sépare l'édition d'une commande de la création d'une commande. Il contient au minimum :

- `orderId` ;
- `orderNumber` ;
- `contentRevision` ;
- `originalCart` ;
- `dirty` ;
- `paymentProvider` et `paymentStatus` ;
- l'état de chargement et les erreurs d'enregistrement.

Le panier continue de contenir les lignes affichées et d'utiliser les helpers de personnalisation existants. Le module `orderEdit` contrôle le mode, la révision concurrente, l'annulation et la destination après succès.

La transformation d'une réponse d'édition en ligne de panier est centralisée dans un helper pur et testable. Elle ne doit pas être dupliquée entre la page Détails, le catalogue et le panier.

## Contrat de lecture éditable

### Endpoint

`GET /api/v1/orders/:id/edit`

La route est authentifiée et limitée à `req.shopid`. Elle ne retourne jamais une commande appartenant à une autre boutique.

### Réponse

La réponse contient une représentation normalisée, par exemple :

```json
{
  "order_id": 123,
  "order_number": "0042",
  "status": 1,
  "payment_status": "unpaid",
  "payment_provider": null,
  "total": 24.5,
  "content_revision": "sha256-opaque",
  "items": [
    {
      "order_detail_id": 456,
      "product_id": 10,
      "name": "Menu burger",
      "image": "burger.jpg",
      "quantity": 2,
      "unit_price": 12.25,
      "line_total": 24.5,
      "selected_product_step_choice_ids": [81, 94],
      "customization_snapshots": [],
      "requires_reconfiguration": false
    }
  ]
}
```

Les identifiants exposés pour les choix sont les identifiants contextuels `product_customization_step_choice_id`, identiques à ceux attendus par le checkout V2. Les instantanés restent présents pour l'affichage historique.

Une ligne héritée dont un choix ne peut plus être relié au catalogue reçoit `requires_reconfiguration: true`. Elle reste lisible, mais le frontend exige de rouvrir l'assistant ou de supprimer la ligne avant d'autoriser l'enregistrement.

La révision est un hash opaque et déterministe du contenu ordonné de la commande. Elle évite une migration de version et permet de détecter deux éditeurs concurrents.

## Contrat d'enregistrement

### Endpoint

`PATCH /api/v1/orders/:id/items`

La route est authentifiée et utilise `req.shopid` et `req.id`. Elle n'accepte aucun champ client, paiement, boutique, opérateur, statut ou total faisant autorité.

### Requête

```json
{
  "content_revision": "sha256-opaque",
  "expected_total": 31.5,
  "items": [
    {
      "product_id": 10,
      "quantity": 2,
      "selected_product_step_choice_ids": [81, 94]
    },
    {
      "product_id": 17,
      "quantity": 1,
      "selected_product_step_choice_ids": []
    }
  ]
}
```

Les lignes vides, les quantités non positives, les doublons de choix et les identifiants invalides sont refusés. Des configurations strictement identiques peuvent être normalisées et fusionnées avant écriture.

### Réponse

La réponse renvoie la nouvelle révision, le devis appliqué et l'état du paiement :

```json
{
  "order_id": 123,
  "total": 31.5,
  "content_revision": "sha256-new",
  "payment_status": "unpaid",
  "payment_refresh": "not_required"
}
```

Pour Stripe, la réponse peut aussi fournir les données publiques nécessaires au nouvel écran QR. Si la modification SQL est confirmée mais que la régénération Stripe échoue, `payment_refresh` vaut `required` avec un message récupérable et aucun secret sensible n'est journalisé.

## Validation et devis serveur

La logique existante de checkout V2 est extraite en fonctions partagées ou réutilisée afin d'éviter deux règles de tarification :

1. charger les produits de la boutique ;
2. refuser les produits archivés ou indisponibles ;
3. charger leurs configurations actuelles ;
4. valider les minimums, maximums et choix actifs ;
5. résoudre les produits liés ;
6. recalculer le prix unitaire et le total de chaque ligne ;
7. agréger les besoins de stock du produit parent et des produits liés.

Si `expected_total` diffère du devis serveur, aucune donnée et aucun paiement ne sont modifiés. Le serveur répond `409 ORDER_REPRICE_REQUIRED` avec le nouveau devis. Le frontend l'affiche, puis renvoie le total confirmé par l'utilisateur.

## Transaction de contenu et de stock

L'écriture SQL suit cet ordre :

1. verrouiller la commande par `(id, shopid)` avec `FOR UPDATE` ;
2. revérifier `status` et `payment_status` ;
3. verrouiller les détails, instantanés et réservations actuels ;
4. recalculer la révision courante et la comparer à `content_revision` ;
5. valider à nouveau le contenu demandé avec le catalogue courant ;
6. calculer les anciens et nouveaux besoins agrégés ;
7. verrouiller l'union des produits concernés dans un ordre déterministe ;
8. vérifier que les deltas positifs sont disponibles ;
9. appliquer les deltas de stock, y compris les produits liés choisis comme suppléments ;
10. remplacer les détails et les instantanés ;
11. mettre à jour le sous-total et le hash canonique de contenu ;
12. mettre à jour les quantités des réservations ;
13. écrire les mouvements d'ajustement requis ;
14. valider la transaction et renvoyer la nouvelle révision.

Un delta positif consomme du stock ; un delta négatif le restitue. Une erreur à n'importe quelle étape annule l'ensemble de la transaction.

Pour une commande non-Stripe, les réservations déjà `committed` restent `committed` et les mouvements décrivent les différences. Pour Stripe, les réservations restent `reserved`, leur quantité et leur expiration sont actualisées, sans second décrément lors du paiement final.

## Coordination avec préparation et encaissement

Toutes les opérations qui font passer une commande en préparation, l'encaissent, l'archive ou finalisent ses réservations doivent verrouiller la même ligne `orders` avant leur transition. Ainsi :

- si la préparation gagne la course, la modification reçoit `ORDER_NOT_EDITABLE` ;
- si la modification gagne, la préparation voit le contenu et le total finalisés ;
- si l'encaissement gagne, la modification est refusée ;
- si une autre modification gagne, la seconde reçoit `ORDER_EDIT_CONFLICT` grâce à la révision.

Le frontend recharge les détails après ces conflits et n'essaie pas de fusionner automatiquement deux versions.

## Stripe non encaissé

Une commande `requires_payment` peut déjà posséder un PaymentIntent dont le montant correspond à l'ancien panier. L'orchestration est donc explicite :

1. effectuer le devis sans écriture ;
2. synchroniser l'état Stripe courant ;
3. si Stripe indique un succès, enregistrer l'encaissement et refuser la modification ;
4. sinon annuler l'ancien PaymentIntent ;
5. si l'annulation est incertaine, refuser avant toute modification SQL ;
6. une fois l'annulation confirmée, exécuter la transaction de contenu ;
7. générer et attacher un nouveau PaymentIntent idempotent pour le nouveau montant ;
8. renvoyer le nouveau client secret et les informations QR publiques.

La clé d'idempotence du nouveau PaymentIntent inclut la boutique, la commande et la nouvelle révision. L'ancien QR devient invalide.

Si l'étape 7 échoue après la validation SQL, la commande reste modifiée mais non encaissée, avec ses réservations temporaires. Une action idempotente **Régénérer le paiement** reprend uniquement cette étape. L'interface distingue clairement « commande modifiée » de « paiement à régénérer ».

## Erreurs stables

- `ORDER_NOT_EDITABLE` : commande payée ou plus en attente ;
- `ORDER_EDIT_CONFLICT` : contenu modifié depuis son chargement ;
- `ORDER_ITEMS_REQUIRED` : panier vide ;
- `ORDER_RECONFIGURATION_REQUIRED` : sélection historique non réutilisable ;
- `ORDER_REPRICE_REQUIRED` : prix serveur différent ;
- `INSUFFICIENT_STOCK` : delta indisponible ;
- les codes `CUSTOMIZATION_*` existants pour les règles de sélection ;
- `STRIPE_PAYMENT_NOT_SETTLED` ou un code plus précis lorsque l'état externe est incertain ;
- `STRIPE_PAYMENT_REFRESH_REQUIRED` lorsque le contenu est enregistré mais que le nouveau paiement doit être régénéré.

Les réponses indiquent le produit ou l'étape concernée lorsque cela aide le frontend à rouvrir l'assistant au bon endroit.

## Sécurité et compatibilité

- Les deux nouveaux endpoints sont authentifiés et toujours filtrés par `req.shopid`.
- L'identifiant opérateur vient du jeton, jamais du payload.
- L'endpoint de détail actif existant est également corrigé pour appliquer la boutique connectée.
- Les prix, noms et suppléments enregistrés restent des instantanés.
- Les commandes historiques restent consultables même si elles ne sont pas éditables.
- Aucun endpoint historique `orders` + `detailorder` n'est utilisé pour cette modification.

## Tests

### Backend

- lecture éditable autorisée et refusée selon statut, paiement et boutique ;
- refus d'une commande vide ou d'un payload non autorisé ;
- recalcul des prix et confirmation de devis ;
- ajout, suppression, quantité et remplacement de suppléments ;
- delta de stock parent et produits liés ;
- restitution de stock ;
- rollback complet sur rupture ou erreur d'instantané ;
- réservations `committed` et `reserved` ;
- conflit de révision ;
- course modification/préparation ;
- course modification/encaissement ;
- annulation et régénération Stripe ;
- succès Stripe observé avant modification ;
- échec récupérable de régénération ;
- isolation stricte entre boutiques.

### Frontend

- visibilité du bouton ;
- confirmation avant remplacement d'un panier local ;
- transformation du détail en panier ;
- bandeau et libellés du mode modification ;
- réutilisation de l'assistant ;
- ajout, suppression et changement de quantité ;
- annulation sans requête d'écriture ;
- interdiction d'un panier vide ;
- confirmation de nouveau prix ;
- ciblage d'une étape invalide ;
- conflit avec préparation ou paiement ;
- succès puis retour aux détails ;
- nouveau QR Stripe et reprise de régénération ;
- nettoyage de la session à la déconnexion.

### Régression

- création normale d'une commande ;
- checkout non-Stripe ;
- checkout Stripe initial ;
- changement de statut ;
- encaissement au comptoir ;
- annulation, archivage, impression et historique ;
- expiration et finalisation des réservations.

## Critères d'acceptation

1. Le bouton Modifier n'est disponible que pour une commande en attente et non encaissée.
2. Le clic charge la commande existante dans le catalogue/panier sans créer une nouvelle commande.
3. L'utilisateur peut ajouter, supprimer, changer les quantités et modifier les suppléments.
4. Le client, la table, la note, le paiement et le numéro restent inchangés.
5. Les prix et stocks sont recalculés côté serveur et écrits atomiquement.
6. Une préparation ou un encaissement concurrent bloque la modification.
7. Deux modifications concurrentes ne s'écrasent pas silencieusement.
8. Les produits liés utilisés comme suppléments ajustent correctement leur stock.
9. Un paiement Stripe non finalisé est remplacé par un paiement correspondant au nouveau montant.
10. Une annulation locale ne modifie aucune donnée serveur.

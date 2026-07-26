# Modification des commandes et commandes complémentaires

Date : 2026-07-25

## Résumé

Une commande active peut être modifiée depuis sa page de détails uniquement
tant qu'elle est au statut **En attente** et qu'elle n'est pas encaissée.
L'utilisateur retrouve le catalogue et le panier existants pour ajouter ou
retirer des produits, modifier les quantités et rouvrir les étapes de
personnalisation.

Une commande Stripe déjà payée reste immuable. Un produit oublié est alors
ajouté via une **commande complémentaire** indépendante, qui reprend le client
et la table et démarre un nouveau cycle de commande et de paiement.

## Règles métier

Une commande existante est modifiable si, au moment de la lecture et de
l'enregistrement :

- `status = 1` (`En attente`) ;
- son paiement n'est pas encaissé ;
- elle appartient à la boutique authentifiée.

La modification devient impossible dès que la commande passe en préparation,
est terminée, annulée, archivée, remboursée ou payée. Le backend impose cette
règle ; le frontend l'utilise seulement pour afficher les actions.

La commande modifiée conserve :

- son identifiant et son numéro ;
- son client et sa table ;
- son téléphone et sa note ;
- son moyen de paiement et son statut.

Seuls les produits, quantités, choix et suppléments changent. Enregistrer un
panier vide annule automatiquement la commande et restitue les stocks.

## Parcours utilisateur

### Commande en attente et non encaissée

La page `Order details` affiche **Modifier la commande**. Au clic :

1. le frontend demande la version éditable au serveur ;
2. si un panier local existe, une confirmation est demandée avant son
   remplacement ;
3. la commande est convertie en lignes compatibles avec le panier ;
4. le catalogue s'ouvre avec un bandeau
   **Modification de la commande #<numéro>**.

L'utilisateur peut ensuite :

- ajouter un produit depuis le catalogue ;
- retirer une ligne ou diminuer sa quantité ;
- augmenter une quantité ;
- cliquer sur une ligne pour rouvrir ses étapes ;
- ajouter ou retirer des choix et suppléments ;
- revenir au catalogue avant l'enregistrement.

Dans le panier, le bouton principal devient **Enregistrer les modifications**.
**Annuler la modification** abandonne uniquement les changements locaux et
revient aux détails.

Si le panier est vide lors de l'enregistrement, une confirmation annonce que
la commande sera annulée. Après confirmation, le serveur annule la commande,
restitue ses stocks et le frontend revient aux détails ou à la liste.

### Commande Stripe payée

La page de détails n'affiche pas l'action de modification. Elle propose
**Ajouter une commande complémentaire**.

Cette action :

1. démarre un panier vide ;
2. reprend le client et la table de la commande d'origine ;
3. ouvre le catalogue ;
4. utilise ensuite le checkout normal.

La commande complémentaire possède un nouvel identifiant, un nouveau numéro et
un nouveau paiement Stripe. Aucun lien de base de données avec l'ancienne
commande n'est requis dans cette première version.

## Architecture frontend

Un module Vuex `orderEdit` sépare explicitement le mode modification d'une
création normale. Il contient au minimum :

- l'identifiant et le numéro de la commande ;
- une révision opaque du contenu chargé ;
- le panier original et l'état `dirty` ;
- le statut et le fournisseur de paiement ;
- les états de chargement, d'enregistrement et d'erreur.

Le panier existant continue de porter les lignes visibles. Un helper pur
centralise :

- la transformation de la réponse éditable en lignes de panier ;
- la construction du payload d'enregistrement ;
- la détection de changements ;
- la règle d'affichage des actions de détail.

Les pages concernées sont :

- `pages/orders/detail/_id.vue` pour démarrer les deux parcours ;
- `pages/menus.vue` pour afficher le bandeau et ajouter des produits ;
- `pages/cart.vue` pour modifier les lignes et enregistrer la commande ;
- les stores `orders`, `cart` et le nouveau store `orderEdit`.

Une commande complémentaire n'active pas `orderEdit`. Elle utilise le checkout
normal avec le client et la table préremplis.

## Contrats backend

### Lecture éditable

`GET /api/v1/orders/:id/edit`

La route authentifiée filtre par `req.shopid`, vérifie l'éligibilité et renvoie
une représentation normalisée :

```json
{
  "order_id": 123,
  "order_number": "0042",
  "status": 1,
  "payment_status": "unpaid",
  "payment_provider": null,
  "total": 24.5,
  "content_revision": "opaque-hash",
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

Un choix historique qui n'existe plus reste visible dans les instantanés, mais
la ligne reçoit `requires_reconfiguration: true` et doit être reconfigurée ou
supprimée avant l'enregistrement.

### Enregistrement du contenu

`PATCH /api/v1/orders/:id/items`

Le payload contient uniquement la révision et le nouveau contenu :

```json
{
  "content_revision": "opaque-hash",
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

Le serveur ignore tout prix client et refuse les champs permettant de changer
le client, la table, la note, le paiement ou le statut. Un tableau `items` vide
signifie explicitement **annuler la commande**.

## Validation, transaction et stocks

La logique de devis du checkout est partagée avec l'édition afin de conserver
une seule règle de prix et de personnalisation.

L'enregistrement :

1. verrouille la commande `(id, shopid)` avec `FOR UPDATE` ;
2. revérifie le statut et le paiement ;
3. compare la révision courante à celle envoyée ;
4. recharge les produits et configurations actuels ;
5. valide les minimums, maximums et choix actifs ;
6. recalcule les prix et le total ;
7. calcule les différences de stock entre ancien et nouveau contenu ;
8. verrouille les produits parents et liés dans un ordre stable ;
9. consomme ou restitue les deltas ;
10. remplace les détails et instantanés ;
11. met à jour le sous-total et les réservations ;
12. valide la transaction.

Les suppléments liés à des produits participent eux aussi aux deltas de stock.
Une erreur annule toute la transaction.

Pour un panier vide, la même transaction restitue les besoins existants et
passe la commande à `Annulée`. Elle n'utilise pas les endpoints legacy qui
suppriment physiquement les détails sans orchestration.

## Paiements

### Paiement comptoir non encaissé

La commande reste modifiable et le nouveau sous-total remplace l'ancien. Le
paiement final utilisera ce nouveau montant.

### Stripe en attente

Une commande `requires_payment` peut posséder un PaymentIntent et un QR calculés
sur l'ancien montant. Avant l'écriture :

1. le backend synchronise l'état Stripe ;
2. si le paiement a réussi, l'édition est refusée ;
3. sinon l'ancien PaymentIntent est annulé ;
4. la transaction de contenu est appliquée ;
5. un nouveau PaymentIntent idempotent est créé pour le nouveau montant ;
6. le frontend affiche le nouveau QR.

Si la régénération échoue après la transaction SQL, la réponse indique que la
commande est modifiée mais que le paiement doit être régénéré. Une action
idempotente reprend uniquement la création du paiement.

### Stripe payé

La commande est immuable. Le bouton de commande complémentaire démarre le
checkout normal et un nouveau paiement indépendant.

## Concurrence et erreurs

Les transitions vers préparation, paiement, archivage et édition verrouillent
la même ligne commande. Ainsi, l'opération arrivée en second recharge l'état au
lieu d'écraser la première.

Codes métier stables :

- `ORDER_NOT_EDITABLE` : commande payée ou plus en attente ;
- `ORDER_EDIT_CONFLICT` : révision devenue obsolète ;
- `ORDER_RECONFIGURATION_REQUIRED` : ancien choix invalide ;
- `ORDER_REPRICE_REQUIRED` : total serveur différent ;
- `INSUFFICIENT_STOCK` : delta indisponible ;
- `STRIPE_PAYMENT_NOT_SETTLED` : état Stripe incertain ;
- `STRIPE_PAYMENT_REFRESH_REQUIRED` : contenu enregistré, paiement à recréer.

Le frontend affiche le message, conserve le contexte lorsqu'une reprise est
possible et recharge les détails lorsque l'éligibilité a changé.

## Sécurité

- Toutes les routes sont authentifiées et filtrées par `req.shopid`.
- L'opérateur vient du jeton, jamais du payload.
- Les prix et totaux sont recalculés côté serveur.
- L'endpoint de changement de statut existant reste séparé.
- Les archives ne sont jamais modifiées.
- Les commandes complémentaires passent par le checkout normal.

## Tests ciblés

### Backend

- lecture autorisée/refusée selon boutique, statut et paiement ;
- ajout, retrait, quantité et remplacement de choix ;
- annulation par panier vide et restitution du stock ;
- recalcul du total et des produits liés ;
- rollback sur rupture ou erreur ;
- conflit de révision et course avec préparation/encaissement ;
- Stripe en attente avec remplacement du paiement ;
- refus Stripe payé.

### Frontend

- visibilité des deux actions dans Order details ;
- confirmation avant remplacement d'un panier local ;
- transformation détail vers panier ;
- ajout, suppression, quantité et réouverture des étapes ;
- enregistrement et annulation par panier vide ;
- bandeau et sortie du mode modification ;
- nouveau QR Stripe ou reprise de régénération ;
- commande complémentaire avec client/table préremplis ;
- nettoyage de session à l'annulation, au succès et à la déconnexion.

## Critères d'acceptation

1. Une commande est modifiable uniquement si elle est en attente et non
   encaissée.
2. Le parcours réutilise le catalogue, le panier et l'assistant existants.
3. L'utilisateur peut ajouter ou retirer des produits, changer les quantités et
   modifier les choix.
4. Le même identifiant et numéro sont conservés.
5. Un panier vide annule la commande et restitue les stocks.
6. Prix, personnalisations et stocks sont validés atomiquement côté serveur.
7. Une préparation, un paiement ou une modification concurrente empêche tout
   écrasement silencieux.
8. Un Stripe en attente reçoit un paiement recalculé.
9. Un Stripe payé reste immuable et ouvre une commande complémentaire avec un
   nouveau cycle complet.
10. La création normale de commandes reste inchangée.

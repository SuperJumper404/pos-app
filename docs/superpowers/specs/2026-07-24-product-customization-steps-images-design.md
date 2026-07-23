# Images et étapes de personnalisation produit — conception

Date : 2026-07-24  
Statut : conception validée par l’utilisateur  
Périmètre : frontend `pos-app` et backend voisin `../express-pos`

## Résumé

Le catalogue doit permettre de composer un produit au moyen d’un assistant séquentiel comparable à celui d’une borne de restauration rapide. Chaque écran correspond à une étape ordonnée, par exemple « Accompagnement », « Boisson » ou « Suppléments ».

Une étape contient des choix de deux types :

- un choix simple, comme « Sans oignons » ou « Bacon », avec son nom, une image facultative et un supplément défini sur le produit parent ;
- un produit lié du catalogue, comme « Coca-Cola » ou « Frites », qui réutilise le nom, l’image et le stock du produit référencé.

Les étapes sont partagées dans une bibliothèque propre à chaque boutique. Lorsqu’une étape est attachée à un produit, le produit parent conserve ses propres contraintes minimum/maximum, son ordre d’affichage, la liste des choix proposés et les suppléments applicables.

La solution remplace le modèle de personnalisation actuel par un modèle V2 normalisé. Les données existantes sont migrées sans suppression destructive. Toutes les commandes passent par un service métier transactionnel qui recalcule les prix, valide les choix, réserve ou décrémente les stocks et conserve un instantané des sélections.

## Contexte existant

Le frontend est une application Nuxt 2, Vue 2 et Vuetify. Le backend est une API Express avec MySQL et des migrations dbmate.

Le système actuel possède déjà :

- `product_customization`, rattachée directement à un seul produit ;
- `product_choice`, avec un nom et un supplément ;
- `mandatory` et `limit_choice` pour une partie des contraintes ;
- `orders_customization`, qui conserve principalement les identifiants des choix ;
- une fenêtre unique dans `pages/menus.vue`, qui affiche tous les groupes sous forme de radios ou cases à cocher ;
- une image uniquement sur le produit principal ;
- des créations de commande non-Stripe en plusieurs appels (`orders`, puis `detailorder`) ;
- un flux Stripe séparé dans `m_payments.js`.

Ces structures ne permettent pas de partager proprement une étape entre plusieurs produits, d’associer une image à un supplément simple, de référencer le stock d’un autre produit, ni de garantir que l’historique reste exact après modification du catalogue.

## Objectifs

1. Créer une bibliothèque d’étapes partagées par boutique.
2. Attacher et ordonner des étapes sur un produit.
3. Configurer un minimum et un maximum de sélections par produit et par étape.
4. Proposer des choix simples imagés et des produits liés au catalogue.
5. Définir le supplément dans le contexte du produit parent, indépendamment du prix de vente normal d’un produit lié.
6. Décrémenter le stock du produit parent et celui des produits liés sélectionnés.
7. Utiliser le même assistant guidé pour la caisse, le QR/table, le click-and-collect et la future borne.
8. Conserver des commandes et archives lisibles même si les étapes ou choix changent ensuite.
9. Migrer sans suppression les données de personnalisation encore présentes ; les sélections déjà absentes des anciennes archives ne sont pas reconstructibles.
10. Éviter les commandes partielles, les prix imposés par le client et les doubles soumissions.

## Hors périmètre

- Les choix simples n’ont pas de stock propre. Un choix qui doit gérer un stock doit référencer un produit du catalogue.
- Un produit lié ne lance pas récursivement son propre assistant de personnalisation. Il représente une unité de stock et un choix visuel dans l’étape du produit parent.
- Une étape ne peut pas être attachée deux fois au même produit dans cette version.
- Aucun regroupement automatique des anciennes étapes portant le même nom n’est effectué.
- La restauration automatique du stock après un remboursement déjà finalisé reste soumise au comportement métier existant et n’est pas modifiée par ce chantier.
- Le projet ne reçoit pas de nouvelle dépendance de glisser-déposer ; des actions Vuetify « monter/descendre » suffisent pour l’ordre.

## Décisions métier validées

- Les choix peuvent être simples ou liés à un produit existant.
- Le prix ajouté est toujours un supplément contextuel. Le prix catalogue d’un produit lié n’est jamais ajouté automatiquement.
- Seuls les produits liés ont un stock indépendant ; les choix simples n’en ont pas.
- Une étape est affichée sur un écran distinct de l’assistant.
- Les étapes appartiennent à une bibliothèque partagée par boutique.
- Les contraintes sont `minimum_choices` et `maximum_choices`, configurées sur l’association produit–étape.
- Un produit lié en rupture reste visible mais désactivé.
- Si le minimum d’une étape ne peut plus être satisfait, le produit parent est non commandable et l’interface explique la cause.
- Un produit lié hérite de son image produit. Un choix simple porte sa propre image facultative, avec un placeholder si elle manque.
- L’étape elle-même ne porte pas de bannière.
- L’assistant est utilisé sur tous les parcours de commande.
- Le panier sépare les configurations différentes, fusionne les configurations strictement identiques et permet de rouvrir l’assistant avec « Modifier ».
- Les données existantes sont migrées automatiquement.

## Modèle de données V2

### `customization_steps`

Bibliothèque d’étapes d’une boutique.

- `id`
- `shop_id`
- `name`
- `description`, nullable
- `active`, booléen, valeur par défaut vraie
- `created`
- `updated`, nullable

Index : `(shop_id, active)`. Les noms ne sont pas uniques afin de permettre la migration sûre d’anciens groupes homonymes.

### `customization_step_choices`

Choix réutilisables appartenant à une étape.

- `id`
- `step_id`
- `choice_type`, enum `simple` ou `linked_product`
- `name`, requis pour un choix simple et nul pour un produit lié
- `image`, nullable et utilisé uniquement pour un choix simple
- `linked_product_id`, requis pour un produit lié et nul pour un choix simple
- `default_position`
- `active`
- `created`
- `updated`, nullable

Un produit lié doit appartenir à la même boutique que l’étape. Une référence du produit vers lui-même est refusée lors de l’attachement au produit parent. Le nom et l’image d’un produit lié sont résolus depuis `products` au moment de la lecture. Le nom affiché et les données tarifaires sont photographiés dans la commande lors de l’achat ; l’image reste une donnée de présentation du catalogue et n’est pas requise sur les tickets historiques.

### `product_customization_steps`

Association ordonnée entre un produit et une étape partagée.

- `id`
- `product_id`
- `step_id`
- `position`
- `minimum_choices`
- `maximum_choices`
- `active`
- `created`
- `updated`, nullable

Contraintes : unicité `(product_id, step_id)`, `minimum_choices >= 0`, `maximum_choices >= 1` et `minimum_choices <= maximum_choices`.

### `product_customization_step_choices`

Configuration d’un choix dans le contexte précis d’un produit–étape.

- `id`
- `product_customization_step_id`
- `step_choice_id`
- `extra_price`, `DECIMAL(10,2)`, valeur par défaut `0.00`
- `position`
- `active`

Contrainte : unicité `(product_customization_step_id, step_choice_id)`. Le backend vérifie également que `step_choice_id` appartient bien à l’étape référencée par `product_customization_step_id`. Cette table permet de proposer seulement une partie des choix de l’étape et de modifier l’ordre ou le supplément sans dupliquer l’étape partagée.

### Instantanés de commande

Deux tables conservent les sélections :

- `orderdetail_customization_snapshots`, liée à `orderdetail` ;
- `archivesdetail_customization_snapshots`, liée à `archivesdetail`.

Chaque ligne contient au minimum :

- l’identifiant de la ligne de commande ou d’archive ;
- les références catalogue, nullables, vers le produit–étape et le choix ;
- `step_name` ;
- `step_position` ;
- `choice_type` ;
- `choice_name` ;
- `choice_position` ;
- `unit_extra_price` ;
- `linked_product_id`, nullable.

Les textes et le supplément sont copiés au moment de la commande. Une modification, désactivation ou suppression logique du catalogue ne modifie donc jamais un ticket existant. Lors de l’archivage, les instantanés actifs sont copiés dans la table d’archive au sein de la même transaction.

### `order_stock_reservations`

Cette table trace le cycle de réservation du stock pour toutes les commandes. Une commande non-Stripe passe immédiatement à `committed`. Un paiement Stripe reste à `reserved` afin d’éviter qu’un produit soit vendu pendant que le paiement est en attente.

- `id`
- `order_id`
- `product_id`
- `quantity`
- `status`, enum `reserved`, `committed` ou `released`
- `expires_at`, nullable pour une réservation déjà finalisée
- `created`
- `updated`

Contrainte : unicité `(order_id, product_id)`. Les besoins identiques sont agrégés avant création de la réservation.

La table `orders` reçoit aussi `client_order_token` et `client_order_payload_hash`, tous deux nullables pour préserver les commandes existantes. L’index unique `(shopid, client_order_token)` garantit l’idempotence par boutique ; le hash SHA-256 du payload canonique permet de refuser la réutilisation d’un token avec un panier différent.

## Règles de disponibilité et de prix

Le backend renvoie chaque choix avec son supplément effectif et son état de disponibilité.

Un choix simple est disponible lorsque l’étape, le choix, l’association produit–étape et l’association contextuelle sont actifs.

Un produit lié est disponible lorsque les mêmes conditions sont remplies, que le produit référencé n’est pas archivé et que son stock est strictement positif. `is_hidden` continue de contrôler la vente autonome du produit ; il n’empêche pas son utilisation explicite comme composant d’un menu.

Le backend calcule aussi le prix minimum commandable du produit. La carte affiche le prix normal lorsque les choix obligatoires n’ajoutent rien, sinon « À partir de … ».

Si le nombre de choix actuellement disponibles est inférieur à `minimum_choices`, l’étape est insatisfaisable et le produit parent est marqué non commandable.

## API backend

Toutes les routes vérifient l’authentification, le rôle administrateur pour les écritures et l’appartenance à la boutique. Une étape ou un produit d’une autre boutique ne peut jamais être référencé.

### Bibliothèque d’étapes

- `GET /api/v1/customization-steps`
- `POST /api/v1/customization-steps`
- `GET /api/v1/customization-steps/:id`
- `PATCH /api/v1/customization-steps/:id`
- `DELETE /api/v1/customization-steps/:id`, qui désactive la ressource
- `POST /api/v1/customization-steps/:id/choices`
- `PATCH /api/v1/customization-choices/:id`
- `DELETE /api/v1/customization-choices/:id`, qui désactive le choix

La création et la modification d’un choix simple acceptent `multipart/form-data`. Les formats JPEG, PNG et WebP sont acceptés jusqu’à 5 Mo. Le serveur génère le nom final. En cas d’échec SQL, le nouveau fichier est supprimé ; lors d’un remplacement réussi, l’ancien fichier est supprimé après le commit. Les images des choix désactivés sont conservées pour permettre une réactivation.

### Configuration d’un produit

- `PUT /api/v1/products/:id/customization-config`

Le payload contient les étapes attachées, leur ordre, minimum, maximum, activation et leurs choix contextuels. Le backend remplace la configuration du produit dans une transaction après validation complète.

`POST /api/v1/product` continue à recevoir l’image principale en multipart et reçoit la configuration V2 sérialisée dans le même formulaire. La création du produit et de ses associations est atomique.

### Lecture du catalogue

Les réponses produit ajoutent `customization_steps`, ordonné et déjà résolu :

- identifiants de l’association et de l’étape ;
- nom, description, position, minimum et maximum ;
- état de disponibilité de l’étape ;
- choix contextuels ordonnés ;
- type, nom résolu, image résolue, supplément et disponibilité de chaque choix ;
- raison structurée d’une indisponibilité ;
- prix minimum commandable du produit.

La récupération de la liste doit agréger les données en lots et ne doit pas conserver le modèle actuel qui lance une requête de détail par produit.

### Commande transactionnelle

- `POST /api/v1/orders/checkout` remplace le couple d’appels `orders` puis `detailorder` pour les nouveaux flux non-Stripe.
- `POST /api/v1/stripe/payment-intents/qr-table` reste le point d’entrée Stripe, mais délègue la validation, la création de commande et le stock au même service métier.
- Les anciennes routes de détail restent uniquement dans l’adaptateur de compatibilité pendant la transition.

Le frontend envoie un seul payload contenant les données client et :

```json
{
  "client_order_token": "uuid-unique",
  "expected_total": "13.50",
  "items": [
    {
      "product_id": 42,
      "quantity": 2,
      "selected_product_step_choice_ids": [101, 108, 115]
    }
  ]
}
```

Le client n’est jamais la source de vérité pour les prix. `expected_total` sert seulement à détecter une modification de tarif entre l’affichage et la validation.

Le service métier commun :

1. vérifie la boutique, les produits, les associations et les choix ;
2. refuse les doublons et les choix qui n’appartiennent pas à l’étape du produit ; un même choix contextuel ne peut être sélectionné qu’une fois dans une configuration ;
3. valide les minimums et maximums ;
4. recalcule le prix unitaire et le total ;
5. compare le total serveur à `expected_total` et renvoie le nouveau devis sans écrire en base en cas d’écart ;
6. agrège le besoin de stock du produit parent et de tous les produits liés, multiplié par la quantité de la ligne ;
7. verrouille les lignes produit dans un ordre stable afin de limiter les interblocages ;
8. vérifie les stocks ;
9. crée la commande, les détails, les instantanés et les réservations dans une seule transaction ;
10. décrémente le stock disponible.

`client_order_token` est unique par boutique et rend la création idempotente. Un double clic avec le même payload renvoie la commande déjà créée avec `idempotent_replay: true`. La réutilisation du même token avec un payload différent renvoie `409 IDEMPOTENCY_KEY_REUSED`.

Le flux non-Stripe valide immédiatement les réservations et crée les mouvements de stock. Le flux Stripe conserve les réservations au statut `reserved` jusqu’au résultat du paiement :

- succès Stripe : passage à `committed` et création des mouvements, sans second décrément ;
- paiement au comptoir : même validation, sans second décrément ;
- échec, annulation ou expiration : réincrément du stock et passage à `released` ;
- erreur de création du PaymentIntent : annulation de la commande provisoire et libération immédiate.

La durée de réservation Stripe est configurée par `STRIPE_STOCK_RESERVATION_MINUTES`, avec une valeur par défaut de 15 minutes. La libération des réservations expirées est idempotente et est déclenchée périodiquement ainsi qu’avant une nouvelle réservation. Elle verrouille la réservation et ne libère que le statut `reserved`, ce qui permet plusieurs instances backend sans double réincrément. Les webhooks Stripe et le paiement au comptoir appellent le même service de finalisation, au lieu de dupliquer les règles de stock.

## Erreurs

Les erreurs métier utilisent un statut adapté et une structure stable contenant `code`, `message`, `product_id`, `product_step_id` et `choice_id` lorsque ces champs sont pertinents.

Codes prévus :

- `CUSTOMIZATION_MIN_NOT_MET`
- `CUSTOMIZATION_MAX_EXCEEDED`
- `CUSTOMIZATION_CHOICE_NOT_ALLOWED`
- `CUSTOMIZATION_STEP_UNAVAILABLE`
- `PRODUCT_UNAVAILABLE`
- `LINKED_PRODUCT_OUT_OF_STOCK`
- `ORDER_REPRICE_REQUIRED`
- `IDEMPOTENCY_KEY_REUSED`

Une indisponibilité ou un conflit de stock renvoie `409`. Un payload invalide renvoie `400`. Une association métier impossible renvoie `422`. Pour `ORDER_REPRICE_REQUIRED`, la réponse fournit le nouveau devis serveur afin que l’utilisateur confirme le changement.

Le frontend conserve les sélections valides et rouvre l’assistant directement sur l’étape en erreur.

## Frontend

### Administration des étapes

La page protégée `pages/customizations/index.vue` gère la bibliothèque de la boutique.

Elle permet :

- créer, modifier, activer ou désactiver une étape ;
- créer un choix simple avec image ;
- sélectionner un produit lié de la même boutique ;
- ordonner les choix avec des boutons monter/descendre ;
- visualiser les produits utilisant l’étape avant désactivation.

Un module Vuex dédié conserve la liste, l’élément sélectionné, les états de chargement et les messages d’erreur. Les formulaires réutilisent Vuetify et les notifications globales existantes.

`ImageCropper.vue` est réutilisé avec un ratio carré pour les choix. Son identifiant d’input doit devenir unique par instance avant de l’afficher plusieurs fois dans une même page. Un placeholder est utilisé pour les anciens choix et les images absentes.

### Configuration du produit

La création et l’édition d’un produit permettent :

- attacher une étape existante ;
- modifier l’ordre des étapes ;
- définir minimum et maximum ;
- activer seulement les choix proposés ;
- définir leur ordre et leur supplément contextuel ;
- détacher une étape sans supprimer la bibliothèque partagée.

Le formulaire refuse une configuration dans laquelle le minimum dépasse le maximum ou le nombre de choix actifs.

### Assistant de commande

Le composant réutilisable `ProductCustomizationWizard.vue` reçoit le produit résolu et, en mode édition, la sélection existante.

Comportement :

- une étape par écran ;
- barre de progression et prix courant ;
- cartes imagées ;
- comportement radio lorsque le maximum vaut 1 ;
- comportement multisélection dans les autres cas ;
- bouton Continuer désactivé tant que le minimum n’est pas atteint ;
- impossibilité de dépasser le maximum ;
- choix indisponible visible mais désactivé ;
- étape facultative sans choix disponible automatiquement ignorée ;
- écran final de résumé avant ajout au panier ;
- boutons Retour et Modifier qui conservent les sélections.

Le composant est utilisé depuis `pages/menus.vue` pour tous les niveaux d’accès. La logique de validation, de calcul d’aperçu et de signature du panier est extraite dans des helpers purs plutôt que dupliquée dans la page.

### Panier

Une ligne de panier contient le produit, les identifiants contextuels sélectionnés, les libellés d’affichage, le prix prévisionnel et une signature de configuration.

La signature est construite à partir de l’identifiant produit et de la liste triée des identifiants `product_customization_step_choices`. Deux configurations identiques fusionnent et incrémentent la quantité. Deux configurations différentes restent séparées.

« Modifier » rouvre l’assistant avec la sélection de la ligne. Toute modification recalcule sa signature et peut provoquer une fusion avec une ligne déjà identique ; dans ce cas, les quantités des deux lignes sont additionnées.

## Migration de l’existant

La première migration est additive.

Pour chaque ligne de `product_customization` :

1. retrouver le produit et sa boutique ;
2. créer une étape V2 propre à ce produit, même si une autre étape porte le même nom ;
3. créer l’association produit–étape ;
4. convertir `mandatory = 1` en `minimum_choices = 1`, sinon `0` ;
5. convertir `limit_choice` en `maximum_choices` lorsqu’il vaut au moins 1 ; sinon utiliser le nombre de choix existants, avec un minimum technique de 1 ;
6. créer chaque ancien `product_choice` comme choix simple ;
7. copier son prix dans `extra_price` sur l’association contextuelle ;
8. attribuer les positions selon l’ordre stable des identifiants ;
9. laisser l’image vide afin d’utiliser le placeholder.

Pour une ancienne étape obligatoire sans choix, la migration conserve `minimum_choices = 1` et `maximum_choices = 1` : le produit devient explicitement indisponible jusqu’à correction par l’administrateur. Toute autre valeur invalide est normalisée selon la règle précédente et inscrite dans le rapport de migration. Les comptages avant/après et les totaux de choix doivent correspondre.

Les commandes encore actives sont rétroalimentées vers les instantanés à partir de `orders_customization`. Une référence devenue introuvable est conservée dans le rapport de migration et la commande reste lisible avec les données encore disponibles. Les archives historiques existantes ne contiennent actuellement pas les sélections archivées de manière fiable ; les informations déjà absentes ne peuvent pas être reconstruites. Elles restent consultables dans leur état actuel. Toutes les nouvelles archives conserveront les instantanés complets.

Les anciennes tables restent présentes et en lecture seule pendant la première phase. Le backend expose temporairement une projection `product_customization` pour l’ancien frontend et traduit les écritures legacy en étapes dédiées au produit pendant la courte fenêtre de compatibilité. Ce traducteur n’est pas un second modèle permanent et sera retiré après validation du frontend V2.

## Ordre de déploiement

1. Sauvegarder et tester la migration sur une copie réaliste en staging.
2. Déployer la migration additive et vérifier son rapport.
3. Déployer le backend V2 avec compatibilité de lecture/écriture legacy.
4. Vérifier les anciens parcours contre le nouveau backend.
5. Déployer le frontend V2.
6. Observer les commandes, stocks, paiements et archives.
7. Retirer ultérieurement l’adaptateur legacy dans un changement distinct, après sauvegarde et validation.

L’ordre inverse n’est pas supporté : le nouveau frontend ne doit jamais être déployé avant le backend compatible.

## Tests et validation

### Backend

- validations minimum/maximum ;
- choix étranger au produit ou à la boutique ;
- calcul du prix et détection de repricing ;
- idempotence par `client_order_token` ;
- agrégation du stock parent et lié ;
- deux commandes concurrentes sur le dernier produit disponible ;
- rollback complet après erreur d’insertion ;
- réservation, succès, paiement au comptoir, échec, annulation et expiration Stripe ;
- copie des instantanés lors de l’archivage ;
- migration et rapport de comptage ;
- validation MIME/taille, remplacement et nettoyage des images.

Les tests suivent le style Node existant lorsque possible. Les scénarios SQL critiques utilisent une base de test afin de vérifier les transactions et verrouillages réels.

### Frontend

- helper de validation d’étape ;
- helper de prix prévisionnel ;
- signature stable d’une configuration ;
- fusion et séparation des lignes de panier ;
- restauration des sélections lors de « Modifier » ;
- navigation Retour/Continuer et résumé ;
- choix indisponible et produit non commandable ;
- erreur API ciblée ouvrant la bonne étape ;
- lint et build Nuxt.

### Matrice manuelle

- caisse administrateur et caissier ;
- commande QR/table ;
- click-and-collect ;
- affichages mobile, tablette et bureau ;
- paiement au comptoir et Stripe ;
- ticket, détail de commande et archive ;
- produit sans étape, produit avec étape facultative et produit avec plusieurs étapes obligatoires ;
- choix simple sans image, choix simple imagé et produit lié en rupture.

## Critères d’acceptation

La fonctionnalité est acceptée lorsque :

1. un administrateur peut créer une étape partagée et y ajouter les deux types de choix ;
2. plusieurs produits peuvent réutiliser cette étape avec des suppléments et contraintes différents ;
3. l’assistant empêche toute configuration invalide et fonctionne sur tous les parcours ;
4. les configurations différentes restent distinctes dans le panier et les identiques fusionnent ;
5. l’API ignore les prix client, recalcule le total et refuse les choix frauduleux ;
6. le stock parent et les stocks liés restent corrects, y compris avec concurrence et paiement Stripe ;
7. une modification future du catalogue ne change pas les commandes déjà enregistrées ;
8. les personnalisations existantes sont migrées avec des comptages vérifiés ;
9. le frontend passe le lint et le build, et les tests backend ciblés réussissent ;
10. aucune table historique n’est supprimée lors du premier déploiement.

# Architecture des points de service

## Contexte

Le modele actuel utilise `users` a la fois pour les membres du personnel et
pour les destinations de commande. L'admin principal est cree comme
"Comptoir", les tables sont des utilisateurs avec un acces client, et
Click & Collect est un autre faux utilisateur. Une commande enregistre cette
destination dans `customerID`.

Ce melange empeche de distinguer clairement une personne, une table et un
canal de vente. Il rend aussi Comptoir dependant du compte admin.

## Objectif

Separer durablement :

- le personnel et l'admin dans `users` ;
- les destinations de commande dans `service_points` ;
- l'origine d'une commande dans `orders.order_source`.

Les points de service appartiennent au shop et sont partages par tous les
employes autorises. Comptoir est le choix par defaut des commandes internes.

## Modele de donnees

### Users

`users` contient exclusivement des personnes :

- un admin principal avec email et mot de passe ;
- des membres du staff avec ID caisse, PIN et permissions de modules.

Le champ `shop.admin_user` reference l'admin principal. Aucun utilisateur ne
represente Comptoir, Click & Collect ou une table physique.

### Service points

Une nouvelle table `service_points` contient au minimum :

- `id` ;
- `shopid` ;
- `name` ;
- `type` : `counter`, `click_collect` ou `table` ;
- `is_active` ;
- `sort_order` ;
- les informations de QR uniquement lorsqu'un point de type `table` doit etre
  utilisable par un client.

Chaque shop obtient automatiquement deux points actifs et systeme :

- `Comptoir` de type `counter` ;
- `Click & Collect` de type `click_collect`.

Ils ne peuvent ni etre supprimes ni changer de type. Les vraies tables sont
des points de type `table`, crees et geres depuis l'ecran Tables.

### Orders et archives

`orders` et `archives` recoivent :

- `service_point_id`, destination de la commande ;
- `order_source`, avec `pos`, `web` ou `table_qr`.

Les champs d'attribution existants restent separes de la destination :

- `taken_by_user_id` et `taken_by_name` ;
- `prepared_by_user_id` et `prepared_by_name`.

`customerID` est remplace par `service_point_id` dans les nouveaux flux et
supprime apres migration complete des lecteurs et ecrivains existants.

## Regles de creation et d'affectation

| Origine | Point de service | Regle |
| --- | --- | --- |
| Caisse interne | Comptoir par defaut | Le staff peut choisir Comptoir, Click & Collect ou une table active du shop. |
| Site web | Click & Collect | Le point est defini par le serveur et ne change pas. |
| QR de table | Table concernee | Le point est defini par le jeton de table et ne change pas. |

Le choix de point est toujours verifie contre le shop de la session. Une
commande ne peut jamais etre affectee a un point d'un autre shop.

## API et interface

- Les routes de points de service retournent la liste partagee du shop.
- Les routes Tables ne gerent que les points de type `table`.
- Le checkout interne accepte un `service_point_id` et applique Comptoir si
  aucune valeur valide n'est fournie.
- Les checkouts site et QR resolvent le point cote serveur ; ils n'acceptent
  pas un point choisi par le client.
- Caisse, commandes, historique et recu affichent le nom du point de service
  et l'attribution staff comme deux informations distinctes.

## Migration

La migration doit privilegier la conservation des donnees :

1. Creer `service_points` et les deux points systeme pour chaque shop.
2. Convertir les anciens utilisateurs d'acces table en points de type `table`.
3. Convertir l'ancien utilisateur Click & Collect en point systeme, puis le
   retirer de `users` apres migration des references.
4. Conserver l'ancien compte Comptoir comme admin principal reel ; Comptoir
   devient le nouveau point systeme distinct.
5. Associer les commandes et archives : anciennes tables vers leur nouveau
   point, ancien Click & Collect vers le point Click & Collect, autres cas
   vers Comptoir.
6. Migrer les ecritures et lectures vers `service_point_id`, puis retirer
   l'usage de `customerID`.

Une installation legacy qui ne peut pas etre convertie de facon deterministe
peut etre reinitialisee, avec Comptoir et Click & Collect recrees au prochain
setup de shop.

## Erreurs et garde-fous

- Un point inactif ou absent est refuse au checkout interne.
- Les points systeme ne sont pas supprimables.
- Le site et les QR ne peuvent pas modifier leur destination.
- Les points de service ne sont jamais presents dans l'ecran Staff ni dans les
  donnees de connexion.

## Verification

- Tests de migration des users legacy vers les points de service.
- Tests de checkout POS avec Comptoir par defaut et changement vers une table
  ou Click & Collect.
- Tests de checkout site et QR avec destination serveur immuable.
- Tests de separation entre point de service, membre ayant pris la commande
  et membre ayant prepare la commande.
- Tests d'affichage sur caisse, commandes, historique et recu.

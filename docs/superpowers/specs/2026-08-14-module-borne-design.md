# Module borne - design

## Objectif

Ajouter un mode borne client autonome au frontend POS. La borne est connectee
avec un utilisateur staff limite au module `borne`, mais l'experience visible
est celle d'un client: menu plein ecran, panier tactile, saisie nom/numero,
choix sur place/a emporter, paiement configurable, puis confirmation avec
numero de commande et impression ticket si disponible.

Le canal `borne` devient un canal de commande au meme niveau que les canaux
existants `click-and-collect` et `comptoir`.

## Decisions validees

- La page principale du module est `/borne`.
- Le user borne est un utilisateur staff, mais il n'a acces qu'au module
  `borne`.
- Apres connexion, un user borne doit arriver directement sur `/borne`.
- La borne affiche tous les produits actifs, comme le menu actuel.
- La borne utilise le `service_point_id` de la session connectee. Ce service
  point represente la borne physique, par exemple "Borne 1".
- Le client renseigne son nom et son numero de telephone.
- La borne genere une commande avec numero de commande.
- Le client choisit `sur place` ou `a emporter`.
- Le paiement est configurable: Stripe direct ou paiement au comptoir.
- Apres validation, la borne affiche la confirmation et imprime un ticket si
  l'impression est disponible.

## Architecture frontend

Ajouter une page `pages/borne.vue` dediee au parcours borne. La page doit avoir
un layout plein ecran, sans sidebar POS et sans dashboard. Elle reutilise les
stores et helpers existants autant que possible:

- `products` et `categories` pour le catalogue.
- `cart` pour le panier et le checkout.
- `shop` pour les informations boutique, la configuration paiement et
  l'impression.
- `servicePoints` ou la session utilisateur pour connaitre la borne connectee.
- `helpers/price`, `helpers/customizations` et les composants de personnalisation
  produit deja presents.

La page borne ne doit pas etre une variante cachee de `pages/menus.vue`.
`menus.vue` est deja dense et porte plusieurs modes POS/client. La borne doit
reutiliser les briques metier, mais garder une surface UI isolee pour eviter de
fragiliser les parcours existants.

## Permissions et navigation

Ajouter un module `borne` dans `helpers/staffRoles.js`:

- `STAFF_MODULE_KEYS` inclut `borne`.
- `MODULE_OPTIONS` affiche `Borne`.
- `MODULE_PERMISSION_BY_NAV_KEY` mappe la route/navigation borne vers `borne`.
- Un preset de role peut inclure `borne` seulement si on choisit plus tard de
  creer un role dedie. Pour la premiere version, l'admin principal peut creer un
  utilisateur staff et cocher uniquement `Borne`.

Ajouter une entree de navigation interne pour `/borne`, mais le layout ne doit
pas afficher de sidebar au client final. L'entree sert surtout a l'accueil
interne et aux controles de permissions.

Le middleware `auth` doit bloquer un utilisateur borne qui tente d'ouvrir un
module POS non autorise. Si ses permissions ne contiennent que `borne`, il est
redirige vers `/borne`.

## Flux utilisateur

1. Le user borne se connecte avec ses identifiants staff/PIN.
2. L'application detecte que ses permissions donnent uniquement acces au module
   `borne` et ouvre `/borne`.
3. Le client parcourt les categories et ajoute des produits au panier.
4. Si un produit a des options, la borne ouvre le wizard de personnalisation.
5. Le client ouvre le panier ou garde le panier visible selon la taille ecran.
6. Le client saisit son nom et son numero.
7. Le client choisit `sur place` ou `a emporter`.
8. Selon la configuration boutique, la borne propose Stripe, paiement au
   comptoir, ou les deux.
9. La commande est envoyee avec le panier, le total, le `servicePointId` de la
   borne, le nom, le numero, `isTakeaway`, le mode de paiement et la source
   `borne`.
10. La borne affiche le numero de commande et tente d'imprimer un ticket client
    si Smart Print ou l'imprimante configuree est disponible.
11. Le client peut lancer une nouvelle commande. Un retour automatique au menu
    peut etre ajoute apres un court delai.

## Donnees de checkout

Le payload doit rester compatible avec les actions existantes:

- `customer`: nom saisi par le client.
- `phone`: numero saisi par le client.
- `servicePointId`: service point de la borne connectee.
- `total`: total arrondi.
- `payment`: `Stripe`, `Paiement au comptoir`, ou autre libelle existant.
- `remark`: note vide pour la premiere version, sauf besoin ulterieur.
- `isTakeaway`: choix client.
- `dataCart`: panier.
- `stripe`: booleen selon le flow.
- `source`: `borne`, si le backend accepte deja cette propriete ou apres ajout
  backend.

Si le backend ignore `source`, le frontend doit rester fonctionnel. Le suivi
precis du canal `borne` necessitera alors une petite evolution backend.

## UX borne

L'ecran borne doit etre concu pour tactile:

- Boutons et cartes produits grands.
- Categories horizontales ou onglets faciles a viser.
- Panier toujours accessible et visible sur desktop/tablette large.
- Etapes courtes: menu, panier, identite, service, paiement, confirmation.
- Aucun element POS interne visible: pas de sidebar, pas de dashboard, pas de
  commandes staff, pas de tiroir-caisse.
- Textes simples et clients: "Votre commande", "Votre nom", "Votre numero",
  "Sur place", "A emporter", "Payer", "Payer au comptoir".

La confirmation doit etre lisible a distance:

- Numero de commande en grand.
- Recapitulatif court.
- Etat impression: ticket imprime ou ticket indisponible.
- Bouton "Nouvelle commande".

## Erreurs et cas limites

- Cuisine fermee: bloquer la validation et afficher un message clair.
- Panier vide: validation impossible.
- Nom ou numero absent: validation impossible.
- Borne sans `service_point_id`: bloquer la validation et afficher une erreur
  d'installation.
- Paiement Stripe echoue: afficher l'erreur et laisser revenir au paiement.
- Impression echoue: ne pas annuler la commande; afficher que le ticket n'a pas
  pu etre imprime.
- Produit devenu indisponible ou prix change: reutiliser la logique de reprice
  et de reconfiguration deja presente si possible.

## Backend attendu

La premiere version frontend peut demarrer avec les endpoints existants si le
checkout accepte le meme payload que les commandes actuelles.

Pour un suivi complet du canal borne, le backend devra idealement accepter et
persister `source = 'borne'`, comme il distingue deja les autres origines de
commande. Les vues commandes, historique, ticket et statistiques pourront
ensuite afficher ou filtrer ce canal.

## Validation

Tests frontend cibles:

- `staffRoles` inclut le module `borne`.
- Un user avec permission `borne` voit uniquement l'acces borne et logout.
- Un user borne est redirige vers `/borne` quand il tente une route POS non
  autorisee.
- Le payload checkout borne contient `customer`, `phone`, `servicePointId`,
  `isTakeaway`, le paiement choisi et `source: 'borne'` quand supporte.
- L'echec d'impression ne remet pas en cause une commande creee.

Verification manuelle:

- Connexion avec un user borne.
- Affichage direct de `/borne`.
- Ajout produit simple.
- Ajout produit avec personnalisations.
- Validation paiement comptoir.
- Validation Stripe si la boutique est configuree pour Stripe.
- Confirmation avec numero de commande et tentative d'impression.

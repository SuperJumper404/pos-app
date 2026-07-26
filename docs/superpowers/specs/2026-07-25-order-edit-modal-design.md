# Modification d'une commande dans une modale

## Objectif

Permettre au personnel cuisine/admin de modifier une commande depuis sa page de détails sans perdre le contexte visuel de cette commande. Le menu puis le panier s'affichent dans une modale plein écran au-dessus du détail. Les règles métier, les appels API et le parcours client mobile restent inchangés.

## Périmètre

- Le nouveau parcours démarre uniquement depuis `pages/orders/detail/_id.vue`.
- La modification est disponible uniquement lorsque l'utilisateur a l'accès cuisine/admin (`access === 0`) et que la commande satisfait déjà `canEditOrder`.
- Les clients mobiles (`access` 2 ou 3) ne peuvent pas modifier une commande. Ils conservent le parcours existant pour créer une nouvelle commande ou une commande complémentaire.
- Les pages autonomes `/menus` et `/cart` continuent de fonctionner comme aujourd'hui.
- Aucun endpoint, calcul de prix, traitement Stripe ou format de payload n'est modifié.

## Architecture

Un composant `components/orders/OrderEditModal.vue` porte la `v-dialog` plein écran et son état de navigation interne :

- étape `menu` : affiche la logique actuelle de `pages/menus.vue` en mode intégré ;
- étape `cart` : affiche la logique actuelle de `pages/cart.vue` en mode intégré.

Les deux pages reçoivent une propriété explicite indiquant qu'elles sont intégrées. Dans ce mode, les transitions qui utilisent actuellement le routeur émettent des événements vers la modale. Hors de ce mode, leur comportement de navigation reste inchangé. Cette adaptation réutilise les composants et le store existants sans dupliquer la logique métier.

La page de détail reste responsable de l'initialisation de la session `orderEdit`, car elle possède déjà les contrôles contre les requêtes périmées, le panier local et les paiements incertains. Une fois `orderEdit/begin` réussi, elle ouvre la modale au lieu de naviguer vers `/menus`.

## Flux utilisateur

1. Le personnel ouvre le détail d'une commande modifiable.
2. Il clique sur « Modifier la commande ».
3. Les contrôles actuels sont exécutés sans changement. Si un panier doit être remplacé, la confirmation existante reste affichée avant l'ouverture.
4. Après le chargement réussi de la session d'édition, la modale plein écran s'ouvre sur le menu avec un titre rappelant le numéro de commande.
5. Le personnel modifie les quantités, les produits et les personnalisations avec les écrans existants.
6. « Continuer » ouvre le panier dans la même modale. « Retour au menu » revient à l'étape menu sans fermer la modale.
7. Après un enregistrement réussi, la modale se ferme et le détail de commande est rechargé.

## Fermeture et annulation

- La fermeture volontaire et le bouton « Annuler » utilisent la logique d'annulation existante de `orderEdit`.
- Si la commande a été modifiée, une confirmation protège contre la perte des changements.
- Une fermeture confirmée laisse l'utilisateur sur le détail de la même commande et recharge son état si nécessaire.
- Une erreur de chargement ou d'enregistrement reste affichée par les mécanismes de notification actuels ; elle ne ferme pas automatiquement la modale.

## Contrôle d'accès

Le rendu du bouton de modification et l'ouverture de la modale exigent tous deux `access === 0`. Le second contrôle empêche une ouverture programmatique accidentelle. La règle métier `canEditOrder` reste également obligatoire. Le bouton de commande complémentaire et les parcours QR/mobile ne sont pas convertis en modale.

## Compatibilité

- La modale est plein écran afin de préserver l'espace nécessaire aux grilles de produits et au panier, y compris sur les écrans de cuisine de petite taille.
- Le détail reste monté derrière la modale afin de rendre explicite que l'utilisateur modifie cette commande.
- Les comportements `/menus` et `/cart` restent la référence hors modale ; le mode intégré ne remplace que les appels de navigation concernés par des événements.

## Tests et validation

Les tests automatisés couvriront au minimum :

- l'accès cuisine/admin peut démarrer la modification modale ;
- un client mobile ne voit pas et ne peut pas ouvrir cette modification ;
- une initialisation réussie ouvre la modale sans navigation vers `/menus` ;
- le menu intégré passe au panier intégré et le panier peut revenir au menu ;
- un enregistrement réussi ferme la modale et recharge le détail ;
- une annulation confirmée ferme la modale et nettoie la session ;
- les pages autonomes conservent leurs navigations actuelles.

La validation finale comprend le test ciblé de modification de commande, la suite de tests du frontend et `npm run lint`.

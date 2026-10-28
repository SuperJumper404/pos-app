# Paiements TPE autonomes avec commandes en pièces jointes

Date : 28 octobre 2026. Statut : conception proposée, à valider avant implémentation.

Relecture indépendante effectuée, y compris après la correction de l'historique demandée par l'utilisateur : une liste unique mêlant commandes et paiements TPE. Aucune question importante ne reste à résoudre pour préparer le plan. Les choix proposés ci-dessous restent soumis à la validation de l'utilisateur.

## Besoin confirmé

Un membre du personnel disposant d'un TPE Stripe connecté peut saisir un montant dans une modale accessible par un bouton à côté d'Accueil. Le serveur crée un PaymentIntent et l'envoie au véritable terminal. Ce paiement existe sans commande et figure dans l'historique.

L'utilisateur a confirmé que chaque paiement TPE doit apparaître comme une ligne dans la même liste que les commandes de la page Historique. Aucun onglet supplémentaire n'est ajouté.

L'utilisateur a précisé que les commandes ajoutées ensuite sont uniquement des pièces jointes facultatives. Leur somme peut être inférieure, supérieure ou égale au paiement. Aucune différence n'est calculée, créditée ou remboursée automatiquement. Le rattachement ne règle pas les commandes, ne change pas leur statut et ne lance aucun nouveau débit.

## Approches et choix

1. Réutiliser les allocations actuelles de règlement des commandes : incompatible avec le besoin confirmé. Elles exigent des commandes, rapprochent les montants et finalisent leur paiement.
2. Conserver un paiement autonome et des pièces jointes informatives séparées : approche retenue à partir de la précision de l'utilisateur. Réutiliser le cycle Stripe Terminal, les lecteurs affectés, les commissions et les protections contre les doubles débits. Isoler le nouveau type de paiement et les pièces jointes dans les contrats de données.

Une nouvelle table complète de paiements avec son propre cycle Stripe dupliquerait les verrous du lecteur, la reprise et les notifications Stripe. Le choix technique proposé est donc de conserver les paiements dans `stripe_terminal_payments`, avec un type explicite, et d'ajouter une table de pièces jointes indépendante des allocations financières.

Il s'agit d'une évolution frontend et backend avec migration SQL, et non d'un simple ajout de bouton. Nuxt 2, Vue 2, Vuex et Vuetify sont conservés. Aucune dépendance supplémentaire n'est prévue.

## Parcours proposé

### Ouvrir le TPE

- Ajouter un bouton portant une icône de terminal et un libellé accessible « Paiement TPE » dans les actions de la barre supérieure, immédiatement à côté du bouton Accueil lorsqu'il est affiché.
- Choix proposé : le bouton reste également accessible sur l'accueil et sur mobile dans la barre supérieure. Ne pas reprendre la restriction actuelle du bouton Accueil aux écrans moyens et grands.
- Réserver le bouton au personnel disposant de l'accès `cashregister`, sur les pages internes. Exclure sessions publiques, clients, livreurs et bornes.
- Afficher l'entrée de saisie lorsqu'un lecteur actif, en ligne et affecté à l'utilisateur est disponible. Vérifier également côté serveur la disponibilité du compte Stripe et du lecteur au démarrage du paiement.
- Après perte de connexion ou désaffectation, une tentative existante reste consultable et récupérable. Une perte de disponibilité interdit seulement une nouvelle tentative.

### Modale de saisie et d'encaissement

- Présenter un boîtier de TPE stylisé, cohérent avec Vuetify : nom du lecteur, écran affichant le montant en euros, clavier numérique, correction/effacement et action verte « Envoyer au TPE ».
- Le clavier saisit un montant uniquement. La carte et le code confidentiel sont utilisés sur le terminal physique.
- Gérer les centimes avec un entier, y compris la saisie au clavier physique, sans addition monétaire en virgule flottante. Valider le montant côté client et serveur selon les bornes Stripe applicables aux paiements EUR et les limites du stockage.
- Verrouiller le montant et le bouton d'envoi pendant une tentative. Afficher les états préparation, attente de carte, confirmation, réussite, refus/échec, annulation et vérification nécessaire.
- La fermeture de la modale ne signifie pas une annulation. Le suivi reprend à la réouverture ; le bouton d'annulation utilise le parcours serveur existant et attend sa confirmation.
- Une réussite présente le montant encaissé et un accès à sa ligne dans la page Historique. Elle ne crée ni panier, ni commande, ni archive de commande.

### Historique et pièces jointes

- Intégrer les paiements autonomes comme des lignes de la liste existante dans `/history`, au milieu des commandes, sans nouvel onglet. Chaque paiement autonome occupe une seule ligne, quel que soit son nombre de pièces jointes.
- Une ligne de paiement porte le libellé distinct « Paiement TPE », sa référence, sa date, son montant et son état. Le caissier, le lecteur et le nombre de commandes jointes sont accessibles sur cette ligne ou dans son détail. Les colonnes propres aux commandes, telles que table, client ou préparateur, affichent un tiret lorsqu'elles ne s'appliquent pas.
- Les tentatives en cours ou échouées restent identifiables et ne sont jamais présentées comme encaissées. Les paiements TPE déjà utilisés pour régler des commandes ne créent pas de ligne autonome supplémentaire dans cette évolution.
- Les commandes conservent leurs actions actuelles ; les paiements proposent « Commandes jointes » pour ouvrir leurs liens et une recherche permettant d'en ajouter plusieurs ou de les retirer. Une action de suppression, d'impression ou d'expansion propre aux commandes ne doit jamais recevoir une ligne de paiement.
- Distinguer explicitement les types de lignes et utiliser une clé composée, par exemple `order:123` ou `terminal-payment:123`, pour éviter les collisions d'identifiants, de sélection et d'expansion.
- La recherche, le tri et la pagination portent sur l'ensemble des deux types. Ne pas fusionner une page partielle de paiements avec toutes les commandes. Le serveur fournit une liste commune paginée, triée par date d'archivage de la commande ou date de confirmation du paiement, avec repli sur la date de création pour une tentative ou une ancienne archive, et un départage stable en cas d'égalité. La date affichée correspond à cette date d'historique. L'ajout d'une pièce jointe ne change pas la position du paiement.
- Choix proposé pour ce premier périmètre : sélectionner les commandes déjà présentes dans l'historique du même commerce. Les commandes actives restent hors de cette sélection, ce qui évite d'introduire un nouveau suivi de leur déplacement vers les archives.
- Les commandes payées et non payées peuvent être jointes, sans comparaison des montants. La même commande peut être jointe à plusieurs paiements. Un doublon dans le même paiement n'est pas créé.
- Les pièces jointes peuvent être modifiées seulement sur un paiement autonome confirmé, par un membre du personnel disposant de l'accès `history`. La lecture et les liens disponibles suivent ce même droit, dans le commerce authentifié.
- Conserver une petite copie serveur de la référence et du montant de la commande lors de l'ajout. Si une archive est supprimée ou masquée ultérieurement, conserver ce justificatif et indiquer que la commande d'origine n'est plus disponible, sans restituer ses détails devenus inaccessibles.
- Afficher explicitement « Pièces jointes informatives : ces commandes ne sont pas réglées par ce rattachement » dans la modale d'association.

## Données et interfaces serveur

### Stockage

- Ajouter `payment_kind` à `stripe_terminal_payments`, avec la valeur par défaut `order` pour tous les paiements existants et `standalone` pour les nouveaux. Les paiements borne et caisse gardent leur comportement actuel.
- Ajouter une date de confirmation dédiée, renseignée de manière idempotente à la confirmation Stripe, afin de ne pas modifier la date d'encaissement lorsqu'une pièce jointe change. Conserver `created_at` pour la date de tentative.
- Ajouter `stripe_terminal_payment_attachments` avec le commerce, le paiement, l'identifiant d'archive, une copie minimale de la référence et du montant, l'auteur et la date d'ajout. Contrainte d'unicité sur paiement et archive. Ne pas supprimer la copie avec l'archive source.
- Aucun ajout dans `stripe_terminal_payment_orders`, `orders` ou `archives` pour un paiement autonome. Les pièces jointes n'entrent jamais dans les allocations ou les remboursements d'une commande.

### Opérations dédiées

Prévoir des opérations sous `/stripe/terminal/standalone-payments` : démarrage avec `amountCents` et clé de tentative, liste paginée/recherche, lecture d'un paiement, annulation et ajout/retrait de pièces jointes. Prévoir également une recherche paginée des archives joignables, ou réutiliser une recherche existante si elle garantit les mêmes droits et filtres.

Pour la page Historique, ajouter une lecture commune des entrées de commandes archivées visibles et de paiements autonomes du commerce, avec type, clé de ligne, date d'historique et champs d'affichage. Effectuer recherche, tri et pagination sur cette source commune côté serveur ; préserver les filtres de visibilité des archives. Conserver les opérations existantes de détail, de ticket et de suppression des commandes. Le choix du nom exact de cette lecture et de son découpage interne reste à l'implémentation.

L'identifiant du commerce et du personnel vient exclusivement de la session. Le lecteur est celui affecté à l'utilisateur, jamais un lecteur arbitraire fourni par le client. Refuser les identifiants d'autres commerces et les types de paiement incorrects.

Le démarrage et l'annulation suivent les droits `cashregister` et les règles de propriétaire actuelles. Un utilisateur de l'historique peut consulter les paiements de son commerce et modifier leurs pièces jointes, sans obtenir le droit d'annuler les tentatives d'un autre caissier. Les contrôles sont appliqués au serveur, pas seulement au bouton.

Utiliser des réponses dédiées validées dans le store : `paymentKind`, identifiant, montant en centimes, devise, lecteur, état, dates, erreur sûre et pièces jointes. Un paiement autonome réussi peut avoir zéro commande. Ne pas assouplir le validateur des paiements de commandes, dont les allocations restent obligatoires.

### Cycle Stripe, concurrence et reprise

- Réutiliser les paramètres de PaymentIntent carte présente, capture automatique et commissions Connect déjà utilisés, ainsi que le verrou commun du lecteur. Tous les parcours partagent la contrainte d'un paiement actif par lecteur.
- Une clé de tentative stable est créée avant l'envoi et conservée pour la reprise. Une nouvelle requête avec la même clé récupère le même paiement ; un montant différent avec cette clé est refusé. Isoler les clés par commerce/utilisateur/type pour éviter toute collision.
- Ne jamais annuler ni remplacer implicitement une tentative de caisse ou de borne pour démarrer un paiement libre. Si le lecteur est occupé par une autre tentative, afficher l'indisponibilité.
- En cas de réponse réseau incertaine, rechercher/réconcilier la tentative existante avant tout nouvel envoi. Conserver les protections actuelles contre une création Stripe réussie dont la réponse ou l'écriture locale échoue.
- La notification Stripe et la vérification serveur du PaymentIntent sont les seules sources de confirmation. Vérifier l'identité du paiement, le commerce, le montant, la devise et les métadonnées avant de confirmer.
- La finalisation du type `standalone` met à jour uniquement le paiement et son justificatif carte, sans rechercher d'allocations ni toucher les commandes, stocks, fidélité ou livraison. Conserver les exigences de finalisation actuelles pour le type `order`.
- Le traitement des notifications Stripe doit distinguer ces types, y compris lorsque la modale ou le navigateur est fermé. Les notifications répétées et les vérifications simultanées restent idempotentes.
- Conserver en local seulement la clé/identité de tentative nécessaire à la reprise, dans le contexte commerce et caissier. Nettoyer l'état au changement de session ; ne pas exposer de secret Stripe.

## Limites proposées

- Ce périmètre ajoute l'encaissement autonome et son historique avec pièces jointes. Il ne crée ni vente de produits, ni ventilation de TVA, ni ticket de commande fictif.
- Les rapports actuels de ventes et tickets Z restent calculés à partir des commandes selon leurs règles existantes. Ajouter une pièce jointe ne modifie aucun de leurs totaux. Un rapport comptable global regroupant ces nouveaux encaissements et les ventes nécessiterait des règles distinctes et reste hors de cette demande.
- Les remboursements existants de commandes restent indépendants. Le remboursement d'un paiement libre depuis cette nouvelle interface n'est pas demandé dans ce périmètre.
- L'impression d'un nouveau ticket et la sélection de commandes actives ne sont pas incluses dans ce premier périmètre. Réutiliser les informations de carte minimales déjà autorisées dans l'application lorsqu'elles sont disponibles.

## Vérification prévue

Ajouter des tests ciblés pour le montant, la clé de tentative, les droits et l'isolation par commerce, le lecteur occupé, la reprise après coupure réseau, la notification Stripe et l'absence totale de mutation des commandes. Vérifier qu'un paiement de 50 EUR peut rester sans pièce jointe puis recevoir des commandes de 40 EUR ou 60 EUR, et que l'ajout/retrait ne modifie aucun paiement ni statut de commande.

Vérifier les collisions entre parcours caisse, borne et paiement libre sur un même lecteur, les confirmations répétées, les archives supprimées, les réponses tardives après changement de session et la compatibilité des anciens DTO. Exécuter les tests Stripe Terminal, historique et navigation concernés, puis le lint frontend et une compilation locale. Contrôler visuellement la modale et l'historique sur bureau et mobile. Utiliser seulement des tests simulés pour les transactions ; aucun débit réel sans demande spécifique.

Vérifier aussi une liste contenant une commande et un paiement ayant le même identifiant numérique, les actions propres à chaque type, la recherche et la pagination mêlant les deux types, le tri stable, l'absence de nouvel onglet et l'absence de lignes supplémentaires pour les paiements TPE existants liés au règlement des commandes.

## Décisions laissées à l'implémentation

Le découpage précis des composants et helpers, les noms finaux des méthodes, les index nécessaires à la pagination et les détails visuels peuvent être décidés en respectant les patterns voisins. Garder les changements ciblés dans `layouts/default.vue`, un composant de modale, l'historique, le store Terminal et les services/modules/routes backend concernés.

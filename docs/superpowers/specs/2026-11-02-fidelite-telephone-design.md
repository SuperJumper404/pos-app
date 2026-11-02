# Fidélité par téléphone, sans code

L'utilisateur confirme l'adhésion uniquement par numéro de téléphone, sans e-mail et sans code SMS. Depuis le QR actif d'une table, un numéro déjà inscrit rouvre automatiquement la même carte. La caisse et la borne continuent à retrouver les cartes existantes et à cumuler/dépenser des points ; elles ne créent aucune adhésion.

## Approche retenue

Créer un accès propre à la fidélité, avec cookie signé limité au restaurant et à la carte. Une colonne nullable `phone_e164`, unique par restaurant, contient le numéro déclaré normalisé. Les nouveaux adhérents ont une fiche client sans identité vérifiée créée artificiellement. Une recherche unique dans les anciens numéros vérifiés ou dans les nouveaux numéros déclarés retrouve la carte existante ; une collision ambiguë est refusée.

Réutiliser une session générale de compte client sans vérification aurait aussi ouvert les données privées de ce compte ; cette approche est écartée. Imposer un code SMS ou un e-mail est écarté conformément à la demande explicite. Le cookie fidélité n'est accepté que pour la carte, ses préférences, Wallet et l'association d'une commande QR sur place. Les adresses et autres fonctions de compte client conservent leur authentification.

## Comportement

- Formulaire téléphone dans Ma fidélité et dans le panier QR ; consentement offres facultatif et séparé.
- Adhésion/ouverture par téléphone exige un QR de table signé encore actif du même restaurant, une origine autorisée et un quota partagé en SQL. Aucun envoi SMS/e-mail.
- Le navigateur conserve pendant 30 jours l'accès à sa carte ; lecture et Wallet utilisent cette session limitée, avec protection CSRF pour les mutations.
- Un numéro déjà connu retourne la carte et les points existants. Il ne crée pas une seconde carte et ne remplace pas le consentement déjà choisi.
- La commande QR transporte la session fidélité et fige l'identité et la confirmation de la récompense pour les reprises. Le serveur reste responsable de l'association et du prix.
- Même calcul de points, réservations, cumul après paiement et Wallet que précédemment. Les comptes et les cartes existants restent utilisables.
- Aucun programme, adhérent ou solde de démonstration ajouté au staging. L'utilisateur configure lui-même son programme.

## Vérification

Tests de normalisation, doublon/concurrence, ambiguïté et isolation restaurant ; refus des QR de borne/expirés et des origines interdites ; absence d'accès au compte général avec le cookie fidélité ; commande QR et reprise avec session figée ; mise à jour des tests frontend, intégration MySQL 8 jetable, signature Wallet existante et contrôle navigateur du formulaire téléphone. Déploiement Docker staging après sauvegarde, backend puis frontend. L'installation physique sur iPhone et la livraison APNs restent un essai utilisateur.

# Admin principal dans Staff

## Objectif

Afficher l'administrateur principal du shop dans `Staff / Equipe`, au-dessus des autres membres, sans le confondre avec un compte equipe ordinaire.

## Comportement

- La liste conserve tous les comptes staff, y compris celui dont `is_primary_admin` vaut `1`.
- L'administrateur principal est trie en premier et identifie visuellement comme `Admin`.
- Son nom peut etre modifie depuis la fiche Staff.
- Son role, ses modules, son statut, son ID caisse et son PIN ne sont pas modifiables depuis cette page.
- Les actions de suppression et de regeneration du PIN sont absentes pour ce compte.

## Donnees et securite

L'API utilisateurs fournit deja `is_primary_admin`. Le frontend utilise ce champ uniquement pour le tri et les controles de l'interface. Aucune nouvelle route ni migration n'est necessaire.

## Verification

Les tests frontend verifieront que le store conserve l'admin principal et que la page masque les actions sensibles pour lui. Les tests existants de Staff continueront de passer.

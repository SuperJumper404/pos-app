# Liens informatifs entre paiements et commandes

**Objectif :** autoriser les pièces jointes quel que soit le statut du paiement TPE, y compris annulé, et inclure les commandes en cours. Aucun lien ne règle une commande, ne modifie son statut ou ne rapproche ses montants.

**Architecture :** conserver les références d'archives existantes et ajouter une référence de commande active nullable, avec unicité par paiement. Lors de l'archivage, renseigner la référence d'archive dans la même transaction ; conserver l'identité de commande pour les retraits tardifs. Distinguer les deux sources dans la sélection, leurs identifiants pouvant être identiques.

- [x] Régressions backend : paiement annulé/en cours, commandes actives/archives, collisions d'identifiants, isolation boutique, ajout/retrait sans mutation financière.
- [x] Migration additive, liens à l'archivage, liste paginée mixte et API compatible avec les archives existantes.
- [x] Store et fenêtre : liens actifs, sélection des deux sources, état de commande visible, aucune condition de paiement confirmé.
- [x] Vérifications ciblées, suites complètes frontend/backend, lint et navigateur bureau/mobile avec API simulée.
- [x] MySQL 8 réel : migration et tests sur schéma QA isolé, supprimé ensuite ; association à un paiement annulé, pagination mixte, archivage réel et rollback après échec, retrait via l'identité d'origine.
- [ ] Migration et déploiement Docker staging, après sauvegarde de la base.

La base Docker locale était indisponible ; la vérification SQL utilise un schéma temporaire indépendant sur le serveur de staging et n'altère aucune commande de la boutique.

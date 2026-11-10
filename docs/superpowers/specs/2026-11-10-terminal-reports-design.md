# Paiements TPE autonomes et clôture de caisse

Fonctionnement approuvé dans le chat le 10 novembre 2026.

- Ajouter les paiements TPE autonomes réussis aux encaissements des statistiques et des rapports X/Z, sans créer de commandes ou de lignes produits fictives.
- Ticket X : consulter et imprimer la période ouverte sans la clôturer. Ticket Z : figer les totaux et conserver l'historique.
- Avant clôture, saisir et corriger les espèces présentes et le total carte constaté. Conserver les montants calculés, déclarés et les écarts ; ne pas remplacer les ventes par une déclaration.
- Réutiliser Nuxt 2, Vuex, Vuetify et les mécanismes existants. Aucun changement de navigation principale ni nouvelle dépendance.

## Approche retenue

Étendre les calculs serveur partagés puis l'écran Rapports. Un ajout uniquement visuel laisserait les archives Z incomplètes ; recalculer les anciens Z modifierait des clôtures figées.

## Décisions d'implémentation

- Les pièces jointes d'un paiement autonome sont informatives : elles ne modifient ni le règlement des commandes ni les montants. Lire chaque paiement une seule fois, sans multiplier son montant par ses pièces jointes.
- Les statistiques utilisent la date de confirmation. Les commandes, le panier moyen et les produits restent calculés sur les commandes seules.
- Un paiement autonome réussi est associé atomiquement à un seul Z. Les anciens paiements jamais rapportés ou confirmés tardivement sont repris dans le prochain Z, même s'ils précèdent son ouverture.
- Aucun taux de TVA n'est déduit d'un montant libre ; sa TVA reste non ventilée et signalée séparément.
- Le montant espèces calculé représente les mouvements de la période (ventes caisse + remises livreurs - restitutions caisse), sans fonds initial. Le total carte comprend la carte au comptoir et les TPE, sans Stripe en ligne.
- La saisie reste modifiable avant validation. Après validation, les montants sont figés. Les anciens Z sans déclaration restent lisibles.
- La migration ajoute un résumé TPE et le rapprochement en JSON à cash_closures, ainsi qu'une référence de clôture aux paiements autonomes.

## Vérification

Tests des sommes, périodes, absence de doublons, clôture avec uniquement des paiements autonomes, saisies invalides et zéro explicite, conservation des déclarations et des anciens Z ; tests du parcours X/Z, du store et de l'impression. Lint et build local du frontend.

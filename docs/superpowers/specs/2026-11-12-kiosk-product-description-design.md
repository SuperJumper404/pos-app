# Description produit en mode borne

Direction approuvée dans la conversation : intégrer la présentation du produit à la première étape existante, sans écran intermédiaire.

- Afficher une petite photo et la description au-dessus des premiers choix, uniquement à la première étape visible.
- Déplier les descriptions longues avec « Voir plus » dans la même fenêtre.
- Garder les actions en bas et les validations actuelles des options.
- Pour un produit sans options, ouvrir une fiche photo/description/prix avec « Ajouter au panier », sans résumé ni étape fictive.
- Ne pas laisser de bloc vide quand le produit n'a ni photo ni description.
- Limiter ce comportement à la borne ; le composant partagé conserve ses valeurs par défaut pour les autres parcours.

Alternative considérée : une fiche intermédiaire avant les options met davantage le produit en avant, mais impose une action supplémentaire à chaque personnalisation. La présentation intégrée a été retenue pour garder un parcours rapide.

Contraintes : Nuxt 2, Vue 2 et Vuetify existants, aucune dépendance ni modification d'API.

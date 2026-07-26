# Correction des textes français du frontend

## Objectif

Corriger les accents, l'encodage et les fautes d'orthographe dans tous les textes français visibles du frontend POS, sans modifier le comportement fonctionnel.

## Périmètre

- Pages, composants, layouts, notifications et validations affichés à l'utilisateur.
- Libellés utilisés à l'écran ou dans les sorties imprimables produites par le frontend.
- Messages statiques définis dans les stores et helpers frontend.

Sont exclus les identifiants JavaScript, clés d'API, routes, noms de propriétés, valeurs techniques, données saisies par les utilisateurs, réponses dynamiques du backend, commentaires et logs de développement.

## Approche

Les corrections sont réalisées fichier par fichier sur les chaînes visibles. Aucun remplacement global aveugle et aucune migration vers une bibliothèque i18n ne sont introduits. Les textes corrompus par un mauvais encodage sont remplacés par leur forme UTF-8 correcte.

Un test statique ciblé protège les principales régressions observées : séquences d'encodage corrompues et formulations fautives récurrentes dans les sources destinées à l'utilisateur.

## Contraintes

- Conserver Nuxt 2, Vue 2 et Vuetify existants.
- Ne modifier aucune logique métier ni contrat API.
- Ne pas ajouter de dépendance.
- Respecter la typographie française, notamment les accents sur les majuscules et l'espace avant les signes doubles lorsque le libellé est réécrit.
- Limiter les changements aux fichiers contenant réellement un texte visible à corriger.

## Validation

- Test statique des chaînes françaises.
- Suite de tests frontend existante.
- ESLint sur les fichiers modifiés.
- Build local Nuxt.

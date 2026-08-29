# Refonte de la fiche publique d’établissement

## Objectif

Transformer la page publique Click & Collect existante en une fiche d’établissement sobre et premium qui conduit rapidement vers la commande. La page reste entièrement en lecture seule et réutilise exclusivement les données et comportements déjà disponibles.

## Public et contexte

La page est destinée aux clients qui consultent principalement le restaurant depuis leur téléphone. Ils doivent pouvoir comprendre immédiatement où se trouve l’établissement, s’il est ouvert, quand il ouvre et comment commander. La version desktop conserve une composition verticale centrée, sans devenir un tableau de bord large.

## Principes

- Mobile-first, tactile et très responsive.
- Une seule action primaire : `Commander maintenant`.
- Grande photographie d’établissement en ouverture.
- Informations pratiques avant la galerie de produits.
- Style sobre et premium : surfaces claires, texte fortement contrasté, couleur primaire réservée à l’action.
- Aucun prix ni titre sur les images de produits.
- Aucun nouveau champ, endpoint ou comportement métier.
- Respect de `prefers-reduced-motion` et des contrastes WCAG AA.

## Architecture de la page

### 1. Hero immersif

La photo de profil du restaurant occupe l’ouverture. Un voile sombre garantit la lisibilité du nom, de l’adresse et du statut d’ouverture. Le bouton de commande est visible sans attendre sur desktop. Sur mobile, l’action principale reste persistante en bas de l’écran.

Le hero conserve le fallback d’image existant et les liens téléphone/cartographie déjà disponibles.

### 2. Informations pratiques

Une section compacte suit immédiatement le hero. Elle rassemble l’adresse, le téléphone et les horaires dans une hiérarchie scannable. L’adresse ouvre l’itinéraire et le téléphone reste directement appelable.

Les horaires utilisent une liste simple, avec le jour courant identifiable sans dépendre uniquement de la couleur. Les informations sont présentées sur une seule colonne mobile et peuvent se répartir en deux zones sur desktop, tout en restant dans un axe vertical étroit.

### 3. Présentation et actualité

La description du restaurant apparaît après les informations pratiques. Le message de statut client existant est conservé lorsqu’il est renseigné, mais présenté comme une information calme et lisible plutôt que comme une animation dominante.

### 4. Galerie de produits

Les produits chargés automatiquement par l’endpoint existant restent limités à la collection reçue. La galerie conserve les images seules, sans noms ni prix. Sa mosaïque doit afficher jusqu’aux douze produits sans trou visuel sur mobile ou desktop.

La galerie est secondaire par rapport aux informations pratiques : elle donne envie sans retarder l’accès aux horaires ou à l’adresse.

### 5. Réseaux et pied de page

Les réseaux disponibles sont regroupés dans une section discrète. Les liens absents ne produisent aucun espace vide. Le pied de page reste minimal.

## Responsive

- Mobile : une colonne, hero immersif, informations empilées, CTA fixe avec prise en compte de la safe area.
- Tablette : contenu centré avec gouttières renforcées et galerie adaptée à la largeur disponible.
- Desktop : page verticale plafonnée en largeur, hero plus ample, informations pratiques en deux zones et CTA intégré au contenu.
- Les titres ne changent pas de manière fluide excessive ; l’échelle typographique reste celle d’une interface produit publique claire.

## États et robustesse

- Image d’établissement absente ou en erreur : logo existant.
- Aucun produit illustré : la galerie disparaît sans laisser de vide.
- Réseau social absent : son action n’est pas rendue.
- Cuisine fermée : l’action de commande conserve le message existant et ne crée pas de navigation invalide.
- Horaires incomplets : affichage neutre et lisible sans erreur d’exécution.
- Chargement de commande : état `loading` existant et prévention des doubles actions.

## Périmètre technique

La refonte reste principalement dans `pages/click-and-collect/_shopId/_shopName.vue`. Elle réutilise Vue 2, Vuetify, le store et l’appel Axios existants. Aucun changement backend et aucune nouvelle dépendance ne sont prévus.

## Validation

- Test ciblé sur le chargement et le filtrage des produits.
- Assertions structurelles sur l’ordre des sections et la présence du CTA.
- ESLint Vue/JavaScript.
- Détecteur Impeccable sur la page.
- Vérification visuelle mobile et desktop si le serveur local est disponible.


# Theme par restaurant pour menu, click-and-collect et borne

Date: 2026-08-30

## Contexte

Le frontend POS est une application Nuxt 2/Vue 2/Vuetify. Les couleurs globales
existent deja en CSS variables dans `assets/scss/design-system.scss`, mais les
pages menu et borne contiennent encore plusieurs couleurs codees en dur. Le
click-and-collect public utilise deja largement ces variables.

L'objectif est de permettre a chaque restaurant de choisir un theme
preconfigurable et de modifier les couleurs de ce theme depuis les reglages. Le
theme doit etre persistant en base et s'appliquer aux experiences suivantes:

- menu client et menu caisse dans `pages/menus.vue`;
- page publique click-and-collect dans `pages/click-and-collect/_shopId/_shopName.vue`;
- borne dans `pages/borne.vue`.

## Decision principale

Le theme sera un objet JSON global par restaurant, stocke dans la table `shop`
via une colonne `shop_theme` de type `TEXT` nullable avec fallback applicatif sur
le theme `default`.

Le premier lot couvre uniquement les couleurs. Il n'y aura pas encore
d'overrides separes par ecran. Les memes tokens s'appliquent donc au menu, au
click-and-collect et a la borne.

## Format du JSON

Le JSON initial est:

```json
{
  "preset": "default",
  "colors": {
    "primary": "#1976d2",
    "primaryHover": "#155fa8",
    "primarySoft": "#e8f2ff",
    "background": "#f3f5f8",
    "surface": "#ffffff",
    "surfaceMuted": "#f8fafc",
    "border": "#dfe5ee",
    "borderSoft": "#e8edf3",
    "text": "#121826",
    "textBody": "#1f2933",
    "textMuted": "#687386",
    "success": "#00e676",
    "warning": "#ffa014",
    "danger": "#d83b3b"
  }
}
```

Tous les champs couleur doivent accepter uniquement des valeurs hexadecimales au
format `#RGB` ou `#RRGGBB`. Une couleur invalide est remplacee par la valeur du
theme `default`.

## Backend

Ajouter une migration SQL dans `../express-pos/db/migrations/`:

- ajouter `shop.shop_theme TEXT NULL`;
- initialiser les lignes existantes avec le JSON `default`;
- fournir une migration down qui supprime la colonne.

Ajouter un helper backend de normalisation, par exemple
`src/helpers/shopTheme.js`, responsable de:

- definir `DEFAULT_SHOP_THEME`;
- exposer `normalizeShopTheme(value)`;
- parser les chaines JSON et accepter les objets deja parses;
- conserver le preset si valide, sinon `default`;
- merger les couleurs avec les valeurs par defaut;
- rejeter les champs inconnus pour eviter de stocker du JSON non maitrise.

Mettre a jour `src/controllers/c_shop.js` et `src/modules/m_shop.js`:

- `createAndInitializeShop` cree un restaurant avec le theme `default`;
- `getShopInfo` renvoie `shop_theme` via le `SELECT *` existant;
- `getShopInfoClickAndCollect` expose aussi `shop_theme`;
- `updateShopInfo` accepte `req.body.shop_theme`, le normalise et le sauvegarde;
- `mUpdateShopInfo` inclut `shop_theme = ?`.

## Frontend

Ajouter `helpers/shopThemes.js`:

- `DEFAULT_SHOP_THEME`;
- `SHOP_THEME_PRESETS`, avec au minimum `default`;
- `SHOP_THEME_COLOR_FIELDS`, pour piloter l'UI de reglages;
- `normalizeShopTheme(value)`;
- `shopThemeToCssVars(theme)`.

Ajouter un plugin client, par exemple `plugins/shopTheme.client.js`, declare dans
`nuxt.config.js`, qui:

- observe le theme courant du store;
- normalise le theme;
- applique les variables CSS sur `document.documentElement`;
- nettoie ou remplace les variables quand le theme change.

Les variables appliquees doivent reutiliser la nomenclature existante:

- `primary` -> `--se-color-primary`;
- `primaryHover` -> `--se-color-primary-hover`;
- `primarySoft` -> `--se-color-primary-soft`;
- `background` -> `--se-color-bg`;
- `surface` -> `--se-color-surface`;
- `surfaceMuted` -> `--se-color-surface-muted`;
- `border` -> `--se-color-border`;
- `borderSoft` -> `--se-color-border-soft`;
- `text` -> `--se-color-text`;
- `textBody` -> `--se-color-text-body`;
- `textMuted` -> `--se-color-text-muted`;
- `success` -> `--se-color-success`;
- `warning` -> `--se-color-warning`;
- `danger` -> `--se-color-danger`.

Mettre a jour `store/shop.js`:

- ajouter `shop_theme` dans l'etat;
- hydrater ce champ dans `getShopInfo` et `getShopInfoClickAndCollect`;
- utiliser le theme normalise comme fallback.

Mettre a jour `pages/settings.vue`:

- ajouter `formShop.shop_theme`;
- hydrater depuis `shop/shop_theme`;
- ajouter une carte "Theme du restaurant";
- ajouter une dropdown de presets;
- ajouter des champs couleur pour les tokens du premier lot;
- quand un preset est choisi, remplacer les couleurs par celles du preset;
- envoyer `shop_theme` avec le reste des reglages dans le `FormData`.

Mettre a jour les pages ciblees pour consommer les variables:

- remplacer les couleurs hardcodees prioritaires dans `pages/menus.vue`;
- remplacer les couleurs hardcodees prioritaires dans `pages/borne.vue`;
- verifier que `pages/click-and-collect/_shopId/_shopName.vue` reagit bien au
  plugin et ajuster les rares couleurs restantes seulement si elles font partie
  du theme.

Les couleurs de marque des reseaux sociaux restent hardcodees et ne font pas
partie du theme restaurant.

## UX des reglages

La carte de reglage theme doit rester simple:

- un select `Theme` avec `Default` comme premier preset;
- une grille de champs couleur;
- chaque champ affiche le libelle humain du token;
- les valeurs invalides sont corrigees par la normalisation avant sauvegarde;
- l'action "Enregistrer" reste celle de la page existante.

## Compatibilite

Les restaurants existants qui n'ont pas encore `shop_theme` doivent garder
exactement le rendu actuel grace au fallback `default`.

Les pages publiques doivent fonctionner meme si l'API renvoie `null`, une chaine
vide ou un JSON invalide.

## Validation

Backend:

- ajouter ou ajuster un test cible autour de `normalizeShopTheme`;
- verifier que `getShopInfoClickAndCollect` expose `shop_theme`;
- verifier que `updateShopInfo` sauvegarde un theme valide.

Frontend:

- lancer `npm run lint`;
- verifier manuellement que le theme change depuis `settings`;
- verifier visuellement `pages/menus.vue`, la page publique click-and-collect et
  `pages/borne.vue` avec le theme `default`.

## Hors scope

- themes separes par ecran;
- typographie, arrondis, espacements ou animations configurables;
- generation automatique de palettes;
- previsualisation live avancee;
- personnalisation des images, logos ou textes.

# Audit UI et Design System

Date : 2026-08-23  
Projet : Smart Eat POS frontend  
Stack : Nuxt 2, Vue 2, Vuetify, Poppins, Material Design Icons

## Score Global

| # | Dimension | Score | Constat principal |
|---|---:|---:|---|
| 1 | Accessibilite | 2/4 | Efforts visibles sur certains boutons, mais labels/focus/contrastes incomplets selon les ecrans. |
| 2 | Performance UI | 2/4 | Beaucoup de composants Vuetify et styles locaux ; animations faibles, mais pages tres denses et styles disperses. |
| 3 | Responsive | 2/4 | Plusieurs breakpoints existent, surtout menus/accueil, mais tables/actions restent fragiles sur mobile. |
| 4 | Theming | 1/4 | Tokens Vuetify presents, mais couleurs hard-codees dans de nombreux fichiers. |
| 5 | Anti-patterns | 3/4 | Pas de gros effet "AI generated", mais incoherence systemique des cartes, ombres, tailles et statuts. |
| **Total** |  | **10/20** | **Acceptable, mais design system necessaire avant polish global.** |

## Verdict Anti-patterns

L'application ne ressemble pas a une generation IA tape-a-l'oeil : elle est clairement orientee outil metier, avec Vuetify, tables, boutons, dialogues et densite operationnelle. Le probleme principal n'est pas le style decoratif, mais l'absence de vocabulaire systeme stable.

Les signes faibles a corriger :

- Trop de couleurs locales pour les memes roles.
- Plusieurs tailles de texte equivalentes, parfois en `px`, parfois en `rem`, parfois en mots CSS comme `large`.
- Boutons d'action parfois textes + icone, parfois icone seule, avec labels a11y inegaux.
- Beaucoup de cartes imbriquees ou quasi-imbriquees dans les parcours menus/commandes.
- Ombres globalement supprimees par CSS, puis recreees localement dans certaines pages.

## Inventaire Couleurs

### Tokens Vuetify existants

Declares dans `nuxt.config.js` :

- `primary` : Vuetify `colors.blue.darken2`, rendu principal proche de `#1976d2`
- `accent` : grey darken3
- `secondary` : amber darken3
- `info` : teal lighten1
- `warning` : amber base
- `error` : deepOrange accent4
- `success` : green accent3
- `primaryPurple` : `#7e22ce`
- `lightPurple` : `#a564dd`
- `primaryWhite` : `#ffffff`

### Couleurs les plus utilisees dans le code

- `color="primary"` : 125 occurrences
- `color="success"` : 56
- `color="warning"` : 31
- `color="error"` : 15
- `color="grey"` : 10
- `color="red"` : 9
- `color="primaryPurple"` : 5
- `#1976d2` : 10
- `#ffffff` / `#fff` : 16 cumulees
- `#dfe5ee` : 7
- `rgba(0, 0, 0, 0.87)` : 7
- `rgba(0, 0, 0, 0.8)` : 12
- `#ffc107` : 4
- `#121826`, `#eef2f7`, `#687386`, `#edf1f5` : 4 chacun

### Couleurs locales remarquables

- Accueil : fond `#f3f5f8`, texte `#1f2933`, bordures `#dfe5ee`, surfaces `#ffffff`, accent `#1976d2`.
- Etats accueil : succes `#12a150`, warning `#d89800`, danger `#d83b3b`.
- Notifications : surface `#ffffff`, texte `#27272a`, muted `#71717a`, success `#00e676`, warning `#ffc107`, info `#1976d2`.
- Stocks : surface `#fbfcfe`, bordures `#e8edf3` / `#d9e3ee`, texte muted `#6b7280`, texte principal `#1f2937`.
- Menus et commandes : beaucoup de `rgba(0, 0, 0, ...)`, `#eeeeee`, `#f5f5f5`, `#000`.

### Probleme systeme

Les roles de couleur ne sont pas formalises. Par exemple `primary`, `#1976d2`, `rgba(25, 118, 210, ...)` et des bleus locaux representent souvent le meme role. Idem pour les neutres (`#f3f5f8`, `#f7f8fa`, `#f8fafc`, `#fbfcfe`, `#edf1f5`, `#eef2f7`).

## Inventaire Icones

Bibliotheque : Material Design Icons via Vuetify.

### Icones les plus frequentes

- `mdi-close-circle` : 25
- `mdi-check-circle` : 15
- `mdi-pencil` : 11
- `mdi-plus` : 11
- `mdi-trash-can` : 11
- `mdi-content-save` : 11
- `mdi-information-outline` : 10
- `mdi-package-variant-closed` : 7
- `mdi-note-text-outline` : 7
- `mdi-arrow-up` / `mdi-arrow-down` : 7 chacune
- `mdi-eye`, `mdi-cash-register`, `mdi-shape`, `mdi-close` : 6 chacune

### Roles actuels

- Navigation : `mdi-home`, `mdi-chart-box-outline`, `mdi-food`, `mdi-order-bool-descending`, `mdi-cash-register`, `mdi-history`, `mdi-account-group`, `mdi-table-chair`, `mdi-store-cog`, `mdi-web`.
- Actions CRUD : `mdi-plus`, `mdi-pencil`, `mdi-trash-can`, `mdi-delete`, `mdi-content-save`, `mdi-close-circle`.
- Commandes / caisse : `mdi-cart-check`, `mdi-cart-minus`, `mdi-cash-register`, `mdi-credit-card-check`, `mdi-printer-outline`, `mdi-receipt-text-remove-outline`.
- Stock : `mdi-package-variant-closed`, `mdi-food-apple-outline`, `mdi-alert-outline`, `mdi-bullseye-arrow`, `mdi-package-up`, `mdi-clipboard-check`.
- Social / reglages : `mdi-instagram`, `mdi-facebook`, `mdi-snapchat`, `mdi-music-note`.

### Probleme systeme

Certains roles ont plusieurs icones concurrentes : suppression (`mdi-trash-can`, `mdi-delete`, `mdi-delete-outline`, `mdi-delete-forever-outline`), fermeture/annulation (`mdi-close`, `mdi-close-circle`, `mdi-close-circle-outline`), impression (`mdi-printer`, `mdi-printer-outline`). Il y a aussi une icone probablement invalide : `mdi-tiktokbvcbcv`.

## Inventaire Typographie

### Police

- Police globale : `Poppins`, declaree dans `assets/css/styles.css`.
- Variante locale : `Poppins, sans-serif` sur certains details de commande.
- Pas de vraie seconde famille detectee.

### Tailles detectees

Classes Vuetify :

- `text-caption` : 15 occurrences
- `text-h6` : 5
- `text-h5` : 4
- `text-subtitle-1` : 4
- `text-subtitle-2` : 4
- `text-body-2` : 3
- `text-body-1` : 1

Tailles CSS locales :

- `11px`, `12px`, `13px`, `14px`, `15px`, `16px`, `17px`, `18px`, `20px`, `21px`, `22px`, `24px`, `26px`, `28px`, `42px`
- `0.72rem`, `0.78rem`, `0.8rem`, `0.82rem`, `0.86rem`, `0.88rem`, `0.9rem`, `0.92rem`, `0.95rem`, `0.98rem`, `1rem`, `1.05rem`, `1.08rem`, `1.12rem`, `1.15rem`, `1.25rem`, `1.35rem`, `1.65rem`, `2rem`, `2.15rem`, `3rem`
- Mots CSS : `medium`, `large`, `x-large`

### Probleme systeme

La typographie n'a pas encore d'echelle officielle. Les tailles sont adaptees localement pour chaque page, avec beaucoup de `!important` et quelques tailles relatives approximatives. Pour une app POS, il faut une echelle courte, stable et dense.

## Composants Vuetify Utilises

Occurrences principales :

- `v-card` : 346
- `v-btn` : 326
- `v-icon` : 289
- `v-text-field` : 97
- `v-chip` : 69
- `v-dialog` : 46
- `v-alert` : 31
- `v-data-table` : 17
- `v-switch` : 14
- `v-tab` : 12
- `v-avatar` : 10
- `v-app-bar` : 10
- `v-select` : 10
- `v-textarea` : 10
- `v-combobox` : 6
- `v-snackbar` : 6

Le design system doit donc commencer par les composants les plus structurants : boutons, cartes/panneaux, tables, champs, chips de statut, dialogues et notifications.

## Findings Priorises

### P1 - Theming disperse

Localisation : `nuxt.config.js`, `pages/index.vue`, `pages/menus.vue`, `pages/orders/detail/_id.vue`, `pages/stocks/index.vue`, `components/AppNotifications.vue`

Impact : les memes roles visuels sont recodes differemment selon les pages. Toute evolution de marque, contraste ou dark mode demandera des corrections manuelles partout.

Recommendation : creer des tokens semantiques : `surface`, `surface-muted`, `border`, `text`, `text-muted`, `primary`, `primary-soft`, `success`, `warning`, `danger`, `info`. Mapper Vuetify dessus progressivement.

Commande conseillee : `$impeccable colorize design-system`

### P1 - Actions et statuts non standardises

Localisation : commandes, menus, stocks, caisse, notifications.

Impact : un utilisateur peut voir plusieurs styles pour valider, annuler, supprimer, imprimer ou encaisser. En service, cette incoherence ralentit et augmente le risque d'erreur.

Recommendation : definir une matrice d'actions : primary, secondary, destructive, success, warning, icon-only. Definir aussi les chips de statut commande/paiement/cuisine/impression.

Commande conseillee : `$impeccable polish actions-statuses`

### P1 - Typographie trop fragmentee

Localisation : surtout `pages/index.vue`, `pages/menus.vue`, `pages/orders/detail/_id.vue`, `pages/stocks/index.vue`.

Impact : la hierarchie varie selon les pages, et les tailles `large` / `x-large` rendent le rendu moins previsible.

Recommendation : garder Poppins, mais definir une echelle produit courte : caption 11/12, meta 13, body 14, body-lg 15/16, title 18/20, page-title 24/28. Remplacer les mots CSS par des tokens.

Commande conseillee : `$impeccable typeset app`

### P2 - Accessibilite icon-only incomplete

Localisation : plusieurs boutons icon-only ; les pages stock montrent un bon exemple avec `aria-label` et `title`.

Impact : les lecteurs d'ecran et utilisateurs clavier ont une experience variable selon les modules.

Recommendation : appliquer le pattern stock a tous les boutons icon-only : `aria-label`, `title` quand utile, focus visible, cible tactile au moins 44px.

Commande conseillee : `$impeccable harden icon-buttons`

### P2 - Cartes et panneaux trop nombreux

Localisation : `pages/menus.vue`, `pages/orders/index.vue`, `pages/cashregister/details/_id.vue`, `pages/stocks/index.vue`.

Impact : l'interface depend beaucoup de `v-card`, ce qui peut rendre les ecrans lourds et moins lisibles, surtout sur tablette.

Recommendation : separer les usages : `panel` pour zone de travail, `card` pour item repetitif, `dialog-card` pour modale, `tile` pour choix tactile. Eviter d'ajouter des cartes dans des cartes sauf besoin fonctionnel.

Commande conseillee : `$impeccable layout menus`

### P2 - Ombres contradictoires

Localisation : `assets/css/styles.css` supprime toutes les ombres avec `box-shadow: none !important`, puis certaines pages remettent des ombres locales.

Impact : Vuetify perd une partie de sa hierarchie native, et les quelques ombres restantes deviennent incoherentes.

Recommendation : remplacer la regle globale par des tokens d'elevation controles : none, focus, panel, floating. Eviter les ombres decoratives fortes.

Commande conseillee : `$impeccable polish elevation`

### P2 - Responsive table/action fragile

Localisation : commandes, caisse, historique, stocks.

Impact : les tables avec beaucoup d'actions peuvent deborder ou devenir difficiles a utiliser sur mobile/tablette.

Recommendation : definir un pattern mobile : actions principales visibles, actions secondaires dans menu, table dense desktop, fiche empilee mobile.

Commande conseillee : `$impeccable adapt tables-actions`

### P3 - Icone invalide probable

Localisation : `pages/settings.vue`

Impact : l'icone TikTok risque de ne pas s'afficher.

Recommendation : remplacer par une icone valide disponible dans la version MDI du projet, ou utiliser `mdi-music-note` comme fallback.

Commande conseillee : `$impeccable polish settings`

## Proposition de Design System

### 1. Tokens couleur

```scss
$se-color-primary: #1976d2;
$se-color-primary-soft: #e8f2ff;
$se-color-brand-purple: #7e22ce;
$se-color-brand-purple-soft: #f3e8ff;

$se-color-success: #2e7d32;
$se-color-success-soft: #e8f8ef;
$se-color-warning: #d89800;
$se-color-warning-soft: #fff6df;
$se-color-danger: #d83b3b;
$se-color-danger-soft: #ffecec;
$se-color-info: #1976d2;

$se-color-bg: #f3f5f8;
$se-color-surface: #ffffff;
$se-color-surface-muted: #f8fafc;
$se-color-border: #dfe5ee;
$se-color-border-soft: #e8edf3;
$se-color-text: #121826;
$se-color-text-body: #1f2933;
$se-color-text-muted: #687386;
```

### 2. Tokens typo

```scss
$se-font-family: 'Poppins', sans-serif;

$se-font-caption: 0.75rem; // 12px
$se-font-meta: 0.8125rem; // 13px
$se-font-body: 0.875rem; // 14px
$se-font-body-lg: 1rem; // 16px
$se-font-title-sm: 1.125rem; // 18px
$se-font-title: 1.25rem; // 20px
$se-font-page-title: 1.5rem; // 24px
$se-font-display: 1.75rem; // 28px
```

### 3. Tokens espace et forme

```scss
$se-space-1: 4px;
$se-space-2: 8px;
$se-space-3: 12px;
$se-space-4: 16px;
$se-space-5: 20px;
$se-space-6: 24px;

$se-radius-sm: 6px;
$se-radius-md: 8px;
$se-radius-lg: 12px;
$se-radius-pill: 999px;

$se-touch-target: 44px;
```

### 4. Components a creer ou documenter

- `SePageHeader` : titre, sous-titre, actions principales.
- `SePanel` : conteneur de zone de travail, remplace l'usage libre de `v-card`.
- `SeActionButton` : variante `primary`, `secondary`, `success`, `danger`, `warning`, `ghost`, `icon`.
- `SeStatusChip` : statuts commande, paiement, cuisine, stock, impression.
- `SeDataTableActions` : actions desktop + adaptation mobile.
- `SeEmptyState` : icone, titre, message, action.
- `SeConfirmDialog` : confirmation destructive ou critique.
- `SeNotification` : deja proche dans `AppNotifications`, a raccorder aux tokens.

### 5. Regles iconographiques

- Garder MDI uniquement.
- Une icone par role principal.
- CRUD :
  - Ajouter : `mdi-plus`
  - Modifier : `mdi-pencil`
  - Supprimer : `mdi-trash-can`
  - Enregistrer : `mdi-content-save`
  - Annuler/Fermer : `mdi-close`
  - Confirmer : `mdi-check-circle`
- Impression : `mdi-printer-outline`
- Details : `mdi-information-outline`
- Recherche : `mdi-magnify` ou `mdi-card-search`, choisir un seul standard.

## Plan recommande

1. `$impeccable document` : generer `DESIGN.md` depuis l'existant.
2. `$impeccable colorize design-system` : formaliser les tokens couleur.
3. `$impeccable typeset app` : stabiliser l'echelle typographique.
4. `$impeccable polish actions-statuses` : uniformiser boutons, chips et statuts.
5. `$impeccable adapt tables-actions` : rendre les tables/actions fiables sur mobile.
6. `$impeccable polish` : passe finale apres migration progressive.

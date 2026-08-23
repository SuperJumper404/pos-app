---
name: Smart Eat POS
description: Interface POS restaurant claire, rapide et fiable pour le service en cours.
colors:
  primary: "#1976d2"
  primary-soft: "#e8f2ff"
  brand-purple: "#7e22ce"
  brand-purple-soft: "#f3e8ff"
  success: "#00e676"
  success-soft: "#e8f8ef"
  warning: "#ffa014"
  warning-soft: "#fff4df"
  danger: "#d83b3b"
  danger-soft: "#ffecec"
  info: "#1976d2"
  app-bg: "#f3f5f8"
  analytics-bg: "#f7f9fc"
  surface: "#ffffff"
  surface-muted: "#f8fafc"
  border: "#dfe5ee"
  border-soft: "#e8edf3"
  text: "#121826"
  text-body: "#1f2933"
  text-muted: "#687386"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Poppins, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Poppins, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.md}"
    padding: "16px"
  analytics-toolbar:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    padding: "16px 18px"
    gap: "18px 32px"
  analytics-date-field:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
    height: "36px"
    width: "178px"
  analytics-kpi-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    padding: "18px"
    minHeight: "118px"
  analytics-panel:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    headerBorderColor: "{colors.border-soft}"
    rounded: "{rounded.md}"
    overflow: "hidden"
  analytics-kpi-icon:
    size: "44px"
    rounded: "{rounded.lg}"
    revenueBackground: "{colors.success-soft}"
    revenueColor: "{colors.success}"
    ordersBackground: "{colors.primary-soft}"
    ordersColor: "{colors.primary}"
    averageBackground: "{colors.warning-soft}"
    averageColor: "{colors.warning}"
    timeBackground: "{colors.brand-purple-soft}"
    timeColor: "{colors.brand-purple}"
  cashregister-hero:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
    padding: "18px 20px"
    iconBackground: "{colors.primary-soft}"
    iconColor: "{colors.primary}"
  cashregister-table-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    headerBorderColor: "{colors.border-soft}"
    footerBackground: "{colors.surface-muted}"
    rounded: "{rounded.md}"
    minWidth: "440px"
  cashregister-status-chip:
    rounded: "{rounded.pill}"
    countSize: "20px"
    waitingBackground: "{colors.surface-muted}"
    preparingBackground: "{colors.success-soft}"
    canceledBackground: "{colors.warning-soft}"
    readyBackground: "{colors.primary-soft}"
---

# Design System: Smart Eat POS

## 1. Overview

**Creative North Star: "La Caisse Calme"**

Smart Eat POS doit ressembler a un outil de service, pas a une vitrine marketing. Le systeme visuel privilegie une structure claire, des contrastes lisibles et des etats impossibles a confondre pendant un rush restaurant. Les surfaces sont claires, les actions primaires sont rares et nettes, les statuts parlent avant la decoration.

L'identite est fonctionnelle : Poppins porte toute l'interface, les coins restent moderes, et la couleur sert d'abord a orienter l'action. Le systeme rejette explicitement les experiences trop ludiques, trop corporate, trop sombres, trop chargees ou trop generiques SaaS.

**Key Characteristics:**

- Interface produit dense mais scannable.
- Une couleur primaire pour les actions et la selection.
- Couleurs semantiques stables pour commande, paiement, cuisine, stock et impression.
- Panneaux plats ou legerement eleves, jamais decoratifs.
- Touch targets adaptees au clavier, a la souris et a la tablette.

## 2. Colors

La palette est retenue et semantique : bleu pour l'action, violet comme accent Smart Eat ponctuel, success/warning/danger pour les etats.

### Primary

- **Bleu Action** : role normatif `primary`. Utilise pour l'action principale, la selection active, les liens utiles et les focus rings.
- **Bleu Action Doux** : role `primary-soft`. Utilise pour les fonds selectionnes, les icones en surface douce et les etats hover.

### Secondary

- **Violet Smart Eat** : role `brand-purple`. Reserve aux points de marque existants et a quelques actions historiques qui utilisent deja `primaryPurple`.
- **Violet Smart Eat Doux** : role `brand-purple-soft`. Fond leger pour surfaces de marque ou empty states ponctuels.

### Neutral

- **Fond Service** : role `app-bg`. Fond principal des pages de travail.
- **Fond Analytics** : role `analytics-bg` (`#f7f9fc`). Fond legerement plus clair pour les pages de reporting composees de cartes blanches.
- **Surface Caisse** : role `surface`. Cartes, dialogues et panneaux.
- **Surface Discrete** : role `surface-muted`. Headers de panneaux, tableaux et zones secondaires.
- **Trait Structurel** : roles `border` et `border-soft`. Separation et contours.
- **Encre Principale** : roles `text` et `text-body`. Titres et contenus.
- **Texte Secondaire** : role `text-muted`. Meta, sous-titres, aides.

### Named Rules

**The Semantic First Rule.** Une couleur visible doit porter un role : action, selection, statut ou alerte. Pas de couleur decorative sur les ecrans de service.

**The Purple Restraint Rule.** Le violet Smart Eat ne remplace pas le bleu action. Il signe la marque, il ne pilote pas tous les workflows.

## 3. Typography

**Display Font:** Poppins (with sans-serif fallback)  
**Body Font:** Poppins (with sans-serif fallback)  
**Label/Mono Font:** Poppins (with sans-serif fallback)

**Character:** La typographie est directe, ronde sans etre ludique, et assez familiere pour une interface tactile de restaurant. Une seule famille suffit ; la clarte vient de l'echelle, du poids et de l'espacement.

### Hierarchy

- **Display** (700, `1.75rem`, 1.15): titre fort de page ou module, jamais dans les tableaux.
- **Headline** (600, `1.5rem`, 1.2): titre de section principale.
- **Title** (600, `1.25rem`, 1.25): cartes importantes, dialogues, panneaux.
- **Body** (400, `1rem`, 1.5): contenu courant et textes explicatifs.
- **Label** (600, `0.875rem`, 0 tracking): boutons, champs, colonnes et meta importants.

### Named Rules

**The Short Ramp Rule.** Une app POS n'a pas besoin de vingt tailles. Les nouvelles tailles doivent entrer dans la rampe caption, meta, body, title, headline, display.

**The No CSS Words Rule.** `large`, `medium` et `x-large` sont interdits pour `font-size`; utiliser les tokens.

## 4. Elevation

Le systeme est plat par defaut et utilise la separation tonale avant les ombres. Les ombres existent uniquement pour les panneaux flottants, hover/focus utiles, notifications et dialogues.

### Shadow Vocabulary

- **panel** (`0 2px 8px rgba(25, 39, 52, 0.04)`): elevation basse pour un panneau dense.
- **floating** (`0 10px 18px rgba(24, 24, 27, 0.12)`): notification ou surface flottante temporaire.
- **focus** (`0 0 0 3px rgba(25, 118, 210, 0.24)`): focus clavier ou selection tactile.

### Named Rules

**The Flat By Default Rule.** Une carte au repos n'a pas besoin d'ombre. Si l'ombre n'explique pas un etat ou une superposition, elle disparait.

## 5. Components

### Buttons

- **Shape:** coins moderes (`8px`), hauteur tactile minimale (`44px`) pour les nouvelles actions importantes.
- **Primary:** bleu action, texte blanc, libelle court, icone MDI a gauche ou a droite selon le pattern Vuetify existant.
- **Hover / Focus:** fond legerement plus dense ou focus ring bleu ; pas de rebond, pas d'animation decorative.
- **Secondary / Ghost:** contour ou texte neutre pour retour, annulation et actions secondaires.
- **Destructive:** rouge danger uniquement pour suppression, annulation critique ou remboursement.

### Chips

- **Style:** fond doux + texte fort pour les statuts. Les chips de statut ne doivent pas utiliser seulement une couleur : le texte doit toujours nommer l'etat.
- **State:** success (`#00e676`), warning, danger, info et neutral doivent garder le meme sens partout.

### Cards / Containers

- **Corner Style:** `8px` pour les panneaux courants, `12px` maximum pour dialogues et groupes tactiles.
- **Background:** `surface` ou `surface-muted`, jamais une collection de blancs et gris inventes par page.
- **Shadow Strategy:** plat par defaut, ombre seulement pour surface flottante ou hover actionnable.
- **Border:** `1px solid border` pour separer sans lourdeur.
- **Internal Padding:** `16px` standard, `24px` pour page header.
- **Analytics Page Background:** utiliser `analytics-bg` (`#f7f9fc`) sur les pages de reporting afin que les cartes blanches ressortent sans ombre lourde.
- **Analytics Card Surface:** les cartes KPI et panneaux restent en `surface` (`#ffffff`) avec bordure `border`; ne pas teinter le fond de la carte elle-meme.

### Inputs / Fields

- **Style:** Vuetify `outlined dense` reste la base.
- **Focus:** focus visible via couleur primaire.
- **Error / Disabled:** erreurs rouges avec message lisible ; disabled neutre, pas simplement faible opacite illisible.

### Analytics Toolbar

La toolbar de la page Statistiques est le pattern de reference pour les pages de pilotage.

- **Structure:** une carte blanche `outlined`, sans ombre, avec padding `16px 18px`.
- **Grid:** trois zones : presets rapides a gauche, periode personnalisee au centre, action primaire a droite.
- **Spacing:** garder au moins `32px` entre la periode personnalisee et l'action primaire. Les dates ne doivent pas etre collees au bouton.
- **Presets:** boutons `small depressed text-none`; actif rempli, inactif outlined.
- **Date fields:** `v-text-field outlined dense hide-details`, largeur standard `178px`, icone interne MDI, labels courts `Debut` et `Fin`.
- **Refresh:** bouton primary avec `mdi-refresh`, texte `Rafraichir`, etat loading visible.
- **Responsive:** sous `1180px`, passer en une colonne, dates en largeur disponible et bouton aligne a gauche. Sous mobile, empiler les presets et champs.

### Analytics KPI Cards

- **Shape:** carte blanche `outlined`, pas d'ombre au repos, hauteur minimale `118px`, padding `18px`.
- **Content:** icone dans un carre doux de `44px`, libelle muted, valeur forte, hint court.
- **Color mapping:** revenu en success, commandes en primary, ticket moyen en warning, temps/preparation en brand-purple.
- **Icon backgrounds:** revenu `success-soft`, commandes `primary-soft`, ticket moyen `warning-soft`, temps/preparation `brand-purple-soft`.
- **Icon colors:** revenu `success`, commandes `primary`, ticket moyen `warning`, temps/preparation `brand-purple`.
- **Typography:** valeur KPI autour de `26px`, libelle en meta semibold, hint en caption.
- **Hover:** leger changement de bordure ou translation discrete seulement si la page utilise deja ce mouvement.

### Analytics Panels / Tables

- **Panel:** carte blanche `outlined`, `surface` en fond, `border` en contour, overflow hidden, header separe par `border-soft`.
- **Header background:** garder le header blanc sur la page Statistiques; utiliser `surface-muted` seulement pour des panneaux plus denses.
- **Header:** titre avec icone MDI primary, sous-titre muted qui explique la mesure.
- **Tables:** Vuetify dense, footer masque si la liste est courte.
- **Bars:** utiliser `v-progress-linear` hauteur `8px`, rounded, fond `border-soft`.
- **Empty state:** texte francais explicite, par exemple `Aucun paiement sur cette periode`.

### Cash Register Cockpit

Le tiroir-caisse reprend le fond `analytics-bg` mais sert une action immediate, pas seulement de la lecture.

- **Page:** fond `analytics-bg` (`#f7f9fc`), padding `20px`, cartes blanches bordees.
- **Hero:** surface blanche `outlined`, padding `18px 20px`, icone `mdi-cash-register` dans un carre `44px` en `primary-soft`.
- **Title copy:** titre court `Tiroir-caisse`, sous-texte operationnel. Pas de hero marketing.
- **Refresh:** bouton primary `Actualiser`, `mdi-refresh`, `text-none`, etat loading lie au chargement des donnees.

### Cash Register KPI

- **Model:** meme structure que les KPI analytics : icone 44px, libelle muted, valeur forte, hint court.
- **Due amount:** `warning-soft` + `warning`, libelle `A encaisser`.
- **Paid amount:** `success-soft` + `success`, libelle `Deja paye`.
- **Active tables:** `primary-soft` + `primary`, libelle `Tables actives`.
- **Kitchen open:** `brand-purple-soft` + `brand-purple`, libelle `Cuisine ouverte`.
- **Value size:** autour de `24px`, pas plus grand afin de garder la page dense et scannable.

### Cash Register Table Cards

- **Grid:** `repeat(auto-fit, minmax(440px, 1fr))` sur desktop; une colonne sous mobile.
- **Card:** blanche `outlined`, `border`, sans ombre au repos, `overflow hidden`.
- **Header:** nom de table a gauche, montant `A encaisser` a droite, separation `border-soft`.
- **Status row:** chips compactes sous le header, avec compteur rond `20px`.
- **Body:** `v-data-table dense`, footer cache, texte en `text-body`, montant restant en gras.
- **Footer:** fond `surface-muted`, deux recap courts : total deja paye et nombre de clients.
- **Actions:** `Encaisser/Cloturer` en primary depressed et extensible, `Details` en outlined primary.
- **Disabled state:** l'action primary est desactivee tant qu'aucun client de la table n'est selectionne.

### Cash Register Status Colors

- **En attente:** `surface-muted` + compteur `border`, neutre.
- **En preparation:** `success-soft` + texte vert fonce, compteur `success`.
- **Annulee:** `warning-soft` + texte brun/orange fonce, compteur `warning`.
- **Pret a encaisser:** `primary-soft` + texte primary, compteur primary.
- **Deja paye:** chip `brand-purple-soft` + `brand-purple`, reservee aux montants deja encaisses dans la table client.

### Navigation

La navigation principale reste Vuetify drawer + app bar. Les entrees visibles doivent correspondre aux workflows principaux uniquement ; categories, etapes produits et stock interne ne doivent pas devenir des entrees principales si elles sont cachees par regle POS.

### Notifications

Les notifications sont des surfaces flottantes compactes avec icone semantique, message court, fermeture accessible et barre de progression. Elles utilisent les tokens semantiques, pas des couleurs locales.

## 6. Do's and Don'ts

### Do:

- **Do** utiliser le bleu action pour les actions primaires, selections et focus.
- **Do** garder Poppins comme famille unique et stabiliser les tailles par tokens.
- **Do** associer chaque couleur de statut a un libelle textuel explicite.
- **Do** garantir des cibles tactiles de `44px` pour les actions importantes.
- **Do** utiliser MDI de facon coherente : une icone par role.
- **Do** reutiliser le pattern Statistiques pour les ecrans de reporting : toolbar de filtres, KPI, panneaux details.
- **Do** reutiliser le cockpit caisse pour les ecrans ou l'utilisateur doit choisir une table ou un groupe avant une action critique.

### Don't:

- **Don't** rendre l'interface trop ludique, trop corporate, trop sombre, trop chargee ou trop generique SaaS.
- **Don't** utiliser des couleurs hard-codees quand un token existe.
- **Don't** utiliser `large`, `medium`, `x-large` pour dimensionner du texte.
- **Don't** multiplier les variantes pour la meme action : choisir un standard pour supprimer, fermer, imprimer et confirmer.
- **Don't** bloquer l'encaissement, l'envoi de commande ou l'impression avec des integrations externes lentes.
- **Don't** coller les filtres de date au bouton primaire dans les toolbars de reporting.
- **Don't** utiliser des cartes `max-content` pour les surfaces de caisse; elles doivent former une grille stable.

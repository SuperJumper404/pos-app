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
  warning: "#d89800"
  warning-soft: "#fff6df"
  danger: "#d83b3b"
  danger-soft: "#ffecec"
  info: "#1976d2"
  app-bg: "#f3f5f8"
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

La palette est retenue et semantique : bleu pour l'action, violet comme accent Smart Eat ponctuel, verts/oranges/rouges pour les etats.

### Primary

- **Bleu Action** : role normatif `primary`. Utilise pour l'action principale, la selection active, les liens utiles et les focus rings.
- **Bleu Action Doux** : role `primary-soft`. Utilise pour les fonds selectionnes, les icones en surface douce et les etats hover.

### Secondary

- **Violet Smart Eat** : role `brand-purple`. Reserve aux points de marque existants et a quelques actions historiques qui utilisent deja `primaryPurple`.
- **Violet Smart Eat Doux** : role `brand-purple-soft`. Fond leger pour surfaces de marque ou empty states ponctuels.

### Neutral

- **Fond Service** : role `app-bg`. Fond principal des pages de travail.
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

### Inputs / Fields

- **Style:** Vuetify `outlined dense` reste la base.
- **Focus:** focus visible via couleur primaire.
- **Error / Disabled:** erreurs rouges avec message lisible ; disabled neutre, pas simplement faible opacite illisible.

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

### Don't:

- **Don't** rendre l'interface trop ludique, trop corporate, trop sombre, trop chargee ou trop generique SaaS.
- **Don't** utiliser des couleurs hard-codees quand un token existe.
- **Don't** utiliser `large`, `medium`, `x-large` pour dimensionner du texte.
- **Don't** multiplier les variantes pour la meme action : choisir un standard pour supprimer, fermer, imprimer et confirmer.
- **Don't** bloquer l'encaissement, l'envoi de commande ou l'impression avec des integrations externes lentes.

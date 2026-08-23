# Product

## Register

product

## Platform

web

## Users

Smart Eat est utilise par le staff restaurant, les managers et les administrateurs pendant le service. Les utilisateurs travaillent souvent dans un contexte rapide, parfois bruyant, avec des actions a effectuer sans hesitation : prendre une commande, suivre la cuisine, encaisser, consulter une table, gerer le catalogue, verifier les stocks ou piloter l'equipe. Le produit contient aussi des parcours limites pour borne, client, table access et click-and-collect.

## Product Purpose

Le frontend POS permet a un restaurant de centraliser ses operations quotidiennes : accueil caisse, menus, commandes, panier, tiroir-caisse, historique, tables, staff, stocks, rapports, reglages, bornes et site click-and-collect. Le succes se mesure par la vitesse d'execution, la clarte des statuts, la fiabilite des actions critiques et la capacite a continuer le service meme quand des operations externes comme l'impression ne repondent pas immediatement.

## Brand Personality

Clair, rapide, fiable. L'interface doit inspirer confiance et rester calme sous pression. Le ton est direct, utile et operationnel, avec des libelles francais simples qui aident l'utilisateur a agir sans chercher.

## Anti-references

Ne pas transformer l'interface en experience trop ludique, trop corporate, trop sombre, trop chargee ou trop generique SaaS. Eviter les effets decoratifs, les animations gratuites, les couleurs de statut ambiguës, les composants incoherents entre pages, et les parcours qui bloquent inutilement l'encaissement, l'envoi de commande ou l'impression.

## Design Principles

1. Prioriser le service en cours : les ecrans doivent rendre les prochaines actions visibles, rapides et sans friction.
2. Rendre les statuts impossibles a confondre : commande, paiement, cuisine, impression et stock doivent etre lisibles en un coup d'oeil.
3. Garder une densite utile : l'interface peut etre compacte, mais chaque zone doit rester scannable et tactile.
4. Proteger les actions critiques : confirmations, chargements et etats d'erreur doivent eviter les doubles actions et les pertes de contexte.
5. Preserver la continuite operationnelle : les integrations lentes ou externes ne doivent pas bloquer le travail principal.

## Analytics Page Pattern

La page Statistiques sert de reference pour les ecrans de pilotage et de reporting. Elle doit rester operationnelle : les filtres sont en haut, les indicateurs importants arrivent juste dessous, puis les tableaux de detail expliquent les chiffres.

### Reusable Layout

1. Placer les filtres dans une toolbar blanche, bordee et plate.
2. Separer les raccourcis rapides, les champs personnalises et l'action de rafraichissement en trois zones lisibles.
3. Garder les champs date au centre visuel de la toolbar, sans les coller au bouton d'action.
4. Afficher les KPI en grille de cartes compactes avec icone, libelle, valeur forte et hint court.
5. Presenter les details dans des panneaux bordes, avec titre iconifie, sous-titre utile et tableau dense.

### Surfaces & Cards

- Les pages de reporting utilisent un fond analytics tres clair `#f7f9fc`.
- Les toolbars, KPI et panneaux restent en cartes blanches `#ffffff`, avec bordure fine, sans ombre au repos.
- Les KPI utilisent une icone dans un carre doux de `44px`, pas un emoji dans le titre.
- Les couleurs de fond des icones KPI portent le sens de la mesure : success-soft pour revenu, primary-soft pour volume, warning-soft pour ticket moyen, brand-purple-soft pour temps/preparation.
- Les panneaux de detail gardent un header blanc, un sous-titre muted et une separation `border-soft`.

### Interaction Rules

- Les presets de periode utilisent des boutons `text-none`, jamais de majuscules forcees.
- Chaque preset a une icone MDI a gauche et une couleur semantique : aujourd'hui en primary, hier en warning `#ffa014`, semaine en success `#00e676`, mois en violet de marque.
- Le preset actif est rempli, les presets inactifs sont outlined.
- Le bouton de rafraichissement est l'action primaire de la toolbar, aligne a droite, avec icone refresh et etat loading.
- Les donnees vides gardent une phrase claire au lieu d'un blanc ou d'un message anglais.

### Visual Reuse

Reutiliser ce pattern pour les futures pages de reporting, dashboard, historique avance, ventes, caisse, stocks et performance equipe. Eviter les headers hero, les grandes cartes marketing ou les effets decoratifs : ces pages sont des surfaces de travail.

## Cash Register Cockpit Pattern

La page Tiroir-caisse sert de reference pour les ecrans d'encaissement en service. Elle doit donner au caissier une lecture instantanee : combien reste a encaisser, quelles tables sont actives, quels paiements sont deja recus, et quelle action faire maintenant.

### Reusable Layout

1. Ouvrir avec un header operationnel blanc : icone caisse, titre court, sous-texte utile et action `Actualiser` a droite.
2. Placer une ligne de KPI juste sous le header : `A encaisser`, `Deja paye`, `Tables actives`, `Cuisine ouverte`.
3. Afficher les tables dans une grille responsive de cartes blanches bordees.
4. Dans chaque carte table, mettre le nom de table et le montant a encaisser en premier niveau visuel.
5. Garder les statuts de cuisine sous forme de chips compactes, puis la table client dense, puis le recap footer, puis les actions.

### Surfaces & Cards

- Utiliser le meme fond analytics `#f7f9fc` que les pages de reporting pour que les cartes caisse ressortent sans ombre lourde.
- Les cartes table restent en `#ffffff`, bordure fine, header separe par `border-soft`, et footer `surface-muted`.
- Les KPI caisse utilisent le meme modele d'icone en carre doux de `44px`.
- Les couleurs KPI portent le sens operationnel : warning pour montant restant, success pour deja paye, primary pour volume de tables, brand-purple pour cuisine.
- Les cartes table ne doivent pas etre en `max-content`; elles doivent occuper une grille lisible et stable.

### Interaction Rules

- Le bouton primaire d'une carte table est `Encaisser` ou `Cloturer` selon la selection, en bleu primary, avec icone MDI.
- Le bouton `Details` reste secondaire outlined.
- Le bouton d'encaissement est desactive tant qu'aucune ligne client de cette table n'est selectionnee.
- Quand l'utilisateur change de table, la selection doit se rattacher clairement a la nouvelle table.
- L'etat vide doit rassurer : aucune table a encaisser signifie que le service est a jour, pas une erreur.

### Visual Reuse

Reutiliser ce pattern pour les surfaces d'action rapide : caisse, cloture de service, suivi de tables, files d'attente cuisine et toute interface ou l'utilisateur doit choisir un groupe, verifier un montant, puis agir.

## Accessibility & Inclusion

Viser WCAG AA. Les textes et statuts doivent rester lisibles dans un environnement de restaurant actif, sur desktop comme sur tablette. Les controles doivent etre utilisables au clavier et au tactile, avec focus visible, zones de clic suffisantes, contrastes solides, libelles explicites et respect des preferences de reduction de mouvement.

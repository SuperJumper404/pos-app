# Module Stock: Inventaire, Reapprovisionnement Et Liste De Courses

## Objectif

Faire evoluer le module Stock du POS vers un outil operationnel pour restaurant:

- suivre le stock des produits vendus et des ingredients;
- faire des inventaires manuels;
- connaitre les articles bas ou sous stock cible;
- generer une liste de courses a la demande;
- enregistrer les reapprovisionnements avec fournisseur et prix d'achat;
- consulter l'historique d'un article.

Le module reste volontairement simple pour la premiere version. Il ne lie pas les produits vendus aux ingredients. Les ingredients sont suivis manuellement.

## Decisions Validees

- Le module garde le nom `Stock`.
- Le module apparait dans la navigation principale pour les admins et les staffs avec la permission `stocks`.
- Les produits et ingredients partagent une logique commune d'article de stock.
- Les ingredients ne sont pas lies aux produits vendus.
- Les ingredients changent de stock uniquement par reapprovisionnement ou inventaire manuel.
- Les produits peuvent decrementer automatiquement a la validation/envoi d'une commande si leur suivi de stock est active.
- Les annulations et remboursements ne recreditent pas automatiquement le stock.
- Les quantites sont des entiers uniquement.
- Les unites sont simples: paquet, bouteille, piece, carton, bac, etc.
- La liste de courses est generee a la demande et remplace la liste courante.
- La liste de courses est une information calculee: les lignes ne sont pas supprimables et les quantites ne sont pas modifiables dans la liste.
- La quantite reelle achetee reste modifiable dans le formulaire de reapprovisionnement.
- Les lignes de liste de courses peuvent etre cochees `Pris`; cela n'affecte pas le stock.
- Un export/impression PDF simple de la liste de courses est prevu.

## Modele Metier

### Article De Stock

Un article de stock represente soit:

- un `produit`, lie a une fiche produit POS existante;
- un `ingredient`, cree dans le module Stock.

Champs communs:

- type: `product` ou `ingredient`;
- nom;
- unite simple;
- stock actuel;
- seuil minimum;
- stock cible;
- reference optionnelle;
- fournisseur par defaut en texte libre optionnel;
- note optionnelle;
- statut actif ou archive;
- prix moyen d'achat calcule depuis les reapprovisionnements.

Les champs obligatoires pour un ingredient actif sont:

- nom;
- unite simple;
- stock actuel initial;
- seuil minimum;
- stock cible.

Les champs optionnels pour un ingredient sont:

- type/categorie libre via combobox;
- reference exacte;
- fournisseur par defaut;
- note.

### Produits

Les produits recoivent un switch `Suivre le stock`.

Par defaut:

- produits existants: `Suivre le stock` active;
- nouveaux produits: `Suivre le stock` active.

Si `Suivre le stock` est active, les champs suivants sont obligatoires:

- stock actuel;
- seuil minimum;
- stock cible;
- unite simple;
- comportement a stock zero.

Le comportement a stock zero est configurable par produit:

- bloquer la vente;
- autoriser avec alerte.

Si `Suivre le stock` est desactive:

- le produit ne decremente jamais le stock;
- le produit ne bloque jamais la vente pour stock insuffisant;
- les champs stock/seuil/cible sont caches dans l'interface produit.

### Statuts De Stock

Les statuts sont calcules ainsi:

- rouge: `stock_actuel < seuil_minimum`;
- orange: `seuil_minimum <= stock_actuel < stock_cible`;
- normal: `stock_actuel >= stock_cible`.

La liste de courses inclut les articles rouges et oranges, c'est-a-dire tous les articles avec `stock_actuel < stock_cible`.

La quantite proposee a acheter est:

```text
stock_cible - stock_actuel
```

## Ecrans Et Parcours

### Navigation

Le module `Stock` est visible dans la navigation principale pour:

- les admins;
- les staffs ayant la permission `stocks`.

Cette decision remplace la regle projet existante qui cachait Stock de la navigation principale.

### Page Principale

La page principale utilise des onglets:

- Produits;
- Ingredients;
- Stocks bas;
- Liste de courses;
- Inventaire.

Une recherche texte simple est disponible en V1 dans les onglets pertinents.

### Onglet Produits

Affiche les produits avec:

- nom;
- switch `Suivre le stock`;
- stock actuel si suivi active;
- seuil minimum si suivi active;
- stock cible si suivi active;
- unite si suivi active;
- comportement a zero si suivi active;
- statut couleur;
- acces a la fiche/historique.

### Onglet Ingredients

Permet de creer, modifier, archiver ou supprimer les ingredients selon les regles d'historique.

Le champ type/categorie est une combobox libre:

- l'utilisateur peut choisir une valeur deja utilisee;
- l'utilisateur peut saisir une nouvelle valeur.

### Onglet Stocks Bas

Affiche les articles actifs avec statut rouge ou orange.

- rouge: sous seuil minimum;
- orange: sous stock cible mais pas sous seuil minimum.

Cet onglet sert a surveiller la situation, mais ne genere pas automatiquement la liste de courses.

### Onglet Liste De Courses

Contient un bouton `Generer la liste de courses`.

La generation:

- remplace toute la liste courante;
- prend les produits suivis actifs et ingredients actifs;
- garde uniquement les articles avec `stock_actuel < stock_cible`;
- calcule `quantite_a_acheter = stock_cible - stock_actuel`;
- trie les rouges d'abord, puis les oranges.

Chaque ligne affiche:

- type d'article;
- nom;
- statut couleur;
- quantite a acheter;
- unite;
- prix unitaire estime;
- total estime;
- fournisseur si connu;
- action `Pris`;
- action `Reapprovisionner`.

Si le prix moyen est inconnu, le prix unitaire estime et le total affichent `Non renseigne`.

Action `Pris`:

- coche la ligne;
- la grise ou la barre;
- la descend en bas de liste;
- ne modifie pas le stock.

Action `Reapprovisionner`:

- ouvre un formulaire de reapprovisionnement prerempli;
- laisse modifier la quantite reelle, le fournisseur et les prix.

Un export ou une impression PDF simple est disponible depuis cet onglet.

### Onglet Inventaire

L'inventaire en masse inclut par defaut:

- les produits avec `Suivre le stock` active;
- les ingredients actifs.

L'utilisateur peut remplir seulement certaines lignes.

A la validation:

- seules les lignes remplies sont enregistrees;
- une ligne remplie est enregistree meme si la quantite est identique au stock actuel;
- le stock devient exactement la quantite comptee.

### Fiche Article

La fiche d'un article affiche en haut:

- stock actuel;
- seuil minimum;
- stock cible;
- statut;
- prix moyen d'achat;
- fournisseur par defaut;
- reference si presente.

Actions:

- reapprovisionner;
- inventaire rapide;
- editer;
- archiver ou supprimer selon historique.

Historique en bas:

- reapprovisionnements;
- inventaires.

Les ventes automatiques des produits suivis ne sont pas affichees dans cet historique en V1.

## Actions

### Reapprovisionnement

Le formulaire contient:

- article concerne;
- quantite proposee si ouvert depuis la liste de courses;
- quantite reellement achetee, preremplie avec la quantite proposee mais modifiable;
- fournisseur texte libre, prerempli si fournisseur par defaut;
- prix unitaire, prerempli avec le prix moyen d'achat si connu;
- prix total calcule mais modifiable;
- remarque optionnelle.

A validation:

- le stock augmente de la quantite reelle;
- un mouvement de reapprovisionnement est enregistre;
- le prix moyen est recalcule sur les reapprovisionnements;
- les statuts de stock sont recalcules.

Le prix moyen est calcule ainsi:

```text
total des couts d'achat / total des quantites achetees
```

### Inventaire Rapide

Depuis une fiche article, l'utilisateur saisit le stock reel compte.

A validation:

- le stock de l'article devient la quantite comptee;
- un mouvement d'inventaire est enregistre;
- les statuts sont recalcules.

### Inventaire En Masse

Depuis l'onglet Inventaire, l'utilisateur renseigne les articles comptes.

A validation:

- seules les lignes remplies sont enregistrees;
- chaque ligne remplace le stock courant par la quantite comptee;
- chaque ligne cree un mouvement d'inventaire.

### Commandes Et Produits Suivis

Quand une commande est validee/envoyee:

- les produits avec `Suivre le stock` active decrementent leur stock;
- les produits avec `Suivre le stock` desactive ne changent pas.

Quand une commande est annulee ou remboursee:

- aucun stock n'est recredite automatiquement.

## Donnees Et API

### Tables Proposees

`stock_items`

- id;
- shop_id;
- item_type: `product` ou `ingredient`;
- product_id nullable;
- name;
- unit;
- current_stock;
- minimum_stock;
- target_stock;
- category_label nullable;
- reference nullable;
- default_supplier nullable;
- note nullable;
- archived;
- created_at;
- updated_at.

`stock_movements`

- id;
- shop_id;
- stock_item_id;
- movement_type: `replenishment` ou `inventory`;
- quantity;
- previous_stock;
- new_stock;
- supplier nullable;
- unit_price nullable;
- total_price nullable;
- remark nullable;
- operator_id nullable;
- created_at.

`shopping_list_items`

- id;
- shop_id;
- stock_item_id;
- status_at_generation: `red` ou `orange`;
- current_stock_at_generation;
- target_stock_at_generation;
- quantity_to_buy;
- estimated_unit_price nullable;
- estimated_total_price nullable;
- taken;
- created_at;
- updated_at.

Champs ajoutes a `products`:

- track_stock boolean;
- stock_zero_behavior enum: `block` ou `warn`;
- stock_item_id nullable, si l'implementation choisit un lien explicite.

Pour les produits, l'implementation doit garder une seule source de verite effective pour le stock courant. Si `products.stock` reste utilise par les parcours de vente existants, `stock_items.current_stock` pour les produits doit etre synchronise dans la meme transaction, ou remplace par une lecture derivee de `products.stock`. La decision technique finale sera prise au moment du plan d'implementation pour limiter les regressions sur la caisse et la borne.

### Endpoints Proposes

- `GET /stock/items`
- `POST /stock/ingredients`
- `PATCH /stock/items/:id`
- `DELETE /stock/items/:id`
- `POST /stock/items/:id/archive`
- `POST /stock/items/:id/replenishments`
- `POST /stock/items/:id/inventories`
- `POST /stock/inventory/bulk`
- `GET /stock/low`
- `POST /stock/shopping-list/generate`
- `GET /stock/shopping-list`
- `PATCH /stock/shopping-list/:id/taken`
- `GET /stock/shopping-list/pdf`

`POST /stock/shopping-list/generate` supprime ou archive les lignes de liste courante, puis recree la liste complete a partir de l'etat de stock du moment. Les coches `Pris` existantes ne sont pas conservees apres regeneration.

### Migration Produits Existants

Pour chaque produit existant:

- creer ou initialiser un article de stock de type `product`;
- `track_stock = true`;
- stock actuel = stock existant du produit;
- unite = `piece`;
- seuil minimum = `1`;
- stock cible = stock actuel existant;
- comportement a zero = `block`, sauf si l'existant impose un autre comportement.

Cette migration evite une liste de courses remplie d'alertes au premier lancement.

## Regles Et Validations

- Les quantites sont des entiers.
- Reapprovisionnement: quantite achetee > 0.
- Inventaire: quantite comptee >= 0.
- Seuil minimum >= 0.
- Stock cible >= seuil minimum.
- Stock actuel >= 0.
- Si `stock cible = stock actuel`, l'article est normal.
- Un article archive ne sort pas dans les stocks bas, la liste de courses, ni l'inventaire en masse.
- Un ingredient avec historique ne peut pas etre supprime; il doit etre archive.
- Un ingredient sans historique peut etre supprime.
- Si la generation de liste ne trouve aucun article sous stock cible, afficher `Aucun achat necessaire`.
- Si le prix moyen est inconnu, afficher `Non renseigne`.

## Permissions

Le module est accessible aux:

- admins;
- staffs avec la permission `stocks`.

Les endpoints backend doivent appliquer les memes controles d'acces.

## Tests Et Validation

### Tests Backend

Verifier:

- calcul des statuts rouge/orange/normal;
- generation de la liste de courses;
- quantite proposee = stock cible - stock actuel;
- tri rouges puis oranges;
- prix moyen calcule depuis les reapprovisionnements;
- reapprovisionnement qui augmente le stock;
- inventaire qui remplace le stock;
- inventaire identique qui cree quand meme un mouvement;
- produit non suivi jamais decremente;
- produit suivi decremente a la validation/envoi de commande;
- annulation/remboursement sans recredit automatique.

### Tests Frontend

Verifier:

- onglets du module Stock;
- switch `Suivre le stock`;
- champs stock visibles uniquement si suivi active;
- champs obligatoires si suivi active;
- liste de courses generee et remplacee;
- lignes rouges avant lignes oranges;
- ligne `Pris` grisee/barree et descendue;
- formulaire de reapprovisionnement prerempli depuis la liste;
- affichage `Non renseigne` si prix moyen inconnu.

### Verification Manuelle

Scenario principal:

1. Creer l'ingredient `Fromage`.
2. Unite: `paquet`.
3. Seuil minimum: `6`.
4. Stock cible: `20`.
5. Reapprovisionner `+20 paquets` avec fournisseur et prix.
6. Faire un inventaire rapide a `2 paquets`.
7. Generer la liste de courses.
8. Verifier que `Fromage` apparait en rouge avec `18 paquets`.
9. Cocher `Pris`.
10. Lancer `Reapprovisionner` depuis la ligne.
11. Modifier si besoin la quantite reelle et le prix.
12. Valider et verifier le stock et l'historique.

## Hors Perimetre V1

- Liaison recette produit -> ingredients.
- Decrementation automatique des ingredients par vente.
- Gestion avancee des fournisseurs.
- Multi-emplacements reserve/frigo/congel.
- Transferts de stock.
- Badge de navigation pour les alertes.
- Suppression manuelle de lignes de liste de courses.
- Modification directe des quantites dans la liste de courses.

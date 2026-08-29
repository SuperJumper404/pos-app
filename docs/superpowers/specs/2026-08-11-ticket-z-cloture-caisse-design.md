# Ticket Z / Cloture de caisse - Design

## Contexte

Le POS possede deja une page `pages/reports.vue` et une page `pages/statistics.vue`.
Les statistiques existantes jouent le role d'un Ticket X : elles affichent les
ventes sur une periode, sans cloturer ni figer les donnees.

La nouvelle feature ajoute une vraie cloture Z dans l'onglet Rapports. Le Ticket
Z doit figer une periode de caisse et permettre de retrouver ou imprimer les
clotures precedentes.

## Objectif

Ajouter une V1 de cloture de caisse type Ticket Z :

- calculer la periode courante depuis le dernier Ticket Z jusqu'a maintenant ;
- afficher un resume avant cloture ;
- creer une cloture persistante cote backend ;
- conserver un historique consultable des Tickets Z ;
- garder les statistiques existantes comme equivalent Ticket X.

## Hors perimetre V1

- gestion du fond de caisse ;
- comptage manuel des especes et ecarts de caisse ;
- blocage strict si des commandes sont ouvertes ;
- export comptable avance ;
- signature fiscale ou certification NF525.

Ces sujets pourront etre ajoutes ensuite, une fois la base Z stabilisee.

## Approche retenue

Le Ticket Z couvre toujours la periode depuis le dernier Ticket Z du shop jusqu'a
la date de cloture. S'il n'existe aucun Z, la periode commence a la premiere
commande archivee disponible.

Les calculs s'appuient sur les commandes archivees, car elles representent les
commandes terminees et encaissees/cloturees dans le POS actuel. Le backend cree
un snapshot des totaux au moment de la cloture afin que le Z ne change pas si les
donnees source evoluent plus tard.

## Modele de donnees

Ajouter une migration backend pour une table de clotures, nommee
`cash_closures`.

Champs principaux :

- `id`
- `shopid`
- `closure_number`
- `opened_at`
- `closed_at`
- `closed_by_user_id`
- `orders_count`
- `total_revenue`
- `payments_summary`
- `vat_summary`
- `created`
- `updated`

`payments_summary` et `vat_summary` sont stockes en JSON texte pour garder le
snapshot lisible et extensible sans multiplier les tables en V1.

Contraintes :

- `shopid` obligatoire ;
- `closure_number` incremente par shop ;
- index sur `shopid`, `closed_at`, et `closure_number`.

## Backend

Ajouter un module dedie aux clotures, par exemple `src/modules/m_cashClosures.js`,
et un controleur `src/controllers/c_cashClosures.js`.

Endpoints proposes :

- `GET /api/v1/reports/z/current`
  - retourne l'aperçu de la periode courante ;
  - ne cree aucune cloture.
- `POST /api/v1/reports/z/close`
  - recalcule la periode cote backend ;
  - cree la cloture si elle contient des commandes ;
  - retourne le Ticket Z cree.
- `GET /api/v1/reports/z`
  - retourne l'historique des Tickets Z du shop.
- `GET /api/v1/reports/z/:id`
  - retourne le detail d'un Ticket Z appartenant au shop.

Le backend doit toujours utiliser `req.shopid` et l'utilisateur authentifie. Le
frontend ne choisit pas le shop a cloturer.

## Calculs

La periode courante est definie par :

- `opened_at` = `closed_at` du dernier Z du shop, ou premiere date d'archive si
  aucun Z n'existe ;
- `closed_at` = date serveur au moment de l'aperçu ou de la cloture.

Les commandes incluses sont les archives du shop avec :

- `archives.created > opened_at` si un dernier Z existe ;
- `archives.created <= closed_at` ;
- uniquement le shop courant.

Totaux minimum :

- nombre de commandes ;
- total CA via `subtotal` ;
- resume par moyen de paiement via `payment` ;
- resume TVA par taux depuis `archivesdetail.vat_rate`, `total_ht`,
  `total_vat`, et `total`.

Si les donnees TVA sont absentes sur certaines anciennes archives, elles sont
rangees dans une ligne "Non renseignee" plutot que de bloquer la cloture.

## Frontend

Modifier `pages/reports.vue` pour afficher une interface plus complete :

- onglet ou section "Commandes" pour la liste actuelle ;
- section "Cloture Z" avec resume de la periode courante ;
- section "Historique Z" avec les clotures precedentes.

La section Cloture Z affiche :

- periode ouverte ;
- nombre de commandes ;
- total CA ;
- paiements par methode ;
- TVA par taux ;
- bouton "Cloturer la caisse".

Au clic sur "Cloturer la caisse" :

- ouvrir une confirmation Vuetify ;
- rappeler que l'action fige le Ticket Z ;
- appeler l'action Vuex de creation ;
- recharger l'aperçu courant et l'historique apres succes.

Ajouter un module Vuex dedie, par exemple `store/cashClosures.js`, pour isoler
les appels API et l'etat :

- `current`
- `history`
- `detail`
- `message`
- actions `getCurrent`, `closeCurrent`, `getHistory`, `getDetail`.

## Impression

La V1 affiche un detail imprimable dans l'interface. L'impression thermique
dediee peut etre ajoutee ensuite avec les helpers existants de tickets.

Le detail doit contenir :

- nom "Ticket Z" ;
- numero de cloture ;
- periode ;
- date de cloture ;
- operateur ;
- totaux paiements ;
- totaux TVA ;
- total general.

## Erreurs

Cas a gerer :

- aucune commande a cloturer : afficher un message clair et ne pas creer de Z ;
- erreur API : afficher une notification d'erreur existante ;
- double clic sur cloture : desactiver le bouton pendant l'appel ;
- Z introuvable ou d'un autre shop : backend retourne une erreur 404/403.

## Tests

Backend :

- calcule la periode depuis le dernier Z ;
- calcule une periode initiale sans Z precedent ;
- agrege les paiements ;
- agrege la TVA ;
- refuse de cloturer une periode vide ;
- incremente `closure_number` par shop ;
- ne retourne pas les Z d'un autre shop.

Frontend :

- la page Rapports affiche la section Cloture Z ;
- le bouton de cloture appelle l'action Vuex ;
- la confirmation est requise avant creation ;
- l'historique Z est affiche ;
- le bouton est desactive pendant la cloture.

## Validation

Verification minimale apres implementation :

- tests backend ciblant le module de cloture ;
- tests frontend ciblant la page Rapports et le store ;
- `npm run test` dans les deux projets si le temps le permet ;
- `npm run lint` cote frontend pour les changements Vue/JS.

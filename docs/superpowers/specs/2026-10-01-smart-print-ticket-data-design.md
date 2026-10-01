# Smart Print Ticket Data Contract

Date : 2026-10-01

## Contexte

Le frontend POS envoie actuellement les impressions directes au SmartEat Printer
Agent local sur `http://<printer_ip>:8989/print`. Le payload direct contient
principalement `dataFormatESCPOS`, et le Printer Agent route ensuite ce flux vers
les imprimantes configurees.

Ce fonctionnement pose probleme parce que le Printer Agent ne dispose pas d'un
bloc de donnees stable pour reconstruire un ticket de caisse ou un ticket de
commande. Il peut imprimer le flux ESC/POS recu, mais il ne peut pas refaire un
rendu adapte a chaque protocole ni produire un historique/PDF propre sans
extraire du texte depuis les commandes ESC/POS.

## Objectif

Ajouter un contrat direct entre le frontend POS et le Printer Agent. Pour chaque
impression directe, le frontend enverra toujours :

- `dataFormatESCPOS` : le ticket ESC/POS genere par le frontend, comme
  aujourd'hui ;
- `dataFormatXML` : le ticket XML/ePOS genere par le frontend ;
- `ticketData` : un bloc JSON versionne permettant au Printer Agent de
  reconstruire le ticket.

Le Printer Agent permettra ensuite de choisir, imprimante par imprimante, si le
ticket doit etre imprime depuis le flux recu ou reconstruit depuis `ticketData`.

## Hors perimetre

- Modifier le flux cloud `/pushprintingjob` et `/pullprintingjob`.
- Changer les tickets ESC/POS actuellement generes par le frontend.
- Ajouter un nouveau backend ou une nouvelle file d'impression.
- Changer la logique metier des commandes, paiements, TVA ou remises.
- Corriger les problemes non lies du Printer Agent listes dans son `AGENTS.md`.

## Decisions validees

- La premiere version concerne uniquement le direct frontend vers Printer Agent.
- Le backend cloud reste inchange pour cette etape.
- Le frontend envoie toujours `dataFormatESCPOS`, `dataFormatXML` et
  `ticketData` dans `/print`.
- Le Printer Agent expose un reglage simple par imprimante :
  - `Ticket recu` : utiliser `dataFormatESCPOS`, comme aujourd'hui ;
  - `Donnees ticket` : reconstruire le ticket depuis `ticketData`.
- Les imprimantes deja configurees restent par defaut en mode `Ticket recu`.
- En mode `Ticket recu`, le Printer Agent continue a utiliser
  `dataFormatESCPOS`, meme si `dataFormatXML` est present.
- En mode `Donnees ticket`, le Printer Agent utilise `ticketData.render` comme
  source de verite pour reproduire le ticket actuel.
- `ticketData.business` est conserve pour l'historique, le debug et les
  evolutions futures, mais il ne gagne pas contre `render`.
- L'historique et le PDF du Printer Agent affichent le ticket reconstruit depuis
  `ticketData` quand il est disponible, avec le JSON complet visible dans le
  detail.
- Si un transport actif ne sait pas utiliser la reconstruction, il est ignore
  silencieusement.
- Si aucun transport compatible ne reste apres ces ignores, le Printer Agent
  retourne une erreur visible `aucun transport compatible`.

## Contrat `ticketData`

`ticketData` est versionne avec `schemaVersion: 1`.

Le format est hybride :

- `business` contient les donnees metier propres ;
- `render` contient un modele de rendu structure qui reproduit les tickets
  actuels.

Exemple de forme cible :

```json
{
  "schemaVersion": 1,
  "kind": "cashier_receipt",
  "business": {
    "orderId": 42,
    "orderNumber": "1234",
    "shop": {
      "name": "Le Comptoir",
      "phone": "0102030405",
      "address": "1 rue du Test",
      "siret": "123",
      "naf": "5610A",
      "vatNumber": "FR00123456789"
    },
    "items": [],
    "totals": {},
    "payment": {}
  },
  "render": {
    "paperWidth": 32,
    "sections": []
  }
}
```

### Kinds

La premiere version supporte :

- `cashier_receipt` pour le ticket de caisse ;
- `order_ticket` pour le ticket de commande/cuisine.

Le mapping vers le routage existant reste :

- ticket de caisse : `ticketType: "caisse"` ;
- ticket de commande direct Printer Agent : `ticketType: "cuisine"`.

### `business`

Le bloc `business` doit contenir les donnees necessaires a la comprehension du
ticket :

- boutique ;
- commande ;
- table/client/canal de vente ;
- date ;
- lignes produit ;
- personnalisations si presentes ;
- totaux ;
- TVA si presente ;
- remise si presente ;
- paiement ;
- note/remarque si presente ;
- QR avis client si present.

Ces donnees servent a diagnostiquer et a faire evoluer le contrat. Le rendu
imprime reste pilote par `render`.

### `render`

`render` contient des sections ordonnees. Chaque section contient des lignes
simples, avec un vocabulaire volontairement limite :

```json
{ "type": "text", "text": "Le Comptoir", "align": "center", "bold": true, "size": "double" }
{ "type": "columns", "columns": [], "fallbackText": "1x   Burger              12,00 EUR" }
{ "type": "separator" }
{ "type": "qr", "value": "https://example.test/avis", "label": "Votre avis nous interesse" }
{ "type": "feed", "lines": 2 }
{ "type": "cut" }
```

Les valeurs attendues sont :

- `align`: `left`, `center`, `right` ;
- `size`: `normal`, `double`, `triple` ;
- `bold`: booleen ;
- `columns`: liste de colonnes structurees ;
- `fallbackText`: texte deja formate par le frontend pour conserver la fidelite
  du ticket actuel.

Les personnalisations produit sont representees dans `render` comme des lignes
texte sous le produit, par exemple `  - Sauces : Ketchup`.

Le QR code avis client est represente dans `render` par une ligne `qr`, a la
position exacte ou il apparait dans le ticket actuel.

## Champs obligatoires et textes de remplacement

### Ticket de caisse

Le ticket de caisse reconstruit doit avoir les donnees minimales suivantes :

- `schemaVersion`;
- `kind`;
- `render.sections`;
- nom de boutique ;
- telephone ;
- adresse ;
- SIRET ;
- NAF ;
- TVA intracom ;
- `orderId` ou `orderNumber`;
- date affichable ;
- lignes produits avec nom, quantite et total ;
- total ;
- methode de paiement.

Les champs legaux telephone, adresse, SIRET, NAF et TVA intracom sont
obligatoires dans le contrat, mais si la boutique ne les a pas renseignes, la
reconstruction Printer Agent imprime un texte de remplacement plutot que de
bloquer :

- `Telephone non renseigne`
- `Adresse non renseignee`
- `SIRET non renseigne`
- `NAF non renseigne`
- `TVA intracom non renseignee`

Ces textes de remplacement s'appliquent seulement au mode reconstruction du
Printer Agent. Le frontend ne change pas les tickets ESC/POS qu'il genere
actuellement.

### Ticket de commande

Le ticket de commande reconstruit doit reproduire le ticket actuel, y compris
les prix et le total.

Le ticket de commande doit avoir :

- `schemaVersion`;
- `kind`;
- `render.sections`;
- `orderId` ou `orderNumber`;
- date affichable ;
- lignes produits avec nom et quantite ;
- prix des lignes ;
- total ;
- table, client ou canal de vente.

Les champs comme paiement, note, mode de vente, personnalisations et boutique
sont affiches lorsqu'ils existent dans le ticket actuel.

## Rendu par transport

En mode `Donnees ticket`, le Printer Agent reconstruit un format compatible avec
chaque transport actif de l'imprimante :

- transports bruts ESC/POS : generer un payload ESC/POS depuis `render`;
- transports ePOS HTTP/XML : generer un payload XML/ePOS depuis `render`;
- autres transports deja presents : utiliser le format compatible avec leur
  sender existant quand possible.

Si plusieurs transports sont actives sur une imprimante, le comportement
multi-transport actuel est conserve : chaque transport compatible recoit sa
version du ticket.

Un transport non compatible avec la reconstruction est ignore silencieusement.
Si aucun transport ne peut imprimer, le job echoue avec une erreur claire.

## Frontend POS

Les helpers existants restent la source pour construire le ticket :

- `helpers/cashierReceipt.js` pour le ticket de caisse ;
- `helpers/orderTicket.js` pour le ticket de commande.

Ils doivent etre etendus pour produire :

- le flux ESC/POS existant ;
- le flux XML existant ;
- `ticketData.business` ;
- `ticketData.render`.

Les tickets actuels doivent rester identiques autant que possible. La
reconstruction doit se baser sur les memes libelles, le meme ordre des sections,
les memes totaux, les memes lignes de personnalisation et les memes footers que
les tickets front actuels.

## Printer Agent

Chaque imprimante sauvegardee recoit un nouveau champ de configuration, par
exemple :

```json
{
  "ticketSource": "received"
}
```

Valeurs :

- `received` : mode par defaut, utilise `dataFormatESCPOS`;
- `ticketData` : reconstruit depuis `ticketData.render`.

L'interface affiche ce choix directement dans chaque carte imprimante sous une
forme simple :

- `Ticket recu`
- `Donnees ticket`

L'historique doit afficher le rendu reconstruit quand `ticketData` existe. Le
detail garde le JSON complet pour aider au diagnostic.

## Validation

La validation doit couvrir au minimum :

- le frontend envoie `dataFormatESCPOS`, `dataFormatXML` et `ticketData` pour un
  ticket de caisse direct ;
- le frontend envoie les trois champs pour un ticket de commande direct ;
- le ticket de caisse contient les champs legaux obligatoires dans
  `ticketData.business.shop`;
- le modele `render` contient les sections necessaires pour reproduire les
  tickets actuels ;
- les imprimantes existantes migrent en `ticketSource: "received"`;
- le Printer Agent utilise `dataFormatESCPOS` en mode `received`;
- le Printer Agent reconstruit depuis `ticketData.render` en mode `ticketData`;
- les transports non compatibles sont ignores en reconstruction ;
- une reconstruction sans transport compatible retourne une erreur claire ;
- l'historique/PDF privilegie le rendu `ticketData` quand disponible.

## Risques

- La fidelite parfaite depend de la qualite du modele `render`; il faut
  comparer les tickets reconstruits avec les tickets front existants.
- Les champs legaux manquants peuvent rendre un ticket reconstruit different du
  ticket ESC/POS actuel a cause des textes de remplacement.
- Le support de tous les transports depend des senders deja presents dans le
  Printer Agent.
- Le mode par imprimante doit rester simple pour eviter les erreurs de
  configuration pendant le service.

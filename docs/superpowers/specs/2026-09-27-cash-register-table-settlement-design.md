# Encaissement consolide d'une table

Date : 2026-09-27

## Contexte

Le tiroir-caisse permet aujourd'hui de selectionner des clients ou des commandes terminees, puis de les encaisser. La page de paiement accepte deja plusieurs commandes et Stripe Terminal peut creer un paiement unique pour plusieurs commandes, mais l'archivage et l'impression restent effectues commande par commande. Ce fonctionnement peut produire plusieurs tickets et rend une reprise partielle possible si une archive echoue.

Le besoin est d'ajouter un encaissement complet, limite a une seule table, qui regroupe toutes ses commandes terminees et non encore payees. L'encaissement doit produire un paiement, un ticket et une entree d'historique uniques, tout en conservant chaque commande comme unite tracable et remboursable.

## Objectifs

- Ajouter l'action `Encaisser toute la table` dans le tiroir-caisse.
- Inclure uniquement les commandes terminees et non payees de la table choisie.
- Conserver sans modification le parcours actuel d'encaissement d'une selection.
- Effectuer un seul reglement, y compris avec Stripe Terminal.
- Archiver toutes les commandes de facon atomique.
- Produire un ticket consolide comprenant le detail de chaque commande.
- Afficher une seule entree pour cet encaissement dans l'historique.
- Conserver la tracabilite et les remboursements au niveau de chaque commande.
- Empecher les doubles encaissements lors d'un double clic ou d'une reprise apres erreur.

## Hors perimetre

- Encaisser plusieurs tables simultanement.
- Fusionner definitivement les commandes en une nouvelle commande.
- Modifier le fonctionnement des commandes encore en preparation.
- Regrouper les commandes deja payees dans le nouvel encaissement.
- Creer un remboursement global de tout le groupe.
- Modifier les anciens tickets ou leur presentation historique.

## Decision d'architecture

Le backend devient la source de verite d'un encaissement consolide. Il cree un enregistrement parent d'encaissement de table et relie les archives individuelles des commandes a cet enregistrement. La creation du parent et de toutes les archives s'effectue dans une transaction SQL unique.

Cette solution est preferee a un regroupement uniquement frontend, car elle garantit l'atomicite, l'idempotence, une reimpression exacte et une representation stable dans l'historique. Elle evite aussi qu'un paiement unique aboutisse a un ensemble d'archives partiellement cree.

## Modele de donnees

Une table `cash_register_settlements` est ajoutee. Elle contient au minimum :

- un identifiant interne ;
- l'identifiant du commerce ;
- l'identifiant du point de service, lorsqu'il existe ;
- la reference de table affichee au moment de l'encaissement ;
- le moyen de paiement ;
- le sous-total avant remise ;
- le type et la valeur de la remise globale ;
- le montant de remise effectivement applique ;
- le total encaisse ;
- la reference du paiement Stripe Terminal, lorsqu'elle existe ;
- une cle d'idempotence fournie par le client ;
- l'utilisateur ayant effectue l'encaissement, lorsque cette information est disponible ;
- les dates de creation et de mise a jour.

La cle d'idempotence est unique dans le perimetre du commerce. Une nouvelle colonne nullable `cash_register_settlement_id` est ajoutee aux archives de commandes, avec un index et une cle etrangere vers l'encaissement parent. Elle reste nulle pour les archives historiques et les encaissements individuels existants.

Les montants sont enregistres dans l'unite monetaire entiere deja utilisee par le backend. Le parent conserve les totaux autoritatifs afin que la reimpression ne depende pas de donnees actives susceptibles d'etre modifiees par la suite.

## Contrat API

Un endpoint dedie cree l'encaissement consolide :

`POST /cash-register/settlements`

La requete contient :

- `orderIds` : liste non vide d'identifiants de commandes ;
- `paymentMethod` : moyen de paiement choisi ;
- `discount` : remise globale eventuelle dans le format metier valide ;
- `idempotencyKey` : identifiant stable conserve pendant toutes les reprises de la meme tentative ;
- la reference de paiement Terminal lorsque le parcours Terminal vient de reussir.

Le serveur ne fait confiance ni aux montants totaux calcules par le frontend ni a la table indiquee par l'interface. Il recharge les commandes, calcule les montants et derive la table depuis les donnees persistantes.

Pour un paiement manuel, le serveur compare `orderIds` a l'ensemble des commandes terminees et impayees actuellement presentes sur cette table. Une liste incomplete est rejetee : l'action doit toujours encaisser toute la table eligible, jamais un sous-ensemble silencieux.

Pour Stripe Terminal, le lot est fige et valide au demarrage du PaymentIntent. La finalisation reprend exactement les commandes couvertes par ce paiement. Une nouvelle commande terminee apres le demarrage du paiement reste disponible pour un encaissement ulterieur et ne bloque pas la finalisation du paiement deja accepte.

La reponse contient l'encaissement parent, les archives creees, les totaux, la ventilation de TVA et les donnees necessaires a l'impression du ticket consolide.

Un endpoint de lecture permet de consulter et reimprimer le groupe :

`GET /cash-register/settlements/:id`

Les endpoints existants d'archivage d'une commande et de lecture d'un ancien ticket restent compatibles et inchanges.

## Validations serveur

Avant toute mutation, le backend verrouille les commandes dans un ordre deterministe et verifie que :

- toutes les commandes appartiennent au commerce authentifie ;
- elles appartiennent toutes a la meme table ;
- elles sont encore actives et terminees ;
- pour un paiement manuel, elles correspondent exactement a toutes les commandes actuellement eligibles de la table ;
- pour Stripe Terminal, elles correspondent exactement au lot fige dans le paiement de cette tentative ;
- elles n'etaient pas deja payees avant cette tentative ;
- leur etat de paiement est compatible avec le moyen choisi ;
- le paiement Terminal eventuel est reussi, appartient au commerce et couvre exactement ces commandes.

Pour un paiement manuel, les commandes doivent etre impayees lors de la creation de l'encaissement. Pour Stripe Terminal, elles peuvent deja porter l'etat paye pose par le PaymentIntent de la tentative courante ; elles ne sont acceptees que si elles sont reliees au meme paiement Terminal reussi.

Si une commande a change, a deja ete payee par une autre tentative ou n'est plus eligible, l'API renvoie un conflit sans creer d'archive partielle. Le frontend recharge alors la table et explique que son contenu a evolue.

## Atomicite et idempotence

La creation du parent, la distribution de la remise, l'archivage des commandes et leur liaison au parent utilisent une transaction SQL unique. Une erreur annule l'ensemble des ecritures de cette transaction.

La logique d'archivage existante est extraite dans une fonction interne capable d'utiliser une connexion transactionnelle fournie. L'endpoint individuel continue d'appeler cette logique pour une seule commande, tandis que l'endpoint groupe l'appelle pour chaque commande dans la meme transaction.

Si la meme cle d'idempotence est renvoyee :

- un encaissement deja termine est retourne sans recreer de paiement ni d'archives ;
- une requete portant la meme cle mais un contenu different est rejetee ;
- une reprise apres une erreur transitoire peut terminer l'archivage sans redemander un paiement Terminal deja confirme.

## Calcul des remises et montants

La remise globale s'applique a l'ensemble des commandes eligibles de la table. Le backend recalcule le sous-total puis distribue la remise entre les commandes de facon proportionnelle.

Les ecarts d'arrondi sont distribues de facon deterministe par la methode des plus grands restes, avec l'identifiant de commande comme critere final de departage. La somme des remises par commande doit toujours etre egale a la remise globale, et la somme des montants archives doit toujours etre egale au total encaisse.

La ventilation de TVA est ensuite agregee a partir des montants archives, en reutilisant les regles fiscales actuelles. Les calculs du frontend servent uniquement a l'affichage provisoire ; la reponse du serveur remplace ces valeurs avant impression.

## Parcours frontend

Chaque carte de table du tiroir-caisse conserve l'action actuelle d'encaissement de la selection et recoit une action distincte `Encaisser toute la table`.

Cette nouvelle action :

1. recharge les commandes de la table ;
2. extrait toutes les commandes terminees et non payees ;
3. refuse de continuer si la liste est vide ;
4. ouvre la page de paiement existante avec les identifiants et un mode explicite d'encaissement de table ;
5. cree une cle d'idempotence stable pour cette tentative.

La page de paiement conserve les moyens existants, la remise globale et les parcours manuels ou Terminal. En mode table, sa validation appelle le nouvel endpoint groupe au lieu de boucler sur l'endpoint d'archivage individuel.

Pour Stripe Terminal, le PaymentIntent multi-commandes existant est utilise. Une fois le paiement confirme, la page appelle l'endpoint groupe avec la meme tentative. Si l'archivage echoue apres le paiement, l'interface propose une reprise et reutilise la cle d'idempotence et le paiement deja reussi ; elle ne relance jamais le lecteur.

Le bouton est desactive pendant la requete. Cette protection visuelle complete l'idempotence serveur sans la remplacer.

## Ticket consolide

Le ticket comprend :

- l'identite du commerce et les informations fiscales deja imprimees ;
- la table et la date de l'encaissement ;
- une section par commande, dans un ordre stable ;
- le numero de commande ;
- les articles, quantites, options et prix de cette commande ;
- le sous-total global ;
- la remise globale et son montant ;
- la TVA regroupee par taux ;
- le total encaisse ;
- le moyen de paiement.

Les generateurs de ticket SmartPrint, impression cloud et PDF recoivent un nouveau payload groupe. Les fonctions actuelles de ticket individuel restent disponibles pour les parcours existants. Le ticket n'est imprime qu'apres la confirmation autoritative de l'endpoint groupe.

## Historique et remboursements

La liste d'historique combine :

- une ligne par encaissement consolide, libellee `Encaissement table <reference>` ;
- les archives historiques ou individuelles non liees, affichees comme aujourd'hui.

Ouvrir un encaissement consolide affiche son resume puis toutes les commandes associees. La reimpression utilise les donnees figees du groupe et reproduit le ticket consolide.

Les commandes archivees restent des entites individuelles. Les actions de detail et de remboursement ciblent donc toujours une commande precise. Aucun remboursement global implicite n'est ajoute. Un remboursement individuel ne modifie pas retroactivement le contenu du ticket fiscal initial ; l'etat de la commande est presente dans le detail du groupe selon les conventions actuelles.

## Gestion des erreurs

- **Aucune commande eligible** : rester dans le tiroir-caisse et informer l'utilisateur.
- **Etat modifie avant paiement** : bloquer l'operation, recharger la table et afficher le conflit.
- **Paiement Terminal refuse ou annule** : ne creer ni encaissement parent ni archive.
- **Paiement Terminal reussi, archivage non confirme** : conserver la tentative et permettre une reprise sans nouveau debit.
- **Erreur SQL pendant l'archivage** : annuler toute la transaction.
- **Double clic ou reponse reseau perdue** : retourner le resultat associe a la cle d'idempotence.
- **Erreur d'impression** : conserver l'encaissement valide et permettre la reimpression depuis l'historique.

Les messages utilisateur distinguent clairement un paiement refuse, un contenu de table modifie, une finalisation a reprendre et une simple erreur d'impression.

## Compatibilite

- L'encaissement de la selection continue d'utiliser son comportement actuel.
- L'endpoint individuel d'archivage reste disponible.
- Les archives existantes n'ont pas besoin de migration de donnees ; leur lien de groupe reste nul.
- Les anciens ecrans de ticket continuent de fonctionner.
- Les nouvelles donnees de groupe sont ajoutees aux API d'historique sans supprimer les champs consommes actuellement.

## Strategie de tests

### Backend

- Creation d'un groupe contenant plusieurs commandes terminees et impayees d'une meme table.
- Rejet d'un lot vide, multi-table, multi-commerce, non termine ou deja paye.
- Validation du cas Terminal apres un PaymentIntent reussi.
- Rejet d'une reference Terminal etrangere, echouee ou portant sur un autre lot.
- Atomicite lorsque l'archivage d'une commande echoue.
- Idempotence d'une requete repetee et rejet d'une reutilisation incoherente de la cle.
- Distribution exacte de la remise et des arrondis.
- Totaux et ventilation de TVA du ticket.
- Lecture d'un groupe et preservation des endpoints historiques.

### Frontend

- Construction de la liste avec uniquement les commandes terminees et impayees.
- Conservation du parcours de selection actuel.
- Desactivation pendant l'encaissement et protection contre le double clic.
- Appel du nouvel endpoint pour les paiements manuels et Terminal.
- Reprise apres paiement Terminal sans second envoi au lecteur.
- Rendu du ticket avec plusieurs sections et totaux globaux.
- Affichage d'une seule ligne groupee dans l'historique.
- Consultation, reimpression et acces aux commandes individuelles.

### Verification manuelle

- Encaisser une table contenant plusieurs commandes avec chaque moyen de paiement disponible.
- Verifier qu'une commande payee ou encore en cuisine est exclue.
- Verifier un ticket physique et un PDF consolides.
- Simuler une coupure reseau apres un paiement Terminal puis reprendre la finalisation.
- Verifier qu'un remboursement individuel reste possible depuis le detail.
- Verifier les anciens tickets et l'encaissement partiel existant.

## Criteres d'acceptation

- Une table peut etre encaissee en une seule operation depuis le tiroir-caisse.
- Seules ses commandes terminees et impayees au debut de la tentative sont incluses.
- Le client ne subit qu'un seul paiement.
- Une erreur ne peut pas laisser un sous-ensemble de commandes archive.
- Une reprise ou un double clic ne peut pas creer un second encaissement.
- Un seul ticket consolide est imprime et peut etre reimprime a l'identique.
- L'historique affiche une seule entree groupee.
- Chaque commande reste identifiable et remboursable individuellement.
- Les parcours existants d'encaissement et les anciens tickets ne regressent pas.

# Intégration des branches actives dans staging

Demande du 12 novembre 2026 : enregistrer, pousser et fusionner les branches
applicatives en cours. L'utilisateur exclut ensuite `codex/smarteat-admin-v1`.
Les fichiers de cette administration restent conservés dans leur workspace.

## Périmètre intégré

- `codex/standalone-terminal-payments` : travaux locaux enregistrés dans
  `b06accf` côté frontend et `4ebba09` côté backend, puis intégrés à la version
  récente de staging. Les rapports TPE déjà équivalents ne sont pas remplacés.
- `feat/table-settlement` : règlement atomique de toutes les commandes d'une
  table, tickets regroupés, historique et récupération après interruption.
- `codex/loyalty-wallet-implementation` : historique réconcilié avec les
  corrections fidélité plus récentes, sans modification finale de l'arbre.
- Wallet, livraison, stock, stabilité des paiements et anciens tickets TPE :
  leurs branches applicatives étaient déjà intégrées ; leurs comportements
  récents restent conservés.
- Les sauvegardes historiques, anciennes notes techniques d'avril et branches
  temporaires de vérification ne sont pas des entrées de cette intégration.

Bases : frontend `152c4cb5de2d236758618940ac161eb5142c07e3`, backend
`46e4d47bb0b763871ae7bc4a7bade4255a52ff19`.
Révisions applicatives vérifiées : frontend
`2ef78f2541f5dbab03b25406047ca41301f64ce4`, backend
`e4aebcb2b37efb1776275ba1250b178931130e1b`.
Le complément documentaire suivant ne change pas ces sources applicatives.

## Résolution et tests

L'historique serveur compte chaque règlement une seule fois avant pagination,
avec des identités distinctes pour commandes, paiements TPE et règlements.
Les archives enfant exposent uniquement les liens et montants nécessaires.
Le prix réellement archivé doit correspondre à l'allocation figée, sinon toute
la transaction est annulée. Les livraisons gardent leur parcours distinct.
L'archivage partagé conserve la fidélité, les liens TPE et les règles existantes.

Les ajouts frontend comprennent aussi les détails de produit sur borne,
la validation téléphone et la gestion des livreurs dans l'équipe. Les versions
récentes des cartes Wallet, notifications et tickets restent conservées.

- Backend : suites générales et fidélité passées ; nouvelle suite générale
  passée après les corrections finales de revue. 28 contrats de règlement,
  contrats d'archivage partagé et 17 tests d'historique mixte/TPE vérifiés.
- Frontend : suite générale complète passée sur l'intégration ; après le
  correctif final ciblé, 77/77 tests de paiement et les contrôles liés aux
  stores, reçus, historique, confidentialité et persistance sont passés.
  Suite fidélité passée. Lint final : zéro erreur, 170 avertissements de style.
- Régressions observées en échec puis réussies : nouvel historique mixte,
  données privées exclues, changement de montant, livraison dans une sélection
  de table, isolation des détails et effets tardifs d'un encaissement.
- Historiques Git sortants et index backend contrôlés contre les secrets.
  Environnements, dépendances verrouillées et workflows de déploiement conservés.
  Le workflow manuel de validation ajoute désormais le test SQL d'historique.

## Revue indépendante

Une revue globale, suivie de la vérification ciblée du même reviewer, a identifié
et confirmé la correction de deux problèmes importants :

1. Une réponse tardive de règlement pouvait imprimer l'ancien ticket et ouvrir
   le tiroir après un changement de caisse/restaurant. Identité, jeton,
   génération et propriétaire de requête sont désormais contrôlés à chaque
   frontière asynchrone. Le reviewer a reproduit puis confirmé l'absence d'effet
   tardif et exécuté indépendamment les 77 tests de paiement.
2. Une sélection invalide pouvait provoquer une annulation Stripe avant son
   rejet. Éligibilité, table, montants, remise et sélection complète sont
   contrôlés avant la synchronisation externe ; la transaction répète ensuite
   les contrôles sous verrou. Les 28 contrats passent indépendamment.

Le contrôle réel MySQL a ensuite révélé un mélange de règles de comparaison
entre anciens champs latin1 et nouveaux champs Unicode dans le `UNION`.
Les projections textuelles de cette requête sont converties explicitement en
utf8mb4 avec une même règle locale. Les colonnes numériques/dates, paramètres,
filtres et schémas restent inchangés. Le même reviewer a vérifié ce correctif et
les 17 tests ciblés ; le test SQL réel est conservé dans le dépôt et la CI manuelle.

Aucun problème Critical ou Important ne reste ouvert dans la revue des sources.

## Vérifications isolées et publication

- MySQL/parcours téléphone : [43244191832](https://github.com/SuperJumper404/express-pos/actions/runs/43244191832),
  réussi sur `2cc1045`, avant le dernier correctif de prévalidation.
- Compilation Docker de la version frontend finale :
  [43248636237](https://github.com/SuperJumper404/pos-app/actions/runs/43248636237),
  réussi ; source exacte `2ef78f2`, Node 18, génération statique complète.
- SQL réel de l'historique regroupé, recherche et pagination, avec base
  MySQL temporaire et deux restaurants fictifs :
  [43250150730](https://github.com/SuperJumper404/express-pos/actions/runs/43250150730),
  réussi sur le backend final `e4aebcb` : trois types d'entrée, texte accentué et
  emoji, tris textuels et numériques dans les deux sens, groupes complets,
  recherche d'enfant et isolation des restaurants. Les parcours téléphone
  MySQL sont également passés sur cette version.
- Restauration des deux workflows temporaires : frontend
  `9132f3d8f9aee2e0138e4e3d9cf6f7e1337d089f`, backend
  `1c76845dbe3c52549cc2f809ed4447e7b2633d83` ; arbres identiques à leurs bases
  respectives, zéro fichier différent. Aucune branche temporaire intégrée.
- Publication staging effectuée sans force et références GitHub contrôlées :
  backend `e4aebcb`, frontend applicatif `2ef78f2`. Les deux références master
  sont restées à leurs révisions de départ. Les commits sources des branches
  de travail sont également poussés. Ce compte rendu et le plan complété sont
  publiés ensuite en complément documentaire frontend, sans modification du code.

La première tentative de compilation s'est arrêtée au contrôle Git d'une copie
superficielle, avant la compilation. Le contrôle utilise ensuite le commit
source explicitement épinglé ; l'intégration initiale a compilé avec succès
([43245656477](https://github.com/SuperJumper404/pos-app/actions/runs/43245656477)).
Les vérifications temporaires restent sur des branches distinctes et leur
workflow est restauré avant clôture.

## Limites et conservation

Cette tâche publie le code sur staging. Elle ne déploie pas les applications,
n'applique aucune migration à la base applicative et ne modifie pas master.
Aucune action Stripe réelle, notification, impression, carte ou compte client
n'est créé. Les essais SQL utilisent uniquement une base locale jetable.
La concurrence des règlements et les périphériques réels restent à vérifier
dans les essais de déploiement ; les tests exécutés ne constituent pas un essai
sur imprimante, TPE ou iPhone physique.

Les branches et workspaces d'origine restent disponibles. Aucun fichier privé,
profil navigateur, environnement local ou visuel utilisateur n'a été supprimé
ou ajouté à Git. Aucun nettoyage récursif n'a été retenté.

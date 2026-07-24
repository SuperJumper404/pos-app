# Checklist staging — personnalisations produit V2

Date de préparation : 24 juillet 2026
Décision actuelle : **Blocked — ne pas déployer en staging partagé**

Deux gates restent non satisfaits : le vérificateur de migration local bloque
sur six groupes legacy orphelins et le lint global sort encore avec 23 erreurs.
La matrice manuelle n'a pas été exécutée. Aucun résultat manuel n'est déduit
des tests unitaires ou du build.

## Statut des contrôles automatisés

| Contrôle | Statut | Preuve du 24/07/2026 |
| --- | --- | --- |
| Backend `npm test`, Node 20 cible compose | Pass | Node `v20.20.2`, 9 suites terminées, code 0 |
| Migration locale `npm run db:up:local` | Pass | migration `20260724120000` appliquée en 266,7806 ms |
| Vérificateur V2 local | Blocked | code 1 : 22 groupes legacy, 16 étapes partagées, 6 associations produit manquantes |
| Schéma V2 live | Pass | 7 tables, 2 colonnes d'idempotence et index unique présents |
| Frontend `npm test`, Node 18 cible compose | Pass | Node `v18.20.8`, 7 suites terminées, code 0 |
| Lint des 26 fichiers JS/Vue touchés | Pass | 0 erreur, 21 avertissements |
| Lint frontend global | Fail | branche : 23 erreurs/117 avertissements ; base `17c440a` : 24 erreurs/130 avertissements |
| Build frontend local Node 18 | Pass | Nuxt compilé avec succès, code 0, après réparation de l'installation locale Vuetify |
| Parcours navigateur/local/staging | Not run | aucune session manuelle n'a été exécutée dans cette validation |

L'installation locale de `vuetify@2.5.3` ne contenait pas son dossier `src` et
a fait échouer le premier build. Le tarball exact verrouillé a été réextrait
dans `node_modules`; `package.json` et `package-lock.json` sont restés
inchangés. Le second `npm run build-local` sous Node 18 a réussi. Le déploiement
compose utilise `npm ci`, qui doit installer un paquet complet dans un volume
propre.

Le lint global ne régresse pas le commit de base, mais le critère « zéro
erreur » reste objectivement non atteint. La dette ESLint doit être corrigée ou
faire l'objet d'une dérogation explicite hors de cette checklist.

## Blocage des données legacy

La base locale contient six groupes `product_customization` dont le produit
n'existe plus :

| Groupe | Produit absent | Choix | Sélections de commande |
| ---: | ---: | ---: | ---: |
| 84 | 34 | 3 | 0 |
| 85 | 1 | 0 | 0 |
| 86 | 1 | 0 | 0 |
| 87 | 1 | 0 | 0 |
| 88 | 1 | 0 | 0 |
| 89 | 3 | 0 | 0 |

Ne pas supprimer ou réassigner ces lignes automatiquement. Un propriétaire des
données doit approuver, pour chaque groupe, la restauration du produit, une
correspondance métier explicite ou une suppression intentionnelle après
sauvegarde. Le vérificateur doit ensuite sortir avec le code 0 avant tout
déploiement.

## Variables et stockage à contrôler

- [ ] `STRIPE_STOCK_RESERVATION_MINUTES=15` est défini explicitement.
- [ ] `PUBLICIMAGEPATH=/home/smarteat/public` correspond au volume persistant.
- [ ] `${PUBLICIMAGEPATH}/customization-choices` existe et est inscriptible.
- [ ] `/api/v1/imgcustomizations/:filename` sert une image JPEG, PNG ou WebP.
- [ ] Le backend compose/PM2 utilise Node 20 ; le frontend compose utilise
  Node 18.
- [ ] La sauvegarde MySQL et celle du volume d'images ont été restaurées sur un
  environnement isolé.

## Ordre obligatoire du déploiement

| Ordre | Étape | Gate attendu | Statut |
| ---: | --- | --- | --- |
| 1 | Sauvegarde MySQL + volume d'images | restauration testée | Not run |
| 2 | Migration additive V2 | commande code 0 | Not run en staging |
| 3 | Vérificateur V2 | tous les deltas/anomalies à 0 | Blocked localement |
| 4 | Déploiement backend V2 | healthcheck et logs sains | Not run |
| 5 | Smoke de l'ancien frontend | parcours legacy inchangés | Not run |
| 6 | Déploiement frontend V2 | build artifact sous Node 18 | Not run |
| 7 | Smoke V2 et observation | matrice ci-dessous validée | Not run |

Commandes backend à exécuter dans l'environnement staging chargé :

```sh
node --version
npm ci --include=dev
npm test
npm run db:up:staging
ENV_FILE=.env.staging node scripts/verify-customization-v2.js
```

Commandes frontend à exécuter sous Node 18 :

```sh
npm ci --include=dev
npm test
npm run lint
npm run build-local
```

Ne pas passer à l'étape suivante si la commande précédente sort avec un code
non nul. Le frontend V2 dépend du backend V2 et ne doit jamais être déployé en
premier.

## Matrice d'acceptation manuelle

Valeurs autorisées : `Pass`, `Fail`, `Blocked`, `Not run`.

| Scénario | Statut | Résultat/incident à renseigner |
| --- | --- | --- |
| Bibliothèque admin : créer/modifier/désactiver une étape | Not run | — |
| Choix simple sans image et placeholder | Not run | — |
| Upload/remplacement JPEG, PNG et WebP ≤ 5 Mo | Not run | — |
| Refus d'un type invalide ou d'un fichier > 5 Mo | Not run | — |
| Choix produit lié de la même boutique | Not run | — |
| Produit lié en rupture visible mais désactivé | Not run | — |
| Création produit avec configuration V2 atomique | Not run | — |
| Édition produit et sauvegarde de configuration | Not run | — |
| Validation minimum/maximum dans l'admin | Not run | — |
| Étape obligatoire impossible : produit non commandable | Not run | — |
| Assistant : retour/continuer/résumé et conservation | Not run | — |
| Deux configurations différentes restent séparées | Not run | — |
| Deux configurations identiques fusionnent | Not run | — |
| Modifier une ligne puis fusionner avec une ligne identique | Not run | — |
| Caisse administrateur | Not run | — |
| Caisse caissier | Not run | — |
| QR/table | Not run | — |
| Click-and-collect | Not run | — |
| Paiement au comptoir : stock parent et lié une seule fois | Not run | — |
| Stripe succès : réservation validée sans second décrément | Not run | — |
| Stripe annulation/échec : réservation libérée une seule fois | Not run | — |
| Stripe expiration : stock restauré et commande terminale | Not run | — |
| Deux commandes concurrentes sur le dernier stock | Not run | — |
| Repricing : devis serveur sans écriture avant confirmation | Not run | — |
| Double clic/token identique : replay idempotent | Not run | — |
| Détail actif : choix groupés par étape | Not run | — |
| Archive et ticket : instantanés conservés | Not run | — |
| Affichage mobile | Not run | — |
| Affichage tablette | Not run | — |
| Affichage bureau | Not run | — |

## Smoke legacy avant frontend V2

- [ ] Liste et détail produits depuis l'ancien frontend.
- [ ] Création/édition d'un produit legacy via la projection temporaire.
- [ ] Commande non-Stripe sans personnalisation et avec personnalisation.
- [ ] Paiement Stripe et paiement au comptoir.
- [ ] Détail actif, archive et ticket.
- [ ] Aucun retrait des anciennes tables ni de l'adaptateur legacy.

## Retour arrière

Le premier retour arrière consiste à remettre le frontend précédent tout en
gardant le backend V2 et le schéma additif. Cela préserve les réservations,
instantanés et tokens déjà écrits.

Après une première écriture V2, ne pas exécuter `dbmate down` : le down supprime
les sept tables V2, les colonnes de token/hash et leur index. Un retour arrière
global nécessite la sauvegarde complète. Avant toute écriture V2 seulement, un
down peut être envisagé après arrêt du frontend V2 et validation explicite.

Les sélections déjà manquantes dans les anciennes archives ne peuvent pas être
reconstruites. Les tables legacy, la projection `product_customization` et les
écritures de compatibilité restent en place pendant cette phase ; leur retrait
fera l'objet d'un changement séparé après observation en production.

## Gate final

- [ ] Le vérificateur V2 sort avec le code 0 sur la base staging réelle.
- [ ] Le lint global est à zéro erreur ou une dérogation explicite est signée.
- [ ] Tous les scénarios critiques de la matrice sont `Pass`.
- [ ] Aucun scénario critique n'est `Fail`, `Blocked` ou `Not run`.
- [ ] Le plan de retour arrière a été relu par l'exploitant et le responsable
  métier.

Tant que ces cases ne sont pas validées, la décision reste **Blocked**.

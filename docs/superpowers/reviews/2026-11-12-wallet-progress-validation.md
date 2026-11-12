# Apple Wallet : récompense et progression

Livré le 12 novembre 2026 sur staging et production avec Docker.

## Résultat

Le solde apparaît dans l'en-tête. Une seule zone « RÉCOMPENSE » affiche le nom
de l'objectif et sa progression chiffrée. « PROCHAIN PALIER » est supprimé.
La barre est composée dans les trois tailles de bannière, en conservant le
visuel original du restaurant au-dessus d'un pied sombre de 32 points.
Le numéro reste sous le QR ; les identifiants, jetons et codes restent stables.
L'offre utilisable reste au verso. Google Wallet reste inchangé.

La progression utilise le solde disponible après réservations et la prochaine
récompense active. Sans objectif actif, aucune barre n'est produite. L'aperçu
administrateur emploie un exemple explicitement illustratif, sans créer de client.

## Révisions et validation

- Backend : `a723900` → `46e4d47bb0b763871ae7bc4a7bade4255a52ff19`.
- Frontend : `1f30b75` → `0aaf7ae9ec35c42e8fff54641f239235f6bf03ad`.
- Les deux versions applicatives sont intégrées à `staging` et `master`.
  Le présent compte rendu est un complément documentaire.
- Backend : cinq nouveaux cas de progression puis le format signé ont échoué
  avant implémentation ; six cas de progression/contraste passent après.
  Les suites générales et fidélité complètes sont passées.
- Frontend : deux nouveaux cas ont échoué avant implémentation, puis passé avec
  le rendu Vue réel. Suites générales et fidélité complètes passées ; lint
  avec zéro erreur et 162 avertissements préexistants.
- PNG : réservations, objectifs successifs/atteints/expirés/absents, transparence,
  RGB, ratios, trois résolutions, préservation des pixels/buffers source,
  image manquante et entrées corrompues/surdimensionnées vérifiés.
- Carte signée : manifeste, signature PKCS7, en-tête, récompense, QR, numéro et
  identité vérifiés avec un dépôt fictif et sans réseau.
- Une revue indépendante a relevé zéro problème Critical, Important ou Minor
  exploitable. Elle n'a pas remplacé les tests ni les contrôles de déploiement.
- Aperçus réels inspectés : absence d'objectif, 20/30, objectif atteint, nom long
  et solde élevé. Contrôle mobile à 375 pixels sans débordement horizontal.
  Une passe de détection a relevé quatre choix intentionnels propres au rendu
  Wallet : tailles de texte et pied sombre. Aucun changement global de thème.

La génération locale Nuxt s'est interrompue sans résultat observable : elle ne
compte pas comme réussite. Les générations Docker Linux ont réussi ; le HTML
public de chaque environnement correspond au fichier du conteneur, et trois
scripts sont servis en HTTP 200.

## Déploiements Docker

| Environnement | Backend | Frontend |
| --- | --- | --- |
| Staging | [43233239314](https://github.com/SuperJumper404/express-pos/actions/runs/43233239314) | [43233246370](https://github.com/SuperJumper404/pos-app/actions/runs/43233246370) |
| Production | [43235087362](https://github.com/SuperJumper404/express-pos/actions/runs/43235087362) | [43235097856](https://github.com/SuperJumper404/pos-app/actions/runs/43235097856) |

Les quatre déploiements ont réussi. Le staging a été validé avant de démarrer
la production. Aucun job PM2 n'a été utilisé.

- Staging : [API et signature 43233719262](https://github.com/SuperJumper404/express-pos/actions/runs/43233719262),
  [frontend public 43234474950](https://github.com/SuperJumper404/express-pos/actions/runs/43234474950).
- Production : [contrôle complet 43235598097](https://github.com/SuperJumper404/express-pos/actions/runs/43235598097).
- Les révisions exécutées correspondent exactement aux deux commits ci-dessus.
- Signature réelle en Docker isolé avec les certificats montés : clé/certificat,
  chaîne Apple, identité, échéance, manifeste et signature validés ; progression
  graphique 20/30 dans les trois PNG, en-tête natif présent, prochain palier absent.
- Production : mode `production`, image `smarteat-pos-wallet:production`.
  Staging conserve le mode `development`. Certificat valable jusqu'au
  1 décembre 2027 à 20:28:45 UTC ; aucun secret ni certificat copié dans Git.
- API administrative disponible, parcours téléphone HTTPS/session/CSRF valide,
  origine étrangère et faux HTTPS refusés, callback Apple HTTP 204 pour un
  appareil inexistant, 60 migrations et zéro redémarrage API après démarrage.
- SHA256 HTML staging : `3cc7296d2b58bd396433f01b21692235c0e63fd93c58a7951a12994e7ad950d8`.
- SHA256 HTML production : `b79a643fbc2d6bdb7f826167c7245b453f09f58b9b26c30416e7dba5a9313b8c`.

## Sauvegardes et opérations

Les quatre sauvegardes privées précédant les déploiements ont été vérifiées :
répertoires protégés et archives valides avec `gzip -t`.

- Backend staging : `/home/vscodeserver/smarteat-backups/backend-20261112-140325-2818941`.
- Frontend staging : `/home/vscodeserver/smarteat-backups/frontend-20261112-140328-2819171`.
- Backend production : `/home/smarteatprod/smarteat-backups/backend-20261112-141421-1214869`.
- Frontend production : `/home/smarteatprod/smarteat-backups/frontend-20261112-141424-1215091`.

Audits : [staging 43235799291](https://github.com/SuperJumper404/express-pos/actions/runs/43235799291)
et [production 43235874396](https://github.com/SuperJumper404/express-pos/actions/runs/43235874396).
Le workflow temporaire de la branche opérationnelle a été restauré par
`6e63b412f31f284bfc399c8fee1722b30554adfc` : arbre identique à sa base
`46e4d47`, zéro fichier différent. Cette branche n'est pas intégrée aux branches
applicatives. Transport SSH épinglé, vérifications sans écriture SQL.

## Limites et décisions

Aucun compte, point, récompense, campagne, SMS, paiement ou envoi APNs créé.
Les cartes existantes n'ont pas reçu d'actualisation forcée ; le nouveau format
est généré à leur prochaine récupération normale. Les règles d'adhésion par
téléphone depuis le QR d'une table et de recherche en caisse/borne restent identiques.

Apple contrôle le rendu final sur iPhone/Watch, notamment la troncature des noms
longs. L'aperçu web et la carte signée ont été contrôlés ; l'ajout et l'affichage
sur un appareil physique restent à confirmer par le restaurateur.

Les contrôles déjà réussis n'ont pas été répétés sans modification applicative.
Le workspace et les artefacts ignorés sont conservés, ainsi que les originaux
utilisateur dans `output/imagegen/`. Aucun nettoyage récursif n'a été retenté.

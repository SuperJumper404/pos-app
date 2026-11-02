# Nom du restaurant et titre des notifications Apple Wallet

La notification utilise le nom réel du restaurant dans son en-tête. Le nom du programme reste celui de la carte. L'onglet Notifications propose un titre saisi à chaque envoi, placé sur la première ligne du message. Apple contrôle la présentation finale ; aucun sous-titre iOS indépendant n'est promis.

## Changement

- Nom du restaurant lu côté serveur par jointure délimitée avec le restaurant du pass ; aucune valeur de restaurant fournie par le client ne sert d'autorité.
- Titre limité à 80 caractères sur une ligne ; titre, saut de ligne et message limités à 200 caractères au total. Le compteur du message reflète la place restante.
- Le texte complet est figé dans le brouillon existant. Changer le titre invalide l'aperçu ; une réponse tardive ne restaure pas un ancien brouillon.
- Les anciens appels sans titre restent compatibles. Destinataires figés, consentement, confirmation et délai entre les envois conservés ; aucune migration ajoutée.

## Validation

17 tests ciblés réussis après observation de leurs échecs, plus les scénarios de payload et de vraie signature OpenSSL : nom par restaurant, carte conservant son nom de programme, titre composé, limites, autorisation administrateur, conflit d'idempotence et modification tardive.

Revue indépendante : un défaut Important identifié sur les séparateurs Unicode. Régression observée en échec puis corrigée sur le client et le serveur, avec refus avant écriture. Les suites générales frontend/backend et les suites fidélité passent ; lint sans erreur avec 162 avertissements existants. Aucun point mineur différé. La génération locale a réussi ; la génération Linux finale est vérifiée lors du déploiement.

Intégration réelle dans une base MySQL 8 jetable réussie : noms de deux restaurants isolés, texte titre/message enregistré, consentement gelé puis retiré avant traitement. Les données du staging ne sont pas utilisées pour ces tests.

## Déploiement

Backend `4f3cf63`, [workflow Docker](https://github.com/SuperJumper404/express-pos/actions/runs/41491704908). Frontend `43c06ee`, [workflow Docker](https://github.com/SuperJumper404/pos-app/actions/runs/41491925982).

Sauvegarde privée préalable : base compressée vérifiée, sources, configuration, description des conteneurs et visuels Wallet. Production et PM2 inchangés. Certificats et secrets conservés hors Git.

La génération Linux est terminée ; les deux workflows sont réussis. L’index public répond HTTP 200 et correspond au fichier du conteneur (SHA-256 `162625ee4141b2b2c85375c391d37ec64394381a94b0053b75e2616e7195b24a`) ; les trois scripts référencés répondent HTTP 200. Les 57 migrations sont conservées. Le fichier Apple Wallet signé utilise « demo » comme en-tête de restaurant, avec le nom du programme conservé sur la carte.

Le nouveau formulaire a été vérifié dans le navigateur : titre, message, limites et activation du bouton de vérification. Un exemple a uniquement été saisi localement puis abandonné ; aucun brouillon de campagne ou envoi n’a été créé. L’onglet de contrôle a été fermé.

## Test utilisateur

Recharger [Fidélité → Notifications](https://staging.smarteat.fr/fidelite), saisir un titre et un message, vérifier les destinataires puis confirmer uniquement l'envoi souhaité. Lors de l'actualisation de la carte, Wallet utilise le nom du restaurant en tête et le titre au début du message. Le restaurant de staging est actuellement nommé « demo ».

Aucune campagne, notification, image, adhésion, point ou paiement de test n'a été créé sur staging par cette intervention. Réception et présentation sur iPhone restent un test physique.

## Décisions

- Ruling: use a title per campaign under the user's request for restaurant name plus a title — optional clarification asked, reasonable time allowed and this assumption announced. Cost if wrong: user may prefer a fixed title in programme settings.
- Ruling: keep the existing 200-character combined message storage instead of adding a schema/worker title column — the transport consumes a single change message and campaign history already freezes it. Cost if wrong: less room for body text when a title is present.
- Ruling: server restaurant name becomes Apple organizationName while programme name stays on the card — matches requested notification identity. Cost if wrong: an old iOS notification label may remain cached until updated.
- Ruling: Unicode C1 controls and U+2028/U+2029 are forbidden in titles on both client and server — enforces one-line title semantics; cost if wrong: a deliberately supplied control separator is rejected.
- Final: Ruling: iPhone presentation, notification-label cache and APNs reception remain physical checks — no provider message sent for validation; cost if wrong: an installed card may need a fresh update before its header changes.
- Final: Ruling: ignored scratch retained after the earlier automatic cleanup rejection — do not retry a blocked recursive deletion; cost: local ignored execution artifacts remain.

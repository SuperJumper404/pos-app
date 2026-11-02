# Icône des notifications Apple Wallet — validation

Le logo signalé par l'utilisateur se trouvait dans les notifications Apple Wallet. Ce visuel provient des fichiers `icon.png`, `icon@2x.png` et `icon@3x.png` du pass ; le champ URL de Google Wallet ne le modifie pas. [Documentation Apple](https://developer.apple.com/design/human-interface-guidelines/wallet).

## Correction

L'éditeur propose « Icône des notifications Apple Wallet », avec recadrage carré et aperçu du visuel publié. Le navigateur génère les trois PNG 38/76/114 px. L'administrateur peut publier l'icône seule, avec conservation du logo et de la bannière. Les anciennes versions sans icône personnalisée restent compatibles avec le repli existant. Le champ URL est explicitement nommé « Logo Google Wallet ».

La publication, la validation PNG, l'isolation par restaurant et la signature existantes sont conservées. Aucune dépendance, migration, modification de certificat ou nouvelle connexion externe n'est ajoutée. Aucun visuel client ni message marketing n'est publié automatiquement pour ce test.

## Vérification du code

- Cinq tests unitaires/HTTP ont échoué avant correction puis réussi. Le test de priorité de l'icône publiée dans le paquet signé a également échoué puis réussi.
- 14 tests ciblés finaux réussis : tailles/variantes, conservation lors de publications partielles, groupes invalides, isolation, multipart réel, droits administrateur, aperçu ancien sans erreur et publication de l'icône seule.
- Vrai paquet signé avec OpenSSL local : variantes personnalisées prioritaires, manifeste correct et signature PKCS7 vérifiée. Ce test ne représente pas une installation iPhone.
- Régression observée en ligne sur les anciennes cartes : l’intercepteur Axios global absorbait la réponse d’erreur 404 avant le lecteur d’aperçu. Un test HTTP réel avec Axios et ce même intercepteur a reproduit le message, puis validé sa correction. Les aperçus optionnels traitent maintenant leur 404 comme une absence normale, avant cet intercepteur. Le comportement global des autres appels reste inchangé.
- Suites générales frontend/backend et suites fidélité réussies ; lint sans erreur, 162 avertissements existants ; génération staging locale réussie.
- Revue indépendante favorable : aucun défaut Critical, Important ou Minor identifié ; 13 tests ciblés réexécutés par le relecteur.

## Versions

- Frontend `c53e897a73206a19311eb0a535b9d24de564e715`, [workflow Docker final](https://github.com/SuperJumper404/pos-app/actions/runs/41456883819).
- Backend `6b5c3795230617d5c865bc887e91606cc0fce9de`, [workflow Docker](https://github.com/SuperJumper404/express-pos/actions/runs/41454888003).
- Sauvegarde privée préalable : base SQL vérifiée, sources, configuration, description des conteneurs et volume des visuels Wallet. Production et PM2 inchangés.

## Validation en ligne

Les deux workflows Docker sont réussis et la génération Linux effective est terminée. L’index public répond HTTP 200 et correspond au fichier du conteneur (SHA-256 `246f7f56c2860a9929155c9cb58adf8ec295005ff2f625477fc46790853b40cd`) ; les trois scripts Nuxt référencés répondent HTTP 200. La base conserve ses 57 migrations.

Dans le navigateur administrateur, « Carte Wallet » affiche le champ d’icône, le logo et la bannière existants et aucun message d’erreur pour l’ancienne version sans icône. Aucune image ni notification de test n’a été publiée. L’onglet de contrôle a été fermé. Le rendu et la réception sur iPhone restent à confirmer.

## Parcours de test

Dans [Fidélité → Carte Wallet](https://staging.smarteat.fr/fidelite), importer une image dans « Icône des notifications Apple Wallet », valider le recadrage puis cliquer « Publier le visuel ». Attendre la mise à jour de la carte sur l'iPhone, puis vérifier la prochaine notification autorisée. Le rendu et la réception sur l'appareil restent à confirmer ; une ancienne notification déjà affichée ne constitue pas la preuve du nouveau visuel.

## Décisions d'exécution

- Ruling: proceed inline under the existing custom-card and staging authorization — user identified notification branding as the failing surface; no approval already granted is requested again. Cost if wrong: user may prefer the global icon.
- Ruling: use a separate square notification icon rather than crop the wide logo automatically — protects the logo framing and gives each restaurant control. Cost if wrong: one additional image import.
- Ruling: use current Apple 38-point icon guidance (38/76/114 pixels) rather than archived 29-point guidance — official current HIG verified. Cost if wrong: older devices may rescale the icon.
- Ruling: use the existing private staging Nuxt wrapper for local generation — shared Windows node_modules points Nuxt cache to the original checkout without explicit rootDir/cacheDir; no source/environment refactor. Cost if wrong: local wrapper could differ from Linux; actual staging artifact also verified.
- Final: Ruling: real iPhone rendering/reception and Apple certificate acceptance are physical/provider checks — pass bytes/manifest and local PKCS7 signature are verified without claiming device success; cost if wrong: a device-specific display issue can remain.
- Final: Ruling: Linux build and deployment must be verified by actual served artifacts — reviewer source checks do not establish runtime behavior; cost if wrong: generated bundles might differ.
- Ruling: treat optional preview404 as a normal response locally instead of changing global Axios error behavior — bounds the fix to optional Wallet artwork. Cost if wrong: other existing error-interceptor behavior remains outside this change.
- Ruling: retain ignored execution scratch after the earlier automatic cleanup rejection rather than retry a blocked recursive deletion — no impact on application; cost: local ignored files remain.

Aucun point mineur différé.

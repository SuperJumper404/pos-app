# Fidélité SmartEat : caisse, borne, QR de table et Apple Wallet

Date : 1 novembre 2026.
Statut : conception proposée, en attente de validation utilisateur ; aucun développement produit autorisé par ce document seul.

## Intention et décisions exprimées

Le restaurant doit reconnaître ses adhérents pendant une commande, leur permettre de cumuler et de dépenser leurs points, et gérer son programme et ses cartes Wallet depuis SmartEat.

Décisions explicites de l'utilisateur :

- Caisse et borne : retrouver uniquement les adhésions existantes par numéro de carte ou téléphone ; pouvoir cumuler des points et utiliser une récompense.
- Aucun code reçu par téléphone n'est demandé pour retrouver une carte, cumuler ou utiliser des points à la caisse et sur la borne.
- Adhésion : uniquement sur le téléphone du client après ouverture du parcours par le QR d'une table. Aucune inscription à la caisse ou sur la borne.
- Après paiement : points calculés selon les euros dépensés et solde visible sur la carte Apple Wallet.
- Un accès « Fidélité » côté restaurant : liste des clients et soldes, configuration des offres, nombre de points par euro dépensé, image de la carte et envoi de notifications Wallet.

Le parcours retenu est une carte Apple Wallet avec QR et numéro lisible. Aucune intégration NFC au terminal de paiement n'est demandée par les parcours décrits. L'ajout dans Wallet reste confirmé par le client sur son iPhone.

## Approches

### Compléter la fidélité existante — approche recommandée

Étendre les modules Vuex/Vuetify et les services Express/MySQL déjà présents. Conserver les mêmes adhésions, QR, journal de points, réservations, transactions de paiement, passes et tâches de synchronisation. C'est l'approche cohérente avec les consignes du dépôt et les parcours demandés ; elle évite une seconde source de soldes. Elle demande de compléter les autorisations borne, l'inscription liée au QR, les images et les messages.

### Service Wallet tiers — non retenu dans cette proposition

Un prestataire pourrait gérer l'émission et les messages, mais imposerait un autre compte fournisseur et une synchronisation supplémentaire alors que l'émission et les mises à jour existent déjà. Aucun besoin exprimé ne justifie cette migration ou une nouvelle dépendance externe.

L'approche native est une proposition de l'agent fondée sur l'architecture existante, pas une préférence fournisseur attribuée à l'utilisateur.

## État observé du projet

- `pages/fidelite.vue` : règles de points, offres, liste des adhérents, corrections, logo par URL et couleurs ; accessible depuis Clients, pas encore comme module de navigation complet.
- `components/loyalty/LoyaltyPos.vue` : recherche par QR, association à une commande, réservation et libération d'une récompense ; pas de recherche par téléphone ou numéro court.
- `components/loyalty/LoyaltyCheckout.vue` : identification personnelle et adhésion dans le panier ; la restriction d'inscription au QR de table n'est pas garantie par le serveur actuel.
- `pages/compte/fidelite.vue` : carte, points, offres, historique, adhésion et ajout Wallet ; le lien depuis Wallet ouvre cette page sans restaurer de table.
- `pages/borne.vue` et `helpers/kioskCheckout.js` : collecte nom/téléphone, paiement en caisse ou terminal ; pas de sélection fidélité dans les données envoyées.
- Backend voisin : `m_loyalty`, contrôleur et routeur associés, journal transactionnel, réservation de points, synchronisation différée et émission Apple/Google déjà présents. Les routes staff de fidélité rejettent actuellement les sessions `service_point` ; une borne ne peut pas simplement les réutiliser avec des droits administrateur.
- `loyaltyWallet.js` : passes Apple signés, APNs, identifiants stables et images serveur par restaurant ; aucun import de bannière ni campagne manuelle.
- L'identification personnelle par code et la normalisation internationale des téléphones existent. Réutiliser ces mécanismes.

Ces observations décrivent le code lu, pas une validation de son fonctionnement sur une base réelle ou un iPhone.

## Périmètre et limites

Livrer tous les parcours ci-dessous ; un découpage en étapes techniques ne réduit pas le périmètre. Préserver Nuxt 2, Vue 2, Vuetify, Vuex, Axios et Express/MySQL, ainsi que les modifications locales étrangères à la fidélité.

Ne pas créer un nouveau système de comptes, de points ou de paiement. Conserver les cartes Google existantes sans étendre cette demande à de nouvelles fonctions Google. Les campagnes planifiées, le ciblage avancé et le NFC ne font pas partie de cette première version proposée.

## Parcours et autorisations

### Caisse

Le personnel autorisé ouvre « Fidélité » sur la commande avant le paiement, choisit téléphone ou numéro de carte, ou scanne le QR existant. Une recherche exacte retourne l'adhésion du restaurant courant, son solde disponible et les offres applicables. Le personnel confirme l'association à la commande et, séparément, l'utilisation d'une offre. La recherche seule ne réserve ni ne dépense rien.

Sans résultat, afficher « Aucune carte trouvée. Pour rejoindre la fidélité, scannez le QR de votre table depuis votre téléphone. » Aucun bouton ne crée d'adhésion. Une fiche client sans adhésion ne vaut pas une carte existante.

La validation de l'offre reste celle du personnel autorisé, comme dans le parcours caisse actuel. Le restaurant et la commande sont déterminés côté serveur ; l'identifiant de carte ne donne pas accès à un autre restaurant.

### Borne

Ajouter une étape facultative « Ma fidélité » avant le choix du paiement, en conservant le parcours nom/téléphone actuel. Rechercher une carte existante par numéro de carte ou téléphone, puis permettre son association pour cumuler et la sélection explicite d'une récompense. La commande reste possible sans fidélité et sans compte trouvé.

Décision utilisateur : la saisie du téléphone ou du numéro de carte suffit à retrouver l'adhésion, afficher ses points, associer les gains et choisir une récompense, sans code reçu par téléphone. L'utilisation de la récompense demande seulement une confirmation explicite à l'écran. Aucun challenge SMS ou WhatsApp ni autorisation de dépense fondée sur un code n'est ajouté sur la borne. Cette recherche n'ouvre pas de session personnelle durable et ne crée ni compte ni adhésion. Une modification de récompense ou de panier impose de recalculer les conditions et de faire confirmer à nouveau la récompense si nécessaire.

Après une recherche exacte, retourner uniquement les informations nécessaires à la commande, notamment le solde et les offres utilisables, sans coordonnées complètes ni historique personnel. Les routes borne exigent une session active autorisée pour la borne du restaurant ; elles ne donnent jamais accès à la liste des clients, aux corrections ou aux réglages. Les bornes ouvertes par un compte staff autorisé et celles ouvertes par un service point sont couvertes sans élargir les droits des autres rôles.

Réinitialiser la fidélité sélectionnée, les saisies, les offres et les données d'affichage après commande terminée, abandon ou expiration d'inactivité. Ne pas conserver ces données dans la persistance navigateur. Lier les actions à la tentative active pour ignorer les réponses tardives d'un client précédent.

### Téléphone après QR de table

L'ouverture du QR crée le contexte table/restaurant habituel. Dans le parcours commande, le client s'identifie avec son téléphone vérifié. S'il est adhérent, sa carte et ses offres sont retrouvées ; sinon, proposer explicitement de rejoindre le programme. L'adhésion n'est pas une condition pour commander.

Au serveur, l'adhésion exige à la fois une session personnelle vérifiée et une preuve active de contexte QR de table du même restaurant. Ne pas accepter une simple valeur `shopId`, un nom de route ou un drapeau `source` envoyé par le navigateur comme preuve. Réutiliser la session signée de table après vérification de sa nature, de sa validité et de l'état actif de la table/service point. Une session borne ou caisse ne remplit pas cette condition. Si le contexte a expiré, demander un nouveau scan en préservant le panier quand cela est possible.

Après adhésion, proposer « Ajouter à Apple Wallet » sur le téléphone. Le refus, l'absence d'iPhone ou une erreur Wallet ne supprime ni l'adhésion ni les gains. Aucun ajout n'est présenté comme réussi avant l'étape correspondante ; le serveur sait émettre le pass et constater des enregistrements Wallet, pas garantir que l'utilisateur vient d'accepter l'écran d'ajout.

Un adhérent peut consulter sa carte et réajouter son pass depuis son compte sans nouveau QR de table. Seule la création d'une nouvelle adhésion exige le parcours table. Le lien depuis Wallet donne accès au compte après authentification, sans sélectionner une ancienne table. Un non-adhérent arrivant sur cette page sans contexte table voit l'invitation à scanner, pas une inscription libre.

L'adhésion et l'autorisation de recevoir les communications commerciales sont distinctes. Proposition : choix facultatif, décoché par défaut, pour les offres et messages Wallet, modifiable depuis la fidélité sur téléphone. Les mises à jour de solde restent indépendantes de ce choix.

## Identité de la carte et recherche

Ajouter un numéro numérique lisible, stable et unique par restaurant, utilisable à la caisse, sur la borne et affiché sur la carte web/Wallet. Génération aléatoire, contrainte d'unicité SQL et reprise en cas de collision ; longueur, présentation et éventuelle clé de contrôle laissées au constructeur. Conserver le QR opaque et les identifiants existants : aucune réémission de QR ou perte de solde pour les adhérents actuels. Attribuer aussi un numéro aux adhésions existantes par migration contrôlée.

Pour le téléphone, utiliser les identités vérifiées reliées à l'adhérent et la normalisation existante ; tenir compte du pays et ne pas comparer uniquement les derniers chiffres. Ne pas fusionner les anciennes fiches sur leur champ téléphone libre. Un numéro non vérifié ou ambigu ne doit pas sélectionner arbitrairement un compte. La recherche de carte est distincte de l'authentification personnelle.

Les recherches sont exactes et limitées en fréquence, sans annuaire public ou recherche partielle sur borne. Les comptes et adhésions restent isolés par restaurant ; aucun solde commun entre restaurants n'est créé.

## Gains, offres et paiement

Réutiliser les calculs existants : points sur le montant réellement payé après remises, règle d'arrondi et exclusions configurées, prix et éligibilité vérifiés au serveur. Une commande ne consomme au plus qu'une récompense dans cette version, comme actuellement. Un produit offert doit être présent et admissible ; les minimums, expirations et règles de cumul s'appliquent.

La création de commande borne et la réservation fidélité doivent former un traitement cohérent avant le démarrage du paiement. Calculer la remise et le total final avant de créer le paiement terminal ; ne pas créer un paiement sur l'ancien montant puis y attacher une remise après coup. Même comportement pour une commande borne à payer ensuite en caisse. Le panier affiche le total confirmé après récompense. Un changement de prix ou d'éligibilité demande une nouvelle confirmation à l'écran de la récompense et du montant final.

Réserver les points à la confirmation, les débiter au paiement fiable, et créditer les nouveaux gains une seule fois. Deux commandes concurrentes ne peuvent pas dépenser le même solde. Libérer la réservation à l'annulation/expiration selon les règles de paiement existantes ; ne pas libérer un paiement toujours actif. Une modification de commande déjà remisée suit le mécanisme de libération et recalcul existant.

Conserver la règle déjà documentée dans le projet pour les remboursements : points gagnés conservés, points dépensés restitués au prorata, reliquat rendu au remboursement complet. Ce comportement existant n'est pas une nouvelle demande utilisateur et n'est pas modifié ici.

Une erreur de recherche fidélité ou de Wallet ne bloque pas une commande sans récompense. Une erreur de validation d'offre interdit uniquement d'appliquer cette offre ; ne pas débiter de points ou facturer un montant inattendu.

## Espace Fidélité du restaurant

Créer une entrée principale « Fidélité » vers la page existante, visible pour l'administration du restaurant. Conserver les restrictions de navigation du dépôt sur Catégories, Étapes produits et Stock. Le personnel caisse utilise la fidélité depuis la commande sans recevoir les droits de gestion.

Organiser les fonctions existantes et nouvelles en quatre onglets :

- Clients : recherche et pagination serveur, nom, téléphone selon les droits d'administration, numéro de carte, solde total/réservé/disponible et état d'enregistrement Wallet. L'état Wallet indique les appareils connus, sans prétendre confirmer chaque ouverture ou lecture. Détail avec historique et correction motivée existante.
- Programme et offres : activation, points par euro, arrondi, exclusions, offres produit offert/réduction fixe/pourcentage, conditions, date de fin et minimum d'achat.
- Carte Wallet : nom, logo, image de bannière, couleurs, import et aperçu indicatif. Les montants et QR restent de vrais champs de carte, pas du texte dessiné dans l'image.
- Notifications : composition d'un message concernant une offre ou un changement utile du programme, aperçu, choix d'un adhérent ou de tous les adhérents éligibles et confirmation affichant le nombre de destinataires avant envoi. Historique des campagnes avec état en attente/traité/échec, sans prétendre mesurer la lecture.

Il s'agit d'une organisation fonctionnelle proposée ; les détails de disposition restent à concevoir en respectant Vuetify et le design du projet.

## Images de la carte

Réutiliser le composant de recadrage et le transport d'import déjà présents, en ajoutant un export PNG optionnel sans modifier son comportement WebP par défaut ailleurs. Accepter des images PNG/JPEG pour le recadrage navigateur et transmettre une sortie PNG adaptée aux emplacements Apple. Vérifier côté serveur le type réel, les dimensions et la taille maximale ; ne pas accepter un fichier uniquement sur son extension ou son type déclaré.

Stocker les images validées dans un espace du restaurant maîtrisé par le serveur, référencé par une version d'asset ; aucune URL externe fournie par le client n'est téléchargée arbitrairement lors de la signature. Utiliser le système actuel d'assets Apple par restaurant et compléter le pass avec les variantes de bannière `strip*.png` attendues. Les dimensions et limites précises suivent la documentation Apple en vigueur et sont fixées dans le plan d'implémentation, pas inventées dans l'interface.

Enregistrer et publier les images de façon cohérente : ne pas pointer le programme vers un fichier manquant. Mettre en file la mise à jour des passes existants lors d'une nouvelle publication du visuel, avec reprise après erreur. Le numéro de série et le jeton Apple restent stables. L'aperçu web reste indicatif ; l'iPhone et l'Apple Watch peuvent afficher les éléments différemment.

## Notifications Apple Wallet

Les messages reposent sur un champ de pass mis à jour et son `changeMessage`, puis sur le worker/APNs existant. Une notification APNs vide signale une nouvelle version ; elle ne transporte pas le message commercial. L'apparition d'une alerte dépend de Wallet et des réglages du client ; aucune promesse de réception ou de lecture.

Conserver les campagnes, destinataires et statuts de traitement dans un journal dédié, distinct du journal des points. Les destinataires doivent appartenir au restaurant, avoir accepté les messages commerciaux et avoir un pass Apple enregistré. Recontrôler leur éligibilité avant traitement ; ignorer les cartes désenregistrées ou les consentements retirés. Un envoi confirmé crée une campagne idempotente et des tâches différées : un double clic ne crée pas deux campagnes. Ne pas envoyer aux nouveaux inscrits qui n'étaient pas dans la sélection confirmée.

Proposition pour la première version : envoi manuel immédiat, un adhérent ou tous les adhérents éligibles, pas de segmentation avancée ni programmation. Publier un dernier message actif par carte, avec des tâches ordonnées par carte et un identifiant de campagne pour éviter qu'une ancienne reprise remplace un message plus récent. Les limites de fréquence et de longueur sont définies dans le plan et expliquées dans l'interface. Une panne APNs est réessayée sans affecter les ventes.

Les campagnes mettent à jour une offre ou une information utile de la carte. La documentation Apple réserve les messages de changement aux informations méritant une interruption ; ne pas présenter cette fonction comme un canal illimité de publicité push. Les compteurs administrateur reflètent la publication et les réponses fournisseur, pas une livraison assurée ou une lecture.

## Données et compatibilité

Étendre le schéma par de nouvelles migrations : numéro de carte et index, consentement/version/date, référence d'images/version et campagnes/destinataires/tâches. Ne pas ajouter de stockage ou de challenge de code de dépense pour la borne. Conserver les mécanismes d'authentification personnelle existants pour le compte client sur téléphone. Les noms précis des tables, DTO et routes seront fixés dans le plan après validation.

Les réponses caisse et borne sont distinctes des DTO administrateur ; aucun jeton Apple, secret de signature, historique personnel complet ou identité globale n'est exposé sur borne. La recherche et l'association d'une carte ne peuvent ni créer un compte ni ouvrir une session client générale.

Mettre en file la synchronisation lors des changements qui affectent la carte : points, réservation/libération, publication des offres, identité visuelle et message. Réutiliser le compteur monotone global de révision des passes et les baux des workers ; ne pas fabriquer les curseurs avec l'horloge seule. L'envoi des notifications et la génération de pass restent hors transaction de paiement.

## Environnement et validation attendue

Conserver le mapping Nuxt existant : local `localhost:8083` vers `localhost:5005`, préfixe API `/baseurl/api/v1`, environnements réseau/staging/production définis dans `config/config.json`. Les variables privées Apple/SMS restent dans l'environnement du backend, jamais dans Nuxt ou les stores. La configuration locale et les origines client doivent être revérifiées avant modification API. Aucun secret n'est copié dans ce document.

Le mode Wallet désactivé continue à annoncer une indisponibilité explicite. Les essais locaux utilisent les fournisseurs simulés ou les modes de développement existants. Aucun déploiement, envoi réel à des clients, migration sur la base de l'application ou usage de certificats de production n'est inclus dans ce cadrage.

La validation d'implémentation doit couvrir les scénarios déterminants :

- Recherche par téléphone et numéro, normalisation, non-adhérent, compte ambigu, isolement entre restaurants et attribution des numéros aux cartes anciennes.
- Refus d'inscription sans preuve QR de table, depuis caisse/borne ou depuis le lien Wallet ; succès après QR et téléphone vérifié ; préservation table/panier.
- Borne : recherche, cumul et utilisation d'une récompense sans code reçu par téléphone ; confirmation à l'écran obligatoire, droits limités, refus d'inscription, changement de client, réponses tardives et commande possible sans offre.
- Calcul et remise avant création du paiement borne pour terminal et caisse, concurrence des réservations, paiement rejoué, annulation et remboursement.
- Import d'image refusé/valide, cohérence de publication, mise à jour des anciennes cartes sans changement d'identité.
- Campagne confirmée une seule fois, consentement retiré, désenregistrement, reprise après panne et ordre des messages ; aucun faux état « lu ».
- Tests fidélité existants frontend/backend, tests ciblés caisse/borne/table/paiement, lint JS/Vue et build local pour ces changements de parcours. Les tests SQL exigent une base locale jetable explicitement configurée.
- Sur un vrai iPhone avec certificat Apple valide : ajout/réajout, image, QR et numéro, solde après paiement, mise à jour et notification. Ces essais ne peuvent pas être remplacés par une signature de test autosignée.

## Propositions à rendre visibles lors de la validation

L'utilisateur a fixé les canaux d'adhésion, l'usage des points et l'absence de code reçu par téléphone à la caisse et sur la borne. Les choix complémentaires suivants viennent de l'agent et peuvent être corrigés avant le plan :

1. Réutilisation des règles actuelles de paiement, remboursement et d'une seule récompense par commande.
2. Messages commerciaux facultatifs et séparés de l'adhésion ; envoi manuel immédiat à une personne ou à tous les adhérents éligibles, sans planification.
3. Personnalisation par logo, bannière et couleurs dans la structure Apple, avec aperçu indicatif.
4. Numéro lisible ajouté sans remplacer les identifiants ou QR existants ; téléphone vérifié utilisé pour éviter les rapprochements erronés.

## Références

- Projet : `docs/loyalty-setup.md`, `docs/superpowers/plans/2026-10-24-loyalty-wallet.md` et `../express-pos/docs/loyalty-wallet.md`.
- Apple, ajout avec confirmation explicite : https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/DistributingPasses.html
- Apple, mises à jour, APNs et messages de changement : https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html
- Apple, présentation des cartes : https://developer.apple.com/design/human-interface-guidelines/wallet
- Apple, cartes de fidélité et intégration NFC distincte : https://developer.apple.com/wallet/loyalty-passes/

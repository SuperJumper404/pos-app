# Clients, fidélité et Wallet — plan d'implémentation

**Goal:** Étendre les clients existants avec une fidélité isolée par restaurant, des points transactionnels et des cartes Apple/Google synchronisées.
**Architecture:** Réutiliser customers/customer_identities/customer_sessions. Ajouter une identité globale reliée explicitement aux fiches restaurant après vérification, sans fusion de fiches sur un téléphone saisi. Un journal, des réservations et une outbox SQL assurent les soldes et la synchronisation.
**Tech Stack:** Nuxt 2, Vue 2, Vuetify, Express, mysql2/InnoDB, crypto Node.
**Spec:** Cahier des charges joint et décisions de la conversation du 24 octobre 2026.

## Contraintes et décisions

- Remboursement : restituer les points utilisés au prorata du montant remboursé ; conserver tous les points gagnés. Arrondi inférieur sur les remboursements partiels, reliquat rendu au remboursement complet.
- Aucun déploiement, SMS réel, migration exécutée ou accès aux données de production.
- Secrets côté serveur ; mode développement explicite ; aucun faux succès Wallet.
- Préserver les modifications utilisateur déjà présentes ; travail dans les checkouts actuels pour réutiliser ces changements, sans reset, stash ni commit global.
- Programme désactivé par défaut ; montants en centimes ; calculs serveur et instantanés de règles.
- Accès administrateur aux réglages/corrections, personnel caisse autorisé au scan/association ; aucune dépense lors du scan.
- Apple : pass stable signé, enregistrements, APNs. Google : classe stable par restaurant, objet stable par adhésion, JWT RS256.

## Tâches et contrats

1. **Domaine SQL et API** : migration loyalty ; helpers/loyalty.js ; modules/m_loyalty.js ; controllers/c_loyalty.js ; routers/r_loyalty.js. Tests avant implémentation pour calcul, réservation concurrente, idempotence, remboursements et isolation.
   API personnelle `/customer/loyalty` GET/POST, `/customer/loyalty/wallet/:provider` POST. API staff `/loyalty/program` GET/PUT, `/loyalty/members` GET, `/loyalty/lookup` POST `{qr}`, `/loyalty/members/:memberId/adjustments` POST `{points,reason}`, `/loyalty/orders/:orderId/attach` POST `{qr}`, `/loyalty/orders/:orderId/reserve` POST `{rewardId,confirmed:true}`, `/loyalty/orders/:orderId/release` POST. Réponses enveloppe existante `{data}`.
   DTO programme `{enabled,name,pointsPerEuro,rounding,includeTips,excludedProductIds,rewards,logoUrl,backgroundColor,foregroundColor}` ; récompenses `{id,name,type,points,value,productId,minPaidCents,expiresAt,stackable}`. DTO membre `{id,qr,balance,reserved,available,program,rewards,history}`. Hooks `settlePaidOrder({connection,shopId,orderId,paymentKey,paidCents})`, `refundOrder({connection,shopId,orderId,refundedCents,refundKey})` ; connexion transactionnelle obligatoire.
2. **Wallet** : services/loyaltyWallet.js, services/loyaltyWalletWorker.js, routers/r_loyaltyWallet.js, tests et configuration exemple. Contrat indépendant `buildWalletPayload({program,member,shopId,offersUrl})`, `issueWallet({provider,program,member,shopId})`. Lire mêmes tables loyalty_members/loyalty_programs/loyalty_wallet_jobs via schéma coordonné. Aucun secret dans DTO personnel.
3. **Interfaces** : store/loyalty.js, pages/compte/fidelite.vue, pages/fidelite.vue, components/loyalty/* ; intégrer compte, panier QR et caisse. Réutiliser customerApi et composants d'identification. Tests préalables sur contexte/confirmation ; lint ciblé.
4. **Intégration** : SMS configurable désactivé par défaut, identité globale liée après vérification, raccordements aux transactions de paiement Stripe/caisse et remboursement, maintenance de réservations/outbox.
5. **Validation** : tests unitaires/domaine/API et régression existante, lint ciblé, build si possible, revue indépendante et documentation d'exploitation. Distinguer tests exécutés, tests SQL non exécutés et validations requises sur appareils.

## Review Focus

- Les requêtes ne choisissent jamais le restaurant à la place de la session authentifiée.
- Aucun crédit avant paiement validé ; événements rejoués sans nouvel effet.
- Récompenses concurrentes ne peuvent dépasser le solde disponible.
- Une panne Wallet est réessayée hors transaction commande.
- Le contexte table/panier reste intact lors de l'identification ; une offre ouverte depuis Wallet ne reprend aucune ancienne table.

## Progression

- [x] Domaine SQL et API — tests domaine/service/autorisations réussis ; test MySQL `loyalty.integration.test.js` ajouté, non exécuté faute de `DELIVERY_TEST_DATABASE_URL` local explicite.
- [x] Wallet — cinq scripts réussis, signature PKCS#7 locale vérifiée, protocole Apple, synchronisation Google, reprises et curseurs multi-passes.
- [x] Interfaces — neuf tests fidélité, régressions compte/panier et compilation Vue 2 réussis.
- [x] Intégration — paiements Stripe/caisse/TPE/livraison, libération immédiate à annulation, remboursement cumulatif, contrôle d'autorité caisse et protection des commandes réservées contre l'édition.
- [x] Validation et documentation — npm test des deux dépôts, test:loyalty des deux dépôts, lint global et build-local réussis. Lint : 0 erreur, 143 avertissements. Build : avertissements de taille. Test SQL explicitement ignoré faute d'URL locale jetable ; validation téléphones/fournisseurs réelle non réalisée.

## Revue et limites

Les revues indépendantes ont conduit à corriger l'annulation invitée sans adhésion, les identifiants d'origine après archivage, les déclarations de paiement falsifiées depuis un QR, le cumul des remboursements et l'ordre global des étiquettes de mise à jour Wallet.

Voir `docs/loyalty-setup.md` et `../express-pos/docs/loyalty-wallet.md` pour les paramètres, les migrations à appliquer explicitement et les vérifications de mise en service. Aucun déploiement, SMS réel ou migration exécutée. Les modifications utilisateur présentes avant cette tâche ont été conservées.

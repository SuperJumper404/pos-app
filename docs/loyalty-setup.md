# Clients et fidélité SmartEat

## Parcours disponibles

- Compte client : `/compte?shopId=ID` puis « Ma fidélité », ou directement `/compte/fidelite?shopId=ID`.
- Administration : page Clients, lien « Programme de fidélité » vers `/fidelite`. Configuration et corrections réservées à l'administration.
- Caisse : détail d'une commande, section Fidélité. Un lecteur QR USB peut saisir le QR dans le champ prévu. « Retrouver » ne dépense aucun point ; l'utilisation d'une récompense exige une confirmation distincte.
- Panier QR : « Continuer sans compte » ou identification inline, adhésion explicite et sélection confirmée d'une récompense. L'identification ne remplace ni le panier ni la table. Le montant attendu contrôle les prix avant fidélité ; le serveur calcule ensuite la remise réelle avant de créer le paiement.
- Le lien Wallet ouvre uniquement la page fidélité. Il ne transporte aucun secret de session et n'associe aucune ancienne table à une nouvelle commande.

Le programme est désactivé par défaut et n'impose aucune récompense de démonstration. Les points sont calculés sur le montant réellement payé après remises, avec exclusions et arrondi configurables. Les récompenses peuvent offrir un produit présent dans la commande, un montant fixe ou un pourcentage, avec minimum, expiration, texte de conditions et règle de cumul.

## Règle de remboursement validée

Tous les points gagnés restent acquis, même après remboursement. Les points utilisés pour la commande sont restitués au prorata du montant remboursé : arrondi inférieur sur un remboursement partiel, reliquat rendu au remboursement complet. Les événements Stripe cumulatifs permettent de rattraper des notifications partielles manquées. Chaque événement conserve sa trace et ne peut pas créditer deux fois le compte.

Les points sont réservés pendant la finalisation, puis dépensés au paiement fiable ou libérés à l'annulation. Une réservation liée à un paiement en cours n'expire pas automatiquement. Une modification de commande exige d'abord de libérer sa récompense. La libération restaure aussi les montants et la TVA d'une remise déjà appliquée au panier.

Les parcours existants de remboursement Stripe, TPE et livraison manuelle alimentent ce journal. Cette évolution ne crée pas un nouveau workflow de remboursement monétaire pour les espèces hors livraison : ce cas reste géré par les outils de caisse existants et, si nécessaire, par une correction fidélité administrative motivée.

## Comptes et isolation

Les fiches `customers`, identités vérifiées et sessions existantes sont réutilisées. La nouvelle identité globale est reliée aux fiches des restaurants après vérification OTP ; les champs téléphone saisis en caisse ne déclenchent aucune fusion. Le même téléphone vérifié par SMS ou WhatsApp désigne un même moyen de connexion. Une identité déjà rattachée à un autre compte produit un conflit explicite et nécessite une récupération contrôlée ; aucune fusion ou suppression automatique des anciennes identités n'est réalisée.

Les anciennes fiches ne sont pas fusionnées ni réattribuées par la migration. Elles sont reliées lors d'une prochaine authentification vérifiée. Les sessions et données personnelles restent limitées au restaurant demandé : une première identification peut être nécessaire dans un autre restaurant. L'adhésion au programme ne vaut pas consentement marketing.

Chaque adhésion conserve son UUID, ses points et son historique indépendants. Apple et Google pointent sur la même adhésion. Le QR est aléatoire, sans téléphone, et ne donne accès qu'au personnel caisse authentifié du restaurant concerné. Les jetons Apple et les sessions web sont distincts.

## Mise en service locale

1. Dans le backend voisin `express-pos`, préparer une base **de développement** et une sauvegarde. Relire puis appliquer les migrations avec le script local existant `npm run db:migrate:local` :
   - `20261024140000_loyalty.sql` ;
   - `20261024141000_loyalty_wallet.sql` ;
   - `20261024142000_customer_global_sms.sql`.
2. Reporter les variables de `express-pos/.env.loyalty.example` dans l'environnement serveur protégé. Ne jamais placer les clés de signature ou SMS dans `.env` frontend, les stores ou Git.
3. Respecter le mapping existant `config/config.json` : frontend local `localhost:8083`, API locale `localhost:5005`, préfixe API `/baseurl/api/v1`. Ajouter l'origine exacte du frontend à `CUSTOMER_ALLOWED_ORIGINS`. Conserver l'authentification client par cookies et les protections CSRF/CORS existantes.
4. Pour un test SMS **sans envoi**, définir côté serveur `CUSTOMER_SMS_MODE=development`, un `CUSTOMER_SMS_DEV_CODE` de six chiffres et un environnement local/development/test. L'écran affiche ce mode explicitement ; aucun code n'est écrit dans les logs. Ce mode est refusé avec `NODE_ENV=production`.
5. Pour de vrais SMS, fournir le compte Twilio, son secret et un numéro expéditeur autorisé. Les quotas, délais de renvoi et limites d'essais réutilisent le mécanisme OTP existant. Un numéro est normalisé et vérifié au format international avant utilisation comme identité.
6. Pour Wallet, suivre `express-pos/docs/loyalty-wallet.md`. Le mode `disabled` reste utilisable pour tester toute la fidélité sans fournisseur ; les boutons signalent alors l'indisponibilité et n'annoncent jamais une carte créée.
7. Démarrer les services locaux habituels, activer un programme depuis l'administration et vérifier le parcours sur des clients de démonstration uniquement.

L'application serveur lance chaque minute une maintenance sans chevauchement : expiration sûre des réservations, puis synchronisation Wallet hors transaction de paiement. Les tâches sont conservées en SQL et reprises après erreur ; les secrets et réponses fournisseur ne sont jamais enregistrés comme message d'erreur. Surveiller les tâches `pending/processing`, `attempts`, `next_attempt_at` et `last_error` dans `loyalty_wallet_jobs`. Une panne d'API Wallet ne bloque pas la commande.

## Paramètres externes à fournir

- Secret d'authentification client indépendant du JWT staff, origines autorisées et configuration HTTPS/proxy fiable.
- SMS : mode, compte Twilio, secret et expéditeur ; ou code local de développement sans SMS.
- Apple : Pass Type ID, Team ID, certificat de signature PEM, clé privée et éventuelle passphrase, intermédiaire WWDR, images PNG et URL publique HTTPS du service de mise à jour. OpenSSL doit être disponible sur le serveur.
- Google : Issuer ID, compte de service autorisé, clé privée, origines autorisées et logo HTTPS du programme ; accès de publication après la phase Demo Mode.
- URL publique SmartEat pour les offres. Badge officiel Apple à déposer dans `static/wallet/apple-wallet-fr.svg` après acceptation de sa licence ; le téléchargement texte fonctionne en attendant. Le bouton Google officiel est fourni.

## Validation

Commandes reproductibles :

```text
# Frontend
npm run test:loyalty
npm test
npm run lint
npm run build-local

# Backend
npm run test:loyalty
npm test
node test/loyalty.integration.test.js
```

Le test MySQL exige `DELIVERY_TEST_DATABASE_URL` pointant explicitement vers un serveur MySQL local jetable. Il crée une base temporaire, applique les vraies migrations et teste isolation, concurrence, idempotence, remboursements et rollback. Sans cette variable, il annonce **SKIP** et n'utilise jamais les accès de l'application. Les tests unitaires avec dépôt de données simulé ne remplacent pas cette validation SQL.

Restent obligatoires avant production : exécuter ce test MySQL sur une base jetable, tester les migrations sur une copie anonymisée, vérifier les vraies signatures Apple et autorisations Google, puis tester ajout/réajout, mises à jour, suppression du pass et reconnexion sur iPhone/Android. Tester aussi un lecteur QR physique, les échecs et délais des fournisseurs, un remboursement partiel suivi d'un complet et les parcours de session/panier sur navigateur mobile.

Aucun déploiement, migration exécutée, SMS réel ou changement de données de production n'a été effectué pendant cette implémentation.

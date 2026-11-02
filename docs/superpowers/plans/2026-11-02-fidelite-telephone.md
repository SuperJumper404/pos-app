# Fidélité téléphone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rejoindre et retrouver la fidélité par téléphone depuis un QR de table, sans e-mail ni code.

**Architecture:** Ajouter un numéro déclaré à l'adhésion et une session signée propre à la fidélité. Brancher la page et le panier sur cette session et adapter la seule autorité client du checkout QR, sans ouvrir les API privées du compte client.

**Tech Stack:** Nuxt 2 / Vue 2 / Vuex / Vuetify, Express, MySQL 8, jsonwebtoken/cookie existants.

**Spec:** `docs/superpowers/specs/2026-11-02-fidelite-telephone-design.md`

## Global Constraints

- Téléphone uniquement, sans e-mail ni code SMS ; aucun nouveau fournisseur ou paquet.
- Adhésion et ouverture par téléphone exclusivement depuis le QR actif d'une table du même restaurant.
- Numéro déjà inscrit : rouvrir automatiquement la carte existante, sans doublon.
- Caisse/borne : recherche existante, cumul et dépense conservés ; aucune adhésion.
- Consentement marketing facultatif, conservé lors d'une nouvelle ouverture de carte.
- Cookie fidélité limité à la fidélité ; aucune identité téléphone marquée vérifiée artificiellement.
- Configuration du programme staging laissée à l'utilisateur ; production inchangée.

## Review Focus

- Deux demandes simultanées pour `06…` et `+336…` retournent la même carte dans un restaurant.
- Un QR de borne ou d'une autre table/resto ne permet pas l'adhésion.
- Le cookie fidélité ne donne accès ni aux adresses ni aux sessions du compte client général.
- Une reprise de commande après changement de carte ou de coût de récompense doit être refusée sans nouvel encaissement.
- Une ouverture de carte existante ne réactive pas le consentement offres.

### Task 1: Numéro déclaré et session fidélité

**Files:** backend `db/migrations/20261102010000_loyalty_phone_enrollment.sql`, `src/modules/m_loyalty.js`, `src/helpers/loyaltyPhoneSession.js`, `test/loyalty-phone.test.js`, `test/loyalty.integration.test.js`.

**Interfaces:** `enrollPhone({shopId,phone,countryCode,marketingConsent}) -> {member,customerId}` ; session `{subject:'loyalty',shopId,customerId,memberId,expiresAt,csrfToken}`. Les clés de session restent côté serveur/cookie HttpOnly.

- [x] Écrire et observer en échec les tests de numéro, réouverture idempotente, consentement inchangé, cookie inter-restaurants/expiré/forgé et absence d'accès général.
- [x] Ajouter la migration et les méthodes SQL, réutiliser le verrou restaurant et la normalisation existante. Ne pas réutiliser les sessions client générales.
- [x] Passer les tests ciblés puis l'intégration MySQL jetable, dont création concurrente et recherche caisse/borne.
- [x] Commit backend ciblé.

### Task 2: Routes téléphone et commande QR

**Files:** backend `src/controllers/c_loyaltyPhone.js`, `src/routers/r_loyalty.js`, `src/helpers/middleware/loyaltyPhoneCheckout.js`, `src/routers/r_orders.js`, `src/routers/r_stripe.js`, `src/modules/m_checkout.js`, tests dédiés.

**Interfaces:** GET/POST `/customer/loyalty/phone`, PATCH `.../preferences`, POST `.../wallet/:provider` ; résultats `{member,program,session,canEnroll}`. POST téléphone requiert table signée et origine autorisée. Le checkout `loyalty_phone:true` consomme la session fidélité et son CSRF, uniquement sur place via table QR.

- [x] Observer les échecs pour table absente/borne/autre restaurant, quota, CSRF, cookie invalide et usurpation de champs de contexte.
- [x] Implémenter les contrôleurs et adapter l'autorité checkout ; conserver le même moteur de prix et de points. Figer coût/version de récompense et identité dans l'idempotence.
- [x] Vérifier le vrai chemin commande QR, paiement/reprise et les routes existantes sans appel fournisseur réel.
- [x] Commit backend ciblé.

### Task 3: Formulaire téléphone et panier

**Files:** frontend `components/loyalty/LoyaltyPhoneAccess.vue`, `pages/compte/fidelite.vue`, `components/loyalty/LoyaltyCheckout.vue`, `layouts/customer.vue`, `store/loyalty.js`, `store/cart.js`, `pages/cart.vue`, tests fidélité/panier.

**Interfaces:** actions `loadPhoneMember({shopId})`, `enrollPhone({shopId,phone,countryCode,marketingConsent})`, `phoneWallet(provider)`, `setPhoneMarketingConsent(value)`. Le panier fige le sujet de la session en plus de l'identifiant client.

- [x] Observer les tests en échec pour formulaire téléphone sans composant e-mail, session/cartes isolées et reprise de l'identité d'origine.
- [x] Brancher page, panier et Wallet sur la session fidélité ; conserver la connexion des autres pages de compte client.
- [x] Passer les suites ciblées et générales, le lint et le build staging. Contrôler le formulaire mobile et les boutons réels dans le navigateur.
- [x] Commit frontend ciblé.

### Task 4: Validation et staging

- [x] Relire le changement global et vérifier les cinq cas de Review Focus.
- [x] Sauvegarder base/config/sources staging, conserver les certificats hors Git et ne créer aucun programme de démonstration.
- [x] Publier les commits ciblés et déployer Docker backend puis frontend.
- [x] Vérifier migrations, identité des sources/artifacts, disponibilité API, formulaire téléphone sans e-mail, QR mobile et limites iPhone/APNs.
- [x] Mettre à jour le compte rendu et communiquer le parcours de test.

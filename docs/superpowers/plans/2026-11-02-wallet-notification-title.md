# Wallet notification title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Afficher le nom du restaurant dans l'en-tête Apple Wallet et permettre un titre à chaque notification.

**Architecture:** Lire le nom du restaurant dans la requête serveur du pass, puis composer le titre et le corps dans le texte immuable existant de la campagne. Étendre l'éditeur et son aperçu ; garder le moteur d'envoi et les consentements.

**Tech Stack:** Nuxt 2/Vue 2/Vuetify, Express, MySQL, OpenSSL existants ; aucune dépendance ou migration nouvelle.

**Spec:** `docs/superpowers/specs/2026-11-02-wallet-notification-title-design.md`

## Global Constraints

- Nom du restaurant issu du serveur et isolé par restaurant ; nom du programme conservé sur la carte.
- Titre 80 caractères maximum sur une ligne ; titre + saut de ligne + message limités à 200 caractères.
- API sans titre compatible avec les clients et campagnes existants.
- Titre/message figés avec les destinataires ; consentement, délai de cinq minutes et confirmation inchangés.
- Aucun message, visuel, point ou adhérent de test publié ; staging Docker seulement, secrets hors Git.

## Review Focus

- Deux restaurants avec le même nom de programme gardent chacun leur nom dans l'en-tête.
- Réutiliser un requestId avec un titre différent provoque un conflit et ne change pas le brouillon.
- Un titre avec saut de ligne/contrôle ou un texte combiné supérieur à 200 caractères est refusé avant écriture.
- Une modification de titre invalide l'aperçu et une réponse retardée ne restaure pas l'ancien brouillon.
- Le paquet Apple signé conserve le nom du programme sur la carte, avec le restaurant dans organizationName et le titre dans le message soumis au consentement.

### Task 1: En-tête, composition du titre et éditeur

**Files:** backend `src/services/loyaltyWallet.js`, `src/modules/m_loyaltyCampaigns.js`, `src/controllers/c_loyaltyCampaigns.js`, tests wallet/signing/campaigns ; frontend `components/loyalty/LoyaltyCampaigns.vue`, `test/loyalty-admin.test.js`.

**Interfaces:** `buildWalletPayload({shopName,...})` fournit `restaurantName`, lu dans `buildSqlWalletRepository.readMember`. `createDraft({title='',message,...})` stocke `title.trim() + '\n' + message.trim()` ou le message seul. Le contrôleur accepte `title`, le résultat conserve `message` comme texte complet immuable.

- [ ] Tests de nom, validation et reprise de brouillon, aperçu du titre et modification tardive : observer RED, puis GREEN.
- [ ] Implémenter les changements ciblés et vérifier les suites existantes, lint, SQL réel jetable et signature locale.
- [ ] Commit ciblé dans les deux dépôts.

### Task 2: Revue et déploiement

- [ ] Revue fraîche globale, une passe RED/GREEN pour les défauts bloquants, sans seconde revue.
- [ ] Sauvegarder staging, pousser puis déployer Docker backend et frontend.
- [ ] Vérifier versions, migrations inchangées, fichier signé réel, titre dans l'éditeur, aperçu sans envoi, index et scripts publics.
- [ ] Conserver le compte rendu et communiquer le parcours de test et les limites iPhone.

# Wallet notification icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à chaque restaurant de choisir l'icône de ses notifications Apple Wallet.

**Architecture:** Étendre la chaîne d'images PNG et la publication versionnée existantes avec un groupe icon. La signature privilégie déjà les visuels publiés ; conserver ce comportement et son repli.

**Tech Stack:** Nuxt 2/Vue 2/Vuetify, Express/multer, stockage PNG et OpenSSL existants ; aucune dépendance ajoutée.

**Spec:** `docs/superpowers/specs/2026-11-02-wallet-notification-icon-design.md`

## Global Constraints

- Icône carrée 38/76/114 px, groupe complet de trois PNG validés.
- Publication réservée à l'administrateur du restaurant ; isolation et publication atomique conservées.
- Aucun changement automatique des visuels ou consentements, aucun message envoyé pour tester.
- Anciennes cartes sans icône dédiée compatibles ; garder les autres visuels lors d'une publication partielle.
- Staging Docker seulement ; conserver les secrets et certificats hors Git.

## Review Focus

- Un upload d'icône seul préserve le logo et la bannière ; un upload de bannière seul préserve l'icône.
- Les groupes incomplets, tailles erronées et types inconnus sont refusés avant publication.
- L'icône d'un autre restaurant ne peut pas être lue via la prévisualisation.
- L'absence d'icône sur une ancienne version ne crée pas d'erreur globale dans l'éditeur.
- Le paquet Apple signé utilise les variantes personnalisées avant l'icône par défaut, avec un manifeste correct.

### Task 1: Icône dans l'éditeur et les passes

**Files:** frontend `helpers/loyaltyWalletImages.js`, `components/loyalty/LoyaltyCardEditor.vue`, `store/loyalty.js`, `test/loyalty-wallet-images.test.js`, `test/loyalty-admin.test.js`; backend `src/services/loyaltyWalletAssets.js`, `src/controllers/c_loyaltyAssets.js`, tests assets/signing.

**Interfaces:** `buildWalletImageVariants(blob,{kind:'icon'})` donne icon/icon2x/icon3x. Le multipart accepte neuf fichiers au maximum et le lecteur preview accepte icon.png/@2x/@3x. Le service conserve le groupe dans le dossier versionné ; la réponse peut contenir `iconPreviewUrl`.

- [x] Écrire les tests de variantes carrées, publication partielle/invalides et aperçu/auth HTTP ; observer RED.
- [x] Étendre la chaîne d'images et l'éditeur avec le groupe icon ; clarifier le champ Google.
- [x] Vérifier GREEN, suites fidélité, lint et génération staging ; confirmer les icônes personnalisées dans un paquet signé.
- [x] Commit ciblé dans les deux dépôts.

### Task 2: Revue et staging

- [x] Revue globale fraîche après les tests ; traiter les défauts bloquants une seule fois en RED/GREEN.
- [x] Sauvegarder la base/configuration/sources staging avant déploiement ; ne publier aucun visuel pour le client.
- [x] Publier et déployer Docker ; vérifier les versions, HTTP 200 et empreintes des fichiers servis.
- [x] Contrôler le nouveau champ dans l'interface et conserver un compte rendu ; expliquer la publication de l'icône puis la vérification iPhone.

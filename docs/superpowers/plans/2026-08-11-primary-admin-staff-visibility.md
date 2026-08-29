# Admin principal dans Staff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher et proteger l'administrateur principal dans la liste Staff.

**Architecture:** Le store Staff conservera le compte marque `is_primary_admin` et le placera avant les autres comptes. La page Staff utilisera ce marqueur pour limiter les actions et les champs modifiables, sans changer les routes API.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Vuetify, Node assertions.

## Global Constraints

- Reutiliser `is_primary_admin` deja fourni par l'API utilisateurs.
- Aucun changement de route, migration ou dependance.
- L'admin principal peut modifier son nom uniquement depuis Staff.

---

### Task 1: Conserver et ordonner l'admin principal

**Files:**
- Modify: `store/staff.js:24-31`
- Test: `test/staff-page.test.js`

**Interfaces:**
- Consumes: objets utilisateur avec `access` et `is_primary_admin`.
- Produces: `staff/data` contenant l'admin principal en premiere position.

- [ ] **Step 1: Ecrire le test en echec**

Ajouter une assertion que le filtre de Staff ne supprime plus `is_primary_admin: 1` et que cet utilisateur est trie avant un caissier.

- [ ] **Step 2: Executer le test rouge**

Run: `node test/staff-page.test.js`
Expected: echec car le store exclut encore l'admin principal.

- [ ] **Step 3: Implementer le filtre et le tri minimal**

Conserver `isStaffAccess(user.access)` puis trier avec `Number(user.is_primary_admin) === 1` avant les autres utilisateurs.

- [ ] **Step 4: Executer le test vert**

Run: `node test/staff-page.test.js`
Expected: passage avec l'admin principal dans la collection Staff.

### Task 2: Restreindre les actions de l'admin principal

**Files:**
- Modify: `pages/staff/index.vue:31-69, 182-214`
- Test: `test/staff-page.test.js`

**Interfaces:**
- Consumes: `item.is_primary_admin` depuis `staff/data`.
- Produces: interface Staff ou le compte admin ne propose ni suppression ni PIN et limite son formulaire au nom.

- [ ] **Step 1: Ecrire le test en echec**

Ajouter des assertions textuelles pour `isPrimaryAdmin`, l'absence conditionnelle des boutons PIN/suppression et les controles des champs du formulaire.

- [ ] **Step 2: Executer le test rouge**

Run: `node test/staff-page.test.js`
Expected: echec car la page expose encore toutes les actions pour tous les comptes.

- [ ] **Step 3: Implementer les protections de page**

Ajouter `isPrimaryAdmin(user)` et `isEditingPrimaryAdmin`; masquer PIN/suppression pour ce compte, rendre les controles role/modules/statut non editables et envoyer seulement `username` lors de sa sauvegarde.

- [ ] **Step 4: Executer la verification frontend**

Run: `node test/staff-page.test.js && npm.cmd run lint`
Expected: les tests passent et le lint ne remonte aucune erreur.

### Task 3: Verification finale

**Files:**
- Modify: `store/staff.js`, `pages/staff/index.vue`, `test/staff-page.test.js`

- [ ] **Step 1: Executer la suite frontend**

Run: `npm.cmd test`
Expected: tous les tests frontend passent.

- [ ] **Step 2: Verifier le diff**

Run: `git diff --check`
Expected: aucune erreur de format dans les fichiers modifies.

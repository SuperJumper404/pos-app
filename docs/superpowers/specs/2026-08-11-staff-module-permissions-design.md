# Staff Module Permissions Design

## Goal

Replace fixed role-only navigation with per-user module permissions for
application-created staff accounts. The primary shop administrator remains the
only email-and-password account and keeps unrestricted access.

## Account Model

- The primary administrator continues to sign in with email and password.
- Every user created from Staff / Equipe signs in with a generated six-character
  cashier ID and a generated four-digit PIN.
- The Staff creation form contains only name, role, active status, and module
  permission checkboxes. It does not request email, password, or phone number.
- The cashier ID is generated server-side, unique, and read-only in the UI.
- The generated PIN is hashed server-side. It is returned once after creation
  and once after a reset; it is never returned by later reads.
- The credential confirmation dialog shows the cashier ID and PIN. An eye icon
  toggles the PIN visibility.
- Resetting credentials generates a new random PIN. The cashier ID remains
  unchanged and read-only.

## Roles And Permissions

Roles are presets only. Changing a role replaces the checkbox selection with
that role's defaults; the administrator can then adjust individual modules
before saving.

Operational module keys are:

- `home`: Accueil
- `orders`: Prise et suivi des commandes, y compris les menus necessaires a la prise de commande
- `cashregister`: Tiroir-caisse
- `history`: Historique
- `catalog`: Gestion des produits, categories et configurations produit
- `stocks`: Stock
- `tables`: Tables
- `reports`: Rapports
- `website`: Site web

Role defaults are:

| Role | Default modules |
| --- | --- |
| Caissier | Commandes, Tiroir-caisse, Historique |
| Serveur | Commandes |
| Cuisine | Commandes |
| Admin cree | All operational modules |

`staff` (Staff / Equipe) and `settings` (Reglages) are not assignable. They
remain exclusive to the primary administrator.

## Data And Login Flow

- A nullable JSON permission field is stored on `users` for staff accounts.
- Existing staff without explicit permissions retain the existing role defaults
  so the migration does not make their navigation disappear.
- Staff list/detail/session responses expose the permission list, never the PIN
  hash or clear PIN.
- Login persists the returned permission list in the frontend user session.
- The existing role access number remains the role preset and attribution value.

## Navigation Behavior

- The navigation helper checks explicit permissions when present; otherwise it
  uses the current role defaults. `orders` controls the command entry and order
  tracking pages, while `catalog` controls product-management navigation.
- The sidebar and relevant app-bar actions are hidden when the matching module
  is absent.
- No backend route guard is added for modules, per the agreed scope.
- The primary administrator bypasses the permission list and sees all modules.

## UI Behavior

- Staff creation and edit dialogs display a role select followed by a compact
  checkbox group for operational modules.
- A role change visibly applies its preset, after which each checkbox remains
  independently editable.
- The staff table continues to show the cashier ID but never a PIN.
- Credential reset presents only the generated PIN and the unchanged cashier ID,
  with an eye icon for PIN visibility.

## Validation And Tests

- Backend tests cover generated PINs, stored permission lists, permission-safe
  responses, and PIN reset behavior.
- Frontend tests cover role presets, checkbox payloads, one-time credential
  display, and permission-aware navigation.
- Existing login, Staff, and navigation tests continue to run.

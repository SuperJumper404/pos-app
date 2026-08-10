# Staff / Equipe Roles Design

## Goal

Add a `Staff / Equipe` admin area for managing the real users of a restaurant, show each user only the menu modules assigned to their role, and keep the staff responsible for taking and preparing each order.

This first version is a simple, interface-level RBAC: the application hides unauthorized navigation entries. It does not add backend route authorization.

## Scope

- Add a `Staff / Equipe` navigation entry, visible to administrators only.
- Show the staff accounts belonging to the current shop.
- Let an administrator create, edit, deactivate, and remove a staff account.
- Put the role in a single `Acces` dropdown in the account form.
- Apply the selected role to the application navigation.
- Keep the existing `access` field as the source of truth for the role.
- Attribute each staff-created counter order to the connected Caissier, Serveur, or Admin.
- Attribute preparation to the connected kitchen-side user who moves an order from `En attente` to `En preparation`.
- Display both attributions in the command detail and history.

## Roles

The existing values remain stable so client flows are not disrupted.

| Access value | Role | Staff / Equipe | Visible modules |
| --- | --- | --- | --- |
| `0` | Admin | Yes | All admin modules, including `Staff / Equipe` and `Tables` |
| `1` | Caissier | Yes | Menus, Commandes, Tiroir-caisse, Historique |
| `2` | Table QR | No | Menus, Panier, suivi de commande |
| `3` | Click-and-Collect | No | Menus, Panier, suivi de commande |
| `4` | Serveur | Yes | Menus, Commandes de tout le restaurant, Panier |
| `5` | Cuisine | Yes | Commandes et changement des statuts de preparation |

An administrator can create another administrator. The `Staff / Equipe` list only contains access values `0`, `1`, `4`, and `5`.

## Separation From Tables

`Staff / Equipe` and `Tables` describe two different business concepts:

- `Staff / Equipe` lists application users who work for the shop.
- `Tables` lists only the existing Table QR accounts (`access = 2`).
- Click-and-Collect accounts (`access = 3`) remain outside the staff list and outside the tables list.

For this migration, this separation is implemented through filters on the existing user records. No new SQL table is introduced yet. A later dedicated migration can replace the legacy "table as user" representation without changing the staff roles.

## User Experience

The administrator opens `Staff / Equipe` from the side navigation. The page presents the current staff, their role, and their account status, with actions to manage each person.

`Ajouter un utilisateur` opens the existing-style form with the user identity fields and an `Acces` dropdown. The dropdown choices are Admin, Caissier, Serveur, and Cuisine. The selected role is saved on the existing user record for the current shop.

At the next login, the user sees the appropriate modules. For an already connected user whose role is changed, the updated navigation takes effect after reconnecting.

## Order Attribution

Two distinct attributions are needed because an order can be taken by one person and prepared by another. Each attribution keeps both a user id and a display-name snapshot, so the history remains readable after a staff account is deleted:

- `taken_by_user_id` and `taken_by_name`: set automatically to the authenticated staff user when a staff member creates a counter order. They identify who took the order at the counter or in the dining room.
- `prepared_by_user_id` and `prepared_by_name`: set automatically to the authenticated staff user when the order first moves from `En attente` to `En preparation`.

Client-originated QR Table and Click-and-Collect orders have no staff member at creation, so `taken_by_user_id` remains empty unless a later staff workflow explicitly assigns it. An order prepared by staff receives `prepared_by_user_id` regardless of its origin.

The command detail, the active `Commandes` list, and the `Historique` list display `Prise par` and `Preparee par` with the staff member name when available, otherwise `Non attribuee`.

The legacy `orders.operator` field is currently overwritten during status changes. It remains untouched for compatibility, but it is not used as the source of truth for either attribution.

## Architecture

- Centralize the role labels and visible navigation modules in one frontend helper so the layout and the new staff form use the same values.
- Extend the dashboard navigation filtering to use the connected user `access` value, rather than the current admin/non-admin split alone.
- Add a Vuex staff-facing data flow that reuses the current user endpoints while filtering records by the role groups above.
- Keep Table QR handling in the existing tables area, filtered to `access = 2`.
- Add a focused SQL migration for nullable `taken_by_user_id`, `prepared_by_user_id`, `taken_by_name`, and `prepared_by_name` fields on both `orders` and `archives`, with indexes on the active-order user ids for later reporting. Historical orders remain valid with empty values.
- Pass the authenticated user id into the internal counter checkout and order-status transition flows so the backend, not the browser, records each attribution.
- Copy the attribution fields when an active order is archived so order history keeps the same names after the active record is removed.
- Keep backend authentication and existing user APIs unchanged except for accepting and returning the two new access values, which the current integer field supports.

## Boundaries

- No backend protection is added to prevent a user from manually entering a hidden URL in this version.
- No custom per-user permission matrix is added: one selected role determines the visible modules.
- No attendance, clock-in/out, schedules, breaks, payroll, or employee activity audit is included. These belong to a future personnel-management feature.
- No broad refactor of the user/table data model is included beyond the filters needed for the two screens.
- A later reporting feature may aggregate orders by staff member; this version records and displays the raw attribution only.

## Error Handling

- The form validates the required identity fields and requires a staff role before submission.
- API errors reuse the project's existing notification and error patterns.
- Failed create, update, deactivate, or delete operations leave the staff list unchanged and show an error.
- The current shop boundary is preserved by using the authenticated shop context already enforced by the user endpoints.
- If the person who took or prepared an order is later deactivated or removed, the saved attribution remains readable from the order history.

## Validation

- Check the central role-to-navigation mapping for every access value above.
- Verify an admin can create each staff role, including another admin.
- Verify staff accounts appear only in `Staff / Equipe`, Table QR accounts appear only in `Tables`, and Click-and-Collect accounts appear in neither.
- Verify navigation for Admin, Caissier, Serveur, and Cuisine matches the roles table after a fresh login.
- Verify a counter order records the connected staff member as `Prise par`.
- Verify the first transition from `En attente` to `En preparation` records the connected staff member as `Preparee par` and does not overwrite `Prise par`.
- Verify QR Table and Click-and-Collect orders can remain without `Prise par` while still receiving `Preparee par` when handled by staff.
- Run the frontend lint command and perform a focused manual check of the new page and menu visibility.

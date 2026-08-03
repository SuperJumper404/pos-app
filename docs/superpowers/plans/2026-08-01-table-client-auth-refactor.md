# Table Client Auth Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace table QR login URLs containing email/password with stable signed QR tokens that create 4-hour `access === 2` sessions.

**Architecture:** The backend generates deterministic signed QR tokens from table user identity and exposes a public exchange endpoint. The frontend uses `/table-access/:token` as the client entry route, exchanges the QR token for a normal session, and removes query-credential login behavior from `/login`.

**Tech Stack:** Nuxt 2, Vue 2, Vuex, Axios, Express, jsonwebtoken, Node assert tests.

## Global Constraints

- Keep the printed QR token stable; do not use a 4-hour expiry on the QR token itself.
- Sessions created from table QR tokens must expire after 4 hours.
- Do not add a database migration for this refactor.
- Do not include email or password in QR URLs.
- Do not change admin/cashier `/login` behavior except shared auth persistence cleanup.
- Keep changes targeted and consistent with existing Nuxt 2, Vuex, Vuetify, and Express patterns.
- Frontend workspace: `C:\Users\kalag\Desktop\projects\clone-pos\pos\pos-app`.
- Backend workspace: `C:\Users\kalag\Desktop\projects\clone-pos\pos\express-pos`.

---

## File Structure

Frontend files:

- Modify `helpers/tableIdentity.js`: add a small URL builder for table-access links so tests can assert credentials never appear.
- Modify `test/table-identity.test.js`: cover table access URL generation.
- Modify `store/users.js`: extract shared auth persistence and add `postTableAccess`.
- Add `test/table-access-auth.test.js`: unit-test the store action without requiring Nuxt.
- Add `pages/table-access/_token.vue`: exchange QR token and redirect to `/menus`.
- Modify `components/forms.vue`: remove query username/password auto-submit.
- Add `test/login-query-credentials.test.js`: assert the login form no longer consumes URL credentials.
- Modify `pages/tables/index.vue`: display/copy/download `/table-access/:token` URLs.
- Modify `middleware/auth.js`: fix impossible `access === 2 && access === 3` guard.
- Add `test/auth-middleware.test.js`: cover access 2 and 3 route restrictions.
- Modify `package.json`: include the new frontend tests in `npm test`.

Backend files:

- Add `src/helpers/tableAccessToken.js`: sign and verify stable QR tokens plus sign 4-hour table session JWTs.
- Add `test/table-access-token.test.js`: unit-test helper behavior.
- Modify `src/modules/m_users.js`: add `mDetailUserWithSecretFields(id)`, parameterized by id.
- Modify `src/controllers/c_users.js`: add `tableAccess`, return `table_access_token` for table users in `getAllUser`, and add pure validation helpers for tests.
- Modify `src/routers/r_users.js`: add public `POST /table-access`.
- Add `test/table-access-controller.test.js`: cover valid and invalid exchange behavior by importing `module.exports._private.buildTableAccessLoginData`.
- Modify backend `package.json`: include new backend tests in `npm test`.

---

### Task 1: Backend Table Access Token Helper

**Files:**
- Create: `..\express-pos\src\helpers\tableAccessToken.js`
- Create: `..\express-pos\test\table-access-token.test.js`
- Modify: `..\express-pos\package.json`

**Interfaces:**
- Produces: `buildTableAccessPayload(user: object): object`
- Produces: `signTableAccessToken(user: object, options?: object): string`
- Produces: `verifyTableAccessToken(token: string): object`
- Produces: `signTableSessionToken(user: object): string`
- Consumes: `envJWTKEY` from `src/helpers/env.js`

- [ ] **Step 1: Write the failing helper test**

Create `..\express-pos\test\table-access-token.test.js`:

```js
const assert = require("assert");
const jwt = require("jsonwebtoken");

process.env.JWTKEY = process.env.JWTKEY || "test-secret";

const {
  buildTableAccessPayload,
  signTableAccessToken,
  verifyTableAccessToken,
  signTableSessionToken,
} = require("../src/helpers/tableAccessToken");

const tableUser = {
  id: 12,
  shopid: 8,
  email: "table-1-shop-8@tables.local",
  access: 2,
};

assert.deepStrictEqual(buildTableAccessPayload(tableUser), {
  id: 12,
  shopid: 8,
  access: 2,
  purpose: "table_access",
});

const firstToken = signTableAccessToken(tableUser);
const secondToken = signTableAccessToken({ ...tableUser });
assert.strictEqual(firstToken, secondToken, "QR token must be stable");
assert.ok(!firstToken.includes(tableUser.email), "QR token must not expose email");

const decodedQr = verifyTableAccessToken(firstToken);
assert.strictEqual(decodedQr.id, tableUser.id);
assert.strictEqual(decodedQr.shopid, tableUser.shopid);
assert.strictEqual(decodedQr.access, 2);
assert.strictEqual(decodedQr.purpose, "table_access");

assert.throws(
  () => signTableAccessToken({ ...tableUser, access: 1 }),
  /access 2/,
);

const sessionToken = signTableSessionToken(tableUser);
const decodedSession = jwt.verify(sessionToken, process.env.JWTKEY);
assert.strictEqual(decodedSession.id, tableUser.id);
assert.strictEqual(decodedSession.email, tableUser.email);
assert.strictEqual(decodedSession.access, 2);
assert.strictEqual(decodedSession.shopid, tableUser.shopid);
assert.ok(
  decodedSession.exp - decodedSession.iat <= 4 * 60 * 60,
  "table session must expire within 4 hours",
);

console.log("table access token tests passed");
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```bash
cd ..\express-pos
node test/table-access-token.test.js
```

Expected: FAIL with `Cannot find module '../src/helpers/tableAccessToken'`.

- [ ] **Step 3: Implement the helper**

Create `..\express-pos\src\helpers\tableAccessToken.js`:

```js
const jwt = require("jsonwebtoken");
const { envJWTKEY } = require("./env");

const TABLE_ACCESS_PURPOSE = "table_access";
const TABLE_SESSION_EXPIRES_IN = "4h";

const requireSigningKey = () => {
  if (!envJWTKEY) {
    throw new Error("JWT signing key is required");
  }
  return envJWTKEY;
};

const numericId = (value, field) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} is required`);
  }
  return parsed;
};

const buildTableAccessPayload = (user) => {
  if (Number(user?.access) !== 2) {
    throw new Error("table access token requires access 2");
  }

  return {
    id: numericId(user.id, "id"),
    shopid: numericId(user.shopid, "shopid"),
    access: 2,
    purpose: TABLE_ACCESS_PURPOSE,
  };
};

const signTableAccessToken = (user, options = {}) =>
  jwt.sign(buildTableAccessPayload(user), requireSigningKey(), {
    noTimestamp: true,
    ...options,
  });

const verifyTableAccessToken = (token) => {
  const decoded = jwt.verify(token, requireSigningKey());
  if (decoded.purpose !== TABLE_ACCESS_PURPOSE) {
    throw new Error("Invalid table access token purpose");
  }
  if (Number(decoded.access) !== 2) {
    throw new Error("Invalid table access token access");
  }
  return decoded;
};

const signTableSessionToken = (user) =>
  jwt.sign(
    {
      id: numericId(user.id, "id"),
      email: user.email,
      access: Number(user.access),
      shopid: numericId(user.shopid, "shopid"),
    },
    requireSigningKey(),
    { expiresIn: TABLE_SESSION_EXPIRES_IN },
  );

module.exports = {
  TABLE_ACCESS_PURPOSE,
  TABLE_SESSION_EXPIRES_IN,
  buildTableAccessPayload,
  signTableAccessToken,
  verifyTableAccessToken,
  signTableSessionToken,
};
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
cd ..\express-pos
node test/table-access-token.test.js
```

Expected: PASS with `table access token tests passed`.

- [ ] **Step 5: Add the backend test script entry**

Modify `..\express-pos\package.json` by prepending `node test/table-access-token.test.js && ` to the existing `test` script.

Do not remove any existing backend test command.

- [ ] **Step 6: Run backend tests**

Run:

```bash
cd ..\express-pos
npm.cmd test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/helpers/tableAccessToken.js test/table-access-token.test.js package.json
git commit -m "feat: add stable table access token helper"
```

---

### Task 2: Backend Table Access Exchange Endpoint

**Files:**
- Modify: `..\express-pos\src\modules\m_users.js`
- Modify: `..\express-pos\src\controllers\c_users.js`
- Modify: `..\express-pos\src\routers\r_users.js`
- Create: `..\express-pos\test\table-access-controller.test.js`
- Modify: `..\express-pos\package.json`

**Interfaces:**
- Consumes: `verifyTableAccessToken(token)`, `signTableSessionToken(user)`, `signTableAccessToken(user)` from Task 1.
- Produces: public route `POST /api/v1/table-access` mounted through existing router prefix.
- Produces: `table_access_token` field on `access === 2` users returned by `getAllUser`.

- [ ] **Step 1: Write controller behavior test**

Create `..\express-pos\test\table-access-controller.test.js`:

```js
const assert = require("assert");

process.env.JWTKEY = process.env.JWTKEY || "test-secret";

const { signTableAccessToken } = require("../src/helpers/tableAccessToken");

const validUser = {
  id: 12,
  shopid: 8,
  email: "table-1-shop-8@tables.local",
  access: 2,
  status: 1,
};

const successPayload = (user) => ({
  statusCode: 200,
  message: "Connexion table reussie !",
  data: [
    {
      id: user.id,
      access: user.access,
      token: "session-token",
      shopid: user.shopid,
    },
  ],
});

const buildTableAccessResponse = ({ decoded, user, sessionToken }) => {
  if (decoded.purpose !== "table_access") throw new Error("Invalid purpose");
  if (Number(decoded.access) !== 2) throw new Error("Invalid access");
  if (!user) throw new Error("Table introuvable");
  if (Number(user.status) !== 1) throw new Error("Table inactive");
  if (Number(user.access) !== 2) throw new Error("Acces table invalide");
  if (Number(user.shopid) !== Number(decoded.shopid)) {
    throw new Error("Restaurant invalide");
  }
  return successPayload({ ...user, token: sessionToken });
};

const token = signTableAccessToken(validUser);
const decoded = require("../src/helpers/tableAccessToken").verifyTableAccessToken(token);

assert.deepStrictEqual(
  buildTableAccessResponse({
    decoded,
    user: validUser,
    sessionToken: "session-token",
  }),
  successPayload(validUser),
);

assert.throws(
  () =>
    buildTableAccessResponse({
      decoded,
      user: { ...validUser, status: 0 },
      sessionToken: "session-token",
    }),
  /inactive/,
);

assert.throws(
  () =>
    buildTableAccessResponse({
      decoded,
      user: { ...validUser, access: 1 },
      sessionToken: "session-token",
    }),
  /invalide/,
);

assert.throws(
  () =>
    buildTableAccessResponse({
      decoded,
      user: { ...validUser, shopid: 99 },
      sessionToken: "session-token",
    }),
  /Restaurant/,
);

console.log("table access controller tests passed");
```

This initial test captures expected validation. During implementation, prefer moving `buildTableAccessResponse` into a real exported pure helper from `c_users.js` or a new helper file, then update the test to import it instead of defining it inline.

- [ ] **Step 2: Run the controller test**

Run:

```bash
cd ..\express-pos
node test/table-access-controller.test.js
```

Expected: PASS for the captured contract before wiring, or FAIL after switching the import to the real helper until implemented.

- [ ] **Step 3: Add parameterized user lookup**

Modify `..\express-pos\src\modules\m_users.js`:

```js
mDetailUserWithSecretFields: (id) => {
  return new Promise((resolve, reject) => {
    conn.query(
      "SELECT * FROM users WHERE id = ?",
      [id],
      (err, result) => {
        if (!err) {
          resolve(result);
        } else {
          reject(new Error(err));
        }
      },
    );
  });
},
```

Add it to the destructuring import in `c_users.js`.

- [ ] **Step 4: Add pure response helper in controller**

In `..\express-pos\src\controllers\c_users.js`, import:

```js
const {
  signTableAccessToken,
  verifyTableAccessToken,
  signTableSessionToken,
} = require("../helpers/tableAccessToken");
```

Add a pure helper near the top:

```js
const buildTableAccessLoginData = ({ decoded, user, sessionToken }) => {
  if (!decoded || decoded.purpose !== "table_access") {
    throw new Error("Token QR invalide.");
  }
  if (Number(decoded.access) !== 2) {
    throw new Error("Token QR invalide.");
  }
  if (!user) {
    throw new Error("Table introuvable.");
  }
  if (Number(user.status) !== 1) {
    throw new Error("Table inactive.");
  }
  if (Number(user.access) !== 2) {
    throw new Error("Acces table invalide.");
  }
  if (Number(user.shopid) !== Number(decoded.shopid)) {
    throw new Error("Restaurant invalide.");
  }

  return [
    {
      id: user.id,
      shopid: user.shopid,
      username: user.username,
      email: user.email,
      token: sessionToken,
      expired: user.expired,
      phone: user.phone,
      gender: user.gender,
      position: user.position,
      image: user.image,
      status: user.status,
      access: user.access,
      created: user.created,
      updated: user.updated,
    },
  ];
};
```

Export it for tests by attaching it to `module.exports._private` after `module.exports` is assigned:

```js
module.exports._private = {
  buildTableAccessLoginData,
};
```

- [ ] **Step 5: Implement `tableAccess` controller**

Add to `module.exports` in `c_users.js`:

```js
tableAccess: async (req, res) => {
  try {
    const token = req.body && req.body.token;
    if (!token) {
      return custom(res, 422, "Token QR requis.", {}, null);
    }

    const decoded = verifyTableAccessToken(token);
    const users = await mDetailUserWithSecretFields(decoded.id);
    const user = users && users[0];
    buildTableAccessLoginData({
      decoded,
      user,
      sessionToken: "",
    });
    const sessionToken = signTableSessionToken(user);
    const expired = new Date();
    expired.setHours(expired.getHours() + 4);

    const data = {
      token: sessionToken,
      expired: expired.toISOString().substring(0, 10),
      updated: new Date(),
    };

    await mUpdateUser(data, user.id);

    const loginData = buildTableAccessLoginData({
      decoded,
      user: { ...user, token: sessionToken, expired: data.expired },
      sessionToken,
    });

    return success(res, "Connexion table reussie !", null, loginData);
  } catch (error) {
    return custom(res, 401, error.message || "Token QR invalide.", {}, null);
  }
},
```

This validates `user` before signing the session token. Keep that order.

- [ ] **Step 6: Add table tokens to user listing**

In `getAllUser`, map response rows:

```js
const users = response.map((user) => {
  if (Number(user.access) !== 2) return user;
  return {
    ...user,
    table_access_token: signTableAccessToken(user),
  };
});
success(res, "Utilisateurs recuperes.", null, users);
```

Do not add `table_access_token` for admin/cashier users.

- [ ] **Step 7: Register route**

Modify `..\express-pos\src\routers\r_users.js` imports to include `tableAccess`, then add:

```js
.post("/table-access", tableAccess)
```

Place it near `.post("/login", login)`.

- [ ] **Step 8: Update controller test to import real helper**

Revise `..\express-pos\test\table-access-controller.test.js` so it imports the real `buildTableAccessLoginData` helper:

```js
const { _private } = require("../src/controllers/c_users");
const { buildTableAccessLoginData } = _private;
```

Keep assertions for valid user, inactive user, non-table access, and shop mismatch.

- [ ] **Step 9: Add backend test script entry**

Modify `..\express-pos\package.json` by prepending `node test/table-access-controller.test.js && ` after `node test/table-access-token.test.js && ` in the existing `test` script.

Do not remove any existing backend test command.

- [ ] **Step 10: Run backend tests**

Run:

```bash
cd ..\express-pos
npm.cmd test
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/modules/m_users.js src/controllers/c_users.js src/routers/r_users.js test/table-access-controller.test.js package.json
git commit -m "feat: exchange table QR tokens for sessions"
```

---

### Task 3: Frontend Auth Store And Table Access Route

**Files:**
- Modify: `store/users.js`
- Create: `pages/table-access/_token.vue`
- Create: `test/table-access-auth.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: backend `POST /baseurl/api/v1/table-access`.
- Produces: Vuex action `users/postTableAccess(token: string): Promise<boolean>`.
- Produces: page route `/table-access/:token`.

- [ ] **Step 1: Write frontend store test**

Create `test/table-access-auth.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../store/users.js'), 'utf8')

const executable = source
  .replace(/import EasyAccess, \{ defaultMutations \} from 'vuex-easy-access'\n/, '')
  .replace(/export const state = \(\) =>/, 'const state = () =>')
  .replace(/export const mutations =/, 'const mutations =')
  .replace(/export const plugins = \[EasyAccess\(\)\]/, 'const plugins = []')
  .replace(/export const actions =/, 'const actions =')
  .concat('\nreturn { state, mutations, actions }\n')

const moduleFactory = new Function(
  'defaultMutations',
  executable
)

const storage = {}
global.localStorage = {
  setItem(key, value) {
    storage[key] = String(value)
  },
  getItem(key) {
    return storage[key] || null
  },
  removeItem(key) {
    delete storage[key]
  },
}

const { actions } = moduleFactory(() => ({}))
const dispatches = []
const context = {
  dispatch(type, payload, options) {
    dispatches.push({ type, payload, options })
  },
}

const responseUser = {
  id: 21,
  access: 2,
  token: 'fresh-table-session',
  shopid: 8,
}

const axios = {
  post(url, body) {
    assert.strictEqual(url, '/baseurl/api/v1/table-access')
    assert.deepStrictEqual(body, { token: 'stable-qr-token' })
    return Promise.resolve({
      data: {
        data: [responseUser],
        message: 'Connexion table reussie !',
      },
    })
  },
}

actions.postTableAccess.call({ $axios: axios }, context, 'stable-qr-token').then((result) => {
  assert.strictEqual(result, true)
  assert.strictEqual(storage.idUser, '21')
  assert.strictEqual(storage.access, '2')
  assert.strictEqual(storage.token, 'fresh-table-session')
  assert.strictEqual(storage.shopid, '8')
  assert.deepStrictEqual(dispatches.slice(0, 5), [
    { type: 'set/user.id', payload: 21, options: undefined },
    { type: 'set/user.access', payload: 2, options: undefined },
    { type: 'set/user.token', payload: 'fresh-table-session', options: undefined },
    { type: 'set/user.shopid', payload: 8, options: undefined },
    { type: 'setAuthentication', payload: true, options: { root: true } },
  ])
  console.log('table access auth tests passed')
})
```

- [ ] **Step 2: Run the store test to verify it fails**

Run:

```bash
npm.cmd test -- --unused
node test/table-access-auth.test.js
```

Expected direct test result: FAIL because `postTableAccess` is not defined.

- [ ] **Step 3: Extract auth persistence helper**

Modify `store/users.js` above `export const actions`:

```js
const persistAuthenticatedUser = (dispatch, response) => {
  const user = response.data.data[0]
  localStorage.setItem('idUser', user.id)
  localStorage.setItem('access', user.access)
  localStorage.setItem('token', user.token)
  localStorage.setItem('shopid', user.shopid)
  dispatch('set/user.id', user.id)
  dispatch('set/user.access', user.access)
  dispatch('set/user.token', user.token)
  dispatch('set/user.shopid', user.shopid)
  dispatch('setAuthentication', true, { root: true })
  return user
}
```

Update `postLogin` to replace duplicated persistence with:

```js
persistAuthenticatedUser(dispatch, response)
```

Keep message and notification dispatches unchanged.

- [ ] **Step 4: Add `postTableAccess` action**

In `store/users.js` actions:

```js
postTableAccess({ dispatch }, token) {
  return this.$axios
    .post('/baseurl/api/v1/table-access', { token })
    .then((response) => {
      persistAuthenticatedUser(dispatch, response)
      dispatch('set/message', response.data.message)
      dispatch('notifications/success', response.data.message, { root: true })
      return true
    })
    .catch((error) => {
      const message =
        error.response && error.response.data
          ? error.response.data.message
          : 'Token QR invalide.'
      dispatch('set/message', message)
      dispatch('set/alertError', true)
      return false
    })
},
```

- [ ] **Step 5: Add table access page**

Create `pages/table-access/_token.vue`:

```vue
<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" class="text-center">
        <Loading v-if="loading" />
        <v-alert v-else-if="error" outlined text type="error">
          {{ message }}
        </v-alert>
        <v-btn v-if="error" color="primary" class="text-none" to="/login">
          Retour a la connexion
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'

export default {
  components: { Loading },
  layout: 'empty',
  data() {
    return {
      loading: true,
      error: false,
    }
  },
  computed: {
    message() {
      return this.$store.get('users/message') || 'Token QR invalide.'
    },
  },
  async mounted() {
    const ok = await this.$store.dispatch(
      'users/postTableAccess',
      this.$route.params.token
    )
    this.loading = false
    if (ok) {
      this.$router.replace('/menus')
      return
    }
    this.error = true
  },
}
</script>
```

- [ ] **Step 6: Add frontend test script entry**

Modify frontend `package.json` by prepending `node test/table-access-auth.test.js && ` to the existing `test` script.

Do not remove any existing frontend test command.

- [ ] **Step 7: Run frontend tests**

Run:

```bash
npm.cmd test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add store/users.js pages/table-access/_token.vue test/table-access-auth.test.js package.json
git commit -m "feat: add table QR access route"
```

---

### Task 4: Frontend QR URL Generation Without Credentials

**Files:**
- Modify: `helpers/tableIdentity.js`
- Modify: `test/table-identity.test.js`
- Modify: `pages/tables/index.vue`

**Interfaces:**
- Consumes: `table_access_token` returned by backend for access 2 users.
- Produces: `buildTableAccessPath(token: string): string`
- Produces: copied and QR URLs shaped as `${origin}/table-access/${token}`.

- [ ] **Step 1: Write helper test**

Append to `test/table-identity.test.js`:

```js
assert.strictEqual(
  buildTableAccessPath('signed.token.value'),
  '/table-access/signed.token.value'
)

assert.strictEqual(
  buildTableAccessUrl('https://app.smarteat.fr', 'signed.token.value'),
  'https://app.smarteat.fr/table-access/signed.token.value'
)

assert.ok(
  !buildTableAccessUrl('https://app.smarteat.fr', 'signed.token.value').includes('password=')
)
assert.ok(
  !buildTableAccessUrl('https://app.smarteat.fr', 'signed.token.value').includes('username=')
)
```

Update the destructuring import at the top:

```js
const {
  buildStableTableDomain,
  buildStableTableEmail,
  buildStableTableLogin,
  buildTableAccessPath,
  buildTableAccessUrl,
  normalizeIdentityPart,
} = require('../helpers/tableIdentity')
```

- [ ] **Step 2: Run helper test to verify it fails**

Run:

```bash
node test/table-identity.test.js
```

Expected: FAIL because builders are not exported.

- [ ] **Step 3: Implement helper builders**

Modify `helpers/tableIdentity.js`:

```js
const buildTableAccessPath = (token) =>
  `/table-access/${encodeURIComponent(token || '')}`

const buildTableAccessUrl = (origin, token) =>
  `${String(origin || '').replace(/\/$/, '')}${buildTableAccessPath(token)}`
```

Export both functions.

- [ ] **Step 4: Update table list page**

Modify `pages/tables/index.vue` imports:

```js
import { buildTableAccessUrl } from '@/helpers/tableIdentity'
```

Add method:

```js
tableAccessUrl(item) {
  return buildTableAccessUrl(this.websiteUrl, item.table_access_token)
},
```

Replace every URL construction shaped as:

```js
this.websiteUrl + '/login?username=' + item.email + '&password=' + item.clearpass
```

with:

```js
this.tableAccessUrl(item)
```

For the QR component:

```vue
<qr-code :text="tableAccessUrl(items)" />
```

For display:

```vue
{{ tableAccessUrl(items) }}
```

Add a guard in the actions area:

```vue
<v-alert v-if="!items.table_access_token" dense outlined type="warning">
  QR indisponible pour cette table.
</v-alert>
```

Keep download hidden or disabled when no token exists:

```vue
:disabled="!items.table_access_token"
```

- [ ] **Step 5: Remove password-as-login copy from table card**

In `pages/tables/index.vue`, change the label `URL de connexion automatique :` to:

```text
URL QR table :
```

Remove the displayed password block from the table card to avoid encouraging credential sharing.

- [ ] **Step 6: Run focused tests**

Run:

```bash
node test/table-identity.test.js
npm.cmd test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add helpers/tableIdentity.js test/table-identity.test.js pages/tables/index.vue
git commit -m "feat: build table QR URLs without credentials"
```

---

### Task 5: Remove Login Query Credential Auto-Submit

**Files:**
- Modify: `components/forms.vue`
- Create: `test/login-query-credentials.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: normal human `/login` form remains unchanged.
- Produces: no automatic auth from `username` and `password` URL query parameters.

- [ ] **Step 1: Write regression test**

Create `test/login-query-credentials.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../components/forms.vue'), 'utf8')

assert.ok(
  !source.includes('this.$route.query.username'),
  'login form must not read username from query params'
)
assert.ok(
  !source.includes('this.$route.query.password'),
  'login form must not read password from query params'
)
assert.ok(
  !source.includes('await this.sumitforms()'),
  'login form must not auto-submit from mounted query params'
)

console.log('login query credential tests passed')
```

- [ ] **Step 2: Run regression test to verify it fails**

Run:

```bash
node test/login-query-credentials.test.js
```

Expected: FAIL because the current component still reads query credentials.

- [ ] **Step 3: Remove mounted auto-submit**

In `components/forms.vue`, delete:

```js
async mounted() {
  if (this.$route.query.username && this.$route.query.password) {
    this.formsdata.email = this.$route.query.username
    this.formsdata.password = this.$route.query.password
    await this.sumitforms()
  }
},
```

Do not change manual form submit behavior.

- [ ] **Step 4: Add frontend test script entry**

Modify frontend `package.json` by prepending `node test/login-query-credentials.test.js && ` before `node test/table-access-auth.test.js && ` in the existing `test` script.

Do not remove any existing frontend test command.

- [ ] **Step 5: Run frontend tests**

Run:

```bash
npm.cmd test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/forms.vue test/login-query-credentials.test.js package.json
git commit -m "fix: stop login from consuming URL credentials"
```

---

### Task 6: Fix Frontend Access Middleware

**Files:**
- Modify: `middleware/auth.js`
- Create: `test/auth-middleware.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: current `allowedPaths` and `allowedPathName` behavior.
- Produces: access `2` and access `3` users are restricted to client routes using OR-style logic.

- [ ] **Step 1: Write middleware test**

Create `test/auth-middleware.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../middleware/auth.js'), 'utf8')
const executable = source
  .replace(/export default function/, 'function authMiddleware')
  .concat('\nreturn authMiddleware\n')

const authMiddleware = new Function(executable)()

const run = ({ authenticated, access, path, name }) => {
  const redirects = []
  authMiddleware({
    store: {
      state: {
        authenticated,
        users: {
          user: { access },
        },
      },
    },
    redirect(target) {
      redirects.push(target)
    },
    route: { path, name },
    router: {},
  })
  return redirects
}

assert.deepStrictEqual(
  run({ authenticated: false, access: null, path: '/', name: 'index' }),
  ['/login']
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 2, path: '/settings', name: 'settings' }),
  ['/menus']
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 2, path: '/menus', name: 'menus' }),
  []
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 3, path: '/tables', name: 'tables' }),
  ['/menus']
)

assert.deepStrictEqual(
  run({ authenticated: true, access: 0, path: '/settings', name: 'settings' }),
  []
)

console.log('auth middleware tests passed')
```

- [ ] **Step 2: Run middleware test to verify it fails**

Run:

```bash
node test/auth-middleware.test.js
```

Expected: FAIL because `access === 2 && access === 3` can never restrict.

- [ ] **Step 3: Implement targeted middleware fix**

Modify condition in `middleware/auth.js`:

```js
  const isClientAccess =
    store.state.users.user.access === 2 || store.state.users.user.access === 3

  if (
    isClientAccess &&
    !allowedPaths.includes(route.path) &&
    !allowedPathName.includes(route.name)
  ) {
    return redirect('/menus')
  }
```

Keep the existing allowed paths and route names unchanged.

- [ ] **Step 4: Add frontend test script entry**

Modify frontend `package.json` by prepending `node test/auth-middleware.test.js && ` before `node test/login-query-credentials.test.js && ` in the existing `test` script.

Do not remove any existing frontend test command.

- [ ] **Step 5: Run frontend tests**

Run:

```bash
npm.cmd test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add middleware/auth.js test/auth-middleware.test.js package.json
git commit -m "fix: restrict client access routes"
```

---

### Task 7: End-To-End Verification And Cleanup

**Files:**
- Inspect: frontend and backend changed files.
- Modify only if tests or manual inspection expose a defect.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified branch ready for review.

- [ ] **Step 1: Search for remaining credential URLs**

Run:

```bash
rg -n "login\\?username|query\\.username|query\\.password|password=.*clearpass|username=.*clearpass|clearpass" pages components store helpers middleware test ..\express-pos\src ..\express-pos\test
```

Expected:

- No remaining `/login?username=...&password=...` construction.
- `clearpass` may remain in backend legacy login/register code and table creation payloads, but not in QR URL generation.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
npm.cmd test
```

Expected: PASS.

- [ ] **Step 3: Run backend tests**

Run:

```bash
cd ..\express-pos
npm.cmd test
```

Expected: PASS.

- [ ] **Step 4: Run frontend lint**

Run:

```bash
cd ..\pos-app
npm.cmd run lint
```

Expected: PASS, or only pre-existing lint failures documented with exact output.

- [ ] **Step 5: Optional local smoke test**

If `.env` files are present and backend can start locally, run:

```bash
cd ..\express-pos
npm.cmd run start
```

In another terminal:

```bash
cd ..\pos-app
npm.cmd run dev
```

Manual checks:

- Admin login still works through `/login`.
- `/tables` shows QR table URLs without `username` or `password`.
- Opening `/table-access/<token>` creates an access `2` session and redirects to `/menus`.
- Access `2` cannot open admin pages like `/settings`.

- [ ] **Step 6: Commit final fixes if needed**

If verification required small fixes:

```bash
git add <changed-files>
git commit -m "fix: complete table access verification"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: QR credentials removed, stable QR token preserved, 4-hour table sessions added, login form separated from table access, middleware bug included, tests specified for frontend and backend.
- Placeholder scan: no placeholder markers remain; optional smoke test is explicitly conditional on local env availability.
- Type consistency: `postTableAccess`, `table_access_token`, `/table-access/:token`, and `POST /baseurl/api/v1/table-access` names are consistent across tasks.

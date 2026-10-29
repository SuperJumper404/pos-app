<template>
  <v-container fluid>
    <v-toolbar flat class="mb-4">
      <v-toolbar-title>Staff / Equipe</v-toolbar-title>
      <v-spacer />
      <v-btn color="primary" class="text-none" @click="openCreate">
        <v-icon left>mdi-account-plus</v-icon>
        Ajouter un utilisateur
      </v-btn>
    </v-toolbar>

    <v-data-table
      :headers="headers"
      :items="staff"
      :loading="loading"
      :items-per-page="10"
      class="elevation-1"
    >
      <template #[`item.access`]="{ item }">
        <v-chip small :color="roleColor(item.access)" dark>
          {{ isPrimaryAdmin(item) ? 'Admin principal' : roleLabel(item.access) }}
        </v-chip>
      </template>
      <template #[`item.status`]="{ item }">
        <v-chip small :color="Number(item.status) === 1 ? 'success' : 'grey'" dark>
          {{ Number(item.status) === 1 ? 'Actif' : 'Desactive' }}
        </v-chip>
      </template>
      <template #[`item.staff_login_id`]="{ item }">
        {{ item.staff_login_id || 'A creer' }}
      </template>
      <template #[`item.pin`]="{ item }">
        <div v-if="!isPrimaryAdmin(item)" class="staff-pin">
          <span class="staff-pin__value">{{ pinUserId === item.id && revealedPin ? revealedPin : '****' }}</span>
          <v-tooltip top>
            <template #activator="{ on, attrs }">
              <v-btn
                icon
                small
                :loading="pinUserId === item.id && pinLoading"
                :aria-label="pinUserId === item.id && revealedPin ? 'Masquer le PIN' : 'Afficher le PIN'"
                v-bind="attrs"
                v-on="on"
                @click="togglePin(item)"
              >
                <v-icon small>{{ pinUserId === item.id && revealedPin ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
              </v-btn>
            </template>
            {{ pinUserId === item.id && revealedPin ? 'Masquer le PIN' : 'Afficher le PIN' }}
          </v-tooltip>
          <span v-if="pinUserId === item.id && pinMessage" role="status" class="text-caption">{{ pinMessage }}</span>
        </div>
        <span v-else>-</span>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-tooltip top>
          <template #activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on" @click="openEdit(item)">
              <v-icon small>mdi-pencil</v-icon>
            </v-btn>
          </template>
          Modifier
        </v-tooltip>
        <v-tooltip v-if="!isPrimaryAdmin(item)" top>
          <template #activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on" @click="openCredentials(item)">
              <v-icon small>mdi-key-variant</v-icon>
            </v-btn>
          </template>
          Nouveau PIN
        </v-tooltip>
        <v-tooltip v-if="!isPrimaryAdmin(item)" top>
          <template #activator="{ on, attrs }">
            <v-btn icon small color="error" v-bind="attrs" v-on="on" @click="confirmRemove(item)">
              <v-icon small>mdi-delete</v-icon>
            </v-btn>
          </template>
          Supprimer
        </v-tooltip>
      </template>
    </v-data-table>

    <v-dialog v-model="formDialog" max-width="560" persistent>
      <v-card class="se-modal">
        <v-card-title>{{ isEditing ? 'Modifier un utilisateur' : 'Ajouter un utilisateur' }}</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid" @submit.prevent="submit">
            <v-text-field
              v-model.trim="form.username"
              label="Nom"
              :rules="requiredRules"
              autofocus
            />
            <v-text-field
              v-if="isEditing"
              :value="form.staff_login_id"
              label="ID caisse"
              readonly
            />
            <v-select
              v-if="!isEditingPrimaryAdmin"
              v-model="form.access"
              :items="ROLE_OPTIONS"
              item-text="text"
              item-value="value"
              label="Role"
              :rules="accessRules"
              @change="applyRolePreset"
            />
            <div v-if="!isEditingPrimaryAdmin && form.access !== 6" class="text-subtitle-2 mb-2">Modules accessibles</div>
            <v-row v-if="!isEditingPrimaryAdmin && form.access !== 6" no-gutters>
              <v-col
                v-for="module in MODULE_OPTIONS"
                :key="module.value"
                cols="12"
                sm="6"
              >
                <v-checkbox
                  v-model="form.module_permissions"
                  :label="module.text"
                  :value="module.value"
                  hide-details
                  class="mt-1"
                />
              </v-col>
            </v-row>
            <v-switch
              v-if="!isEditingPrimaryAdmin"
              v-model="form.active"
              label="Compte actif"
              class="mt-4"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer />
          <v-btn class="se-modal-action se-modal-action--secondary text-none" @click="closeForm"><v-icon left>mdi-close</v-icon>Annuler</v-btn>
          <v-btn color="primary" class="se-modal-action se-modal-action--primary text-none" :loading="submitting" @click="submit">
            <v-icon left>mdi-content-save</v-icon>
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="credentialsDialog" max-width="420" persistent>
      <v-card class="se-modal">
        <v-card-title>Identifiants caisse</v-card-title>
        <v-card-text>
          <v-text-field
            v-if="credentialResult"
            :value="credentialResult.staff_login_id"
            label="ID caisse"
            readonly
          />
          <v-text-field
            v-if="credentialResult && credentialResult.staff_pin"
            :value="credentialResult.staff_pin"
            label="PIN"
            :type="showCredentialPin ? 'text' : 'password'"
            :append-icon="showCredentialPin ? 'mdi-eye-off' : 'mdi-eye'"
            readonly
            @click:append="showCredentialPin = !showCredentialPin"
          />
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer />
          <v-btn class="se-modal-action se-modal-action--secondary text-none" @click="finishCredentials"><v-icon left>mdi-close</v-icon>Fermer</v-btn>
          <v-btn
            v-if="credentialUser && !(credentialResult && credentialResult.staff_pin)"
            color="primary"
            class="se-modal-action se-modal-action--primary text-none"
            :loading="credentialLoading"
            @click="saveCredentials"
          >
            <v-icon left>mdi-key</v-icon>
            Generer un PIN
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="420">
      <v-card class="se-modal">
        <v-card-title>Supprimer cet utilisateur ?</v-card-title>
        <v-card-text>
          {{ removeTarget ? removeTarget.username : '' }} ne pourra plus se connecter.
        </v-card-text>
        <v-card-actions class="se-modal-actions">
          <v-spacer />
          <v-btn class="se-modal-action se-modal-action--secondary text-none" @click="removeDialog = false"><v-icon left>mdi-close</v-icon>Annuler</v-btn>
          <v-btn color="error" class="se-modal-action se-modal-action--danger text-none" :loading="removing" @click="removeStaff">
            <v-icon left>mdi-delete</v-icon>
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
const {
  MODULE_OPTIONS,
  PERSONAL_ROLE_OPTIONS: ROLE_OPTIONS,
  getRoleLabel,
  getRoleModuleDefaults,
  isDeliveryAdmin,
} = require('@/helpers/staffRoles')

const emptyForm = () => ({
  id: null,
  username: '',
  staff_login_id: '',
  access: null,
  module_permissions: [],
  service_point_id: null,
  active: true,
  is_primary_admin: false,
})

export default {
  middleware: ['auth', 'delivery'],
  data() {
    return {
      MODULE_OPTIONS,
      ROLE_OPTIONS,
      loading: false,
      submitting: false,
      removing: false,
      formDialog: false,
      credentialsDialog: false,
      removeDialog: false,
      formValid: false,
      credentialLoading: false,
      form: emptyForm(),
      credentialUser: null,
      credentialResult: null,
      showCredentialPin: false,
      revealedPin: '',
      pinUserId: null,
      pinLoading: false,
      pinMessage: '',
      pinRequest: 0,
      credentialScopeVersion: 0,
      removeTarget: null,
      handledCourierQuery: false,
      headers: [
        { text: 'Nom', value: 'username' },
        { text: 'ID caisse', value: 'staff_login_id' },
        { text: 'PIN', value: 'pin', sortable: false },
        { text: 'Role', value: 'access' },
        { text: 'Statut', value: 'status' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      requiredRules: [(value) => !!value || 'Champ requis'],
      accessRules: [(value) => value !== null || 'Role requis'],
    }
  },
  computed: {
    credentialActor() {
      const user = this.$store.state.users && this.$store.state.users.user
      return JSON.stringify(user && [user.id, user.shopid, user.access, user.status, user.session_subject, user.token])
    },
    staff() {
      return this.$store.get('staff/data') || []
    },
    isEditing() {
      return this.form.id !== null
    },
    isEditingPrimaryAdmin() {
      return this.isEditing && this.form.is_primary_admin
    },
  },
  watch: {
    credentialActor: {
      sync: true,
      handler() { this.clearRevealedPin(); this.closeCredentials() },
    },
    '$route.fullPath': {
      sync: true,
      handler() { this.clearRevealedPin(); this.closeCredentials() },
    },
    staff: {
      sync: true,
      handler() {
        this.clearRevealedPin()
        if (this.credentialUser || this.credentialResult) this.closeCredentials()
      },
    },
  },
  beforeDestroy() {
    this.clearRevealedPin()
    this.closeCredentials()
  },
  mounted() {
    this.refresh()
  },
  methods: {
    clearRevealedPin() {
      this.pinRequest++
      this.revealedPin = ''
      this.pinUserId = null
      this.pinLoading = false
      this.pinMessage = ''
    },
    async togglePin(user) {
      if (this.isPrimaryAdmin(user) || !isDeliveryAdmin(this.$store.state.users.user)) return
      if (this.pinUserId === user.id && (this.revealedPin || this.pinLoading)) { this.clearRevealedPin(); return }
      this.clearRevealedPin()
      const request = this.pinRequest
      this.pinUserId = user.id
      this.pinLoading = true
      try {
        const result = await this.$store.dispatch('staff/readCredentials', { id: user.id })
        if (request !== this.pinRequest) return
        this.revealedPin = result && /^\d{4}$/.test(result.staff_pin) ? result.staff_pin : ''
        this.pinMessage = result && result.needs_regeneration ? 'PIN a regenerer' : !result ? 'PIN indisponible' : ''
      } catch (_) {
        if (request === this.pinRequest) this.pinMessage = 'PIN indisponible'
      } finally {
        if (request === this.pinRequest) this.pinLoading = false
      }
    },
    roleLabel(access) {
      return getRoleLabel(access)
    },
    roleColor(access) {
      return {
        0: 'primary',
        1: 'success',
        4: 'warning',
        5: 'red darken-2',
      }[Number(access)] || 'grey'
    },
    isPrimaryAdmin(user) {
      return Number(user.access) === 0 && Number(user.is_primary_admin) === 1
    },
    async refresh() {
      this.loading = true
      await this.$store.dispatch('staff/getAll')
      this.loading = false
      if (this.handledCourierQuery) return
      this.handledCourierQuery = true
      const courierId = Number(this.$route && this.$route.query.courier)
      const target = this.staff.find(user => user.id === courierId && Number(user.access) === 6)
      if (target && !this.formDialog && !this.credentialsDialog) this.openEdit(target)
      if (this.$route && this.$route.query.create === 'courier' && !this.formDialog) {
        this.openCreate()
        this.form.access = 6
        this.applyRolePreset(6)
      }
    },
    openCreate() {
      this.form = emptyForm()
      this.formDialog = true
    },
    openEdit(user) {
      const access = Number(user.access)
      this.form = {
        id: user.id,
        username: user.username || '',
        staff_login_id: user.staff_login_id || '',
        access,
        module_permissions: access === 6 ? [] : Array.isArray(user.module_permissions)
          ? user.module_permissions
          : getRoleModuleDefaults(access),
        service_point_id: user.service_point_id || null,
        active: Number(user.status) === 1,
        is_primary_admin: this.isPrimaryAdmin(user),
      }
      this.formDialog = true
    },
    applyRolePreset(access) {
      this.form.module_permissions = getRoleModuleDefaults(access)
    },
    closeForm() {
      this.formDialog = false
      this.form = emptyForm()
      if (this.$refs.form) this.$refs.form.resetValidation()
    },
    async submit() {
      if (!this.$refs.form.validate()) return
      const scope = this.credentialScopeVersion
      const isCreating = !this.isEditing
      this.submitting = true
      const data = this.isEditingPrimaryAdmin
        ? { username: this.form.username }
        : {
          username: this.form.username,
          access: this.form.access,
          status: this.form.active ? 1 : 0,
          module_permissions: this.form.module_permissions,
          service_point_id: null,
        }
      const result = this.isEditing
        ? await this.$store.dispatch('staff/update', { id: this.form.id, data })
        : await this.$store.dispatch('staff/create', data)
      this.submitting = false
      if (scope !== this.credentialScopeVersion) return
      if (!result) return
      this.closeForm()
      await this.refresh()
      if (scope !== this.credentialScopeVersion) return
      if (isCreating && result.staff_login_id && result.staff_pin) {
        this.credentialUser = null
        this.credentialResult = result
        this.showCredentialPin = false
        this.credentialsDialog = true
      }
    },
    openCredentials(user) {
      this.clearRevealedPin()
      this.closeCredentials()
      this.credentialUser = user
      this.credentialResult = { staff_login_id: user.staff_login_id }
      this.showCredentialPin = false
      this.credentialsDialog = true
    },
    closeCredentials() {
      this.credentialScopeVersion++
      this.credentialsDialog = false
      this.credentialUser = null
      this.credentialResult = null
      this.showCredentialPin = false
    },
    finishCredentials() {
      this.closeCredentials()
      this.refresh()
    },
    async saveCredentials() {
      if (!this.credentialUser || this.credentialLoading) return
      const scope = this.credentialScopeVersion
      this.clearRevealedPin()
      this.credentialLoading = true
      const result = await this.$store.dispatch('staff/provisionCredentials', {
        id: this.credentialUser.id,
      })
      this.credentialLoading = false
      if (scope !== this.credentialScopeVersion) return
      if (!result) return
      this.credentialResult = result
      this.showCredentialPin = false
    },
    confirmRemove(user) {
      this.removeTarget = user
      this.removeDialog = true
    },
    async removeStaff() {
      if (!this.removeTarget) return
      this.removing = true
      const result = await this.$store.dispatch('staff/remove', this.removeTarget.id)
      this.removing = false
      if (!result) return
      this.removeDialog = false
      this.removeTarget = null
      await this.refresh()
    },
  },
}
</script>

<style scoped>
.staff-pin { display: flex; align-items: center; gap: 8px; min-height: 36px; flex-wrap: wrap; }
.staff-pin__value { display: inline-block; min-width: 4ch; font-variant-numeric: tabular-nums; }
</style>

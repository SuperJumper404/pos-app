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
          {{ roleLabel(item.access) }}
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
      <template #[`item.actions`]="{ item }">
        <v-tooltip top>
          <template #activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on" @click="openEdit(item)">
              <v-icon small>mdi-pencil</v-icon>
            </v-btn>
          </template>
          Modifier
        </v-tooltip>
        <v-tooltip top>
          <template #activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on" @click="openCredentials(item)">
              <v-icon small>mdi-key-variant</v-icon>
            </v-btn>
          </template>
          Identifiants caisse
        </v-tooltip>
        <v-tooltip top>
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
      <v-card>
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
              v-model.trim="form.email"
              label="E-mail"
              type="email"
              :disabled="isEditing"
              :rules="emailRules"
            />
            <v-text-field v-model.trim="form.phone" label="Telephone" />
            <v-text-field
              v-if="!isEditing"
              v-model="form.pin"
              label="PIN a 4 chiffres"
              type="password"
              inputmode="numeric"
              maxlength="4"
              :rules="pinRules"
            />
            <v-text-field
              v-if="!isEditing && Number(form.access) === 0"
              v-model="form.password"
              label="Mot de passe e-mail"
              type="password"
            />
            <v-select
              v-model="form.access"
              :items="ROLE_OPTIONS"
              item-text="text"
              item-value="value"
              label="Acces"
              :rules="accessRules"
            />
            <v-switch v-model="form.active" label="Compte actif" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text class="text-none" @click="closeForm">Annuler</v-btn>
          <v-btn color="primary" class="text-none" :loading="submitting" @click="submit">
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="credentialsDialog" max-width="420" persistent>
      <v-card>
        <v-card-title>Identifiants caisse</v-card-title>
        <v-card-text>
          <v-form ref="credentialsForm" v-model="credentialsValid" @submit.prevent="saveCredentials">
            <v-text-field
              v-if="credentialResult"
              :value="credentialResult.staff_login_id"
              label="ID caisse"
              readonly
            />
            <v-text-field
              v-model="credentialsPin"
              label="PIN a 4 chiffres"
              type="password"
              inputmode="numeric"
              maxlength="4"
              :rules="pinRules"
            />
            <v-switch v-model="regenerateLoginId" label="Regenerer ID caisse" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text class="text-none" @click="closeCredentials">Annuler</v-btn>
          <v-btn color="primary" class="text-none" :loading="credentialLoading" @click="saveCredentials">
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="createdCredentialsDialog" max-width="420">
      <v-card>
        <v-card-title>Identifiants caisse</v-card-title>
        <v-card-text>
          <v-text-field
            :value="createdCredentials.staff_login_id"
            label="ID caisse"
            readonly
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" class="text-none" @click="createdCredentialsDialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="420">
      <v-card>
        <v-card-title>Supprimer cet utilisateur ?</v-card-title>
        <v-card-text>
          {{ removeTarget ? removeTarget.username : '' }} ne pourra plus se connecter.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text class="text-none" @click="removeDialog = false">Annuler</v-btn>
          <v-btn color="error" class="text-none" :loading="removing" @click="removeStaff">
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
const { ROLE_OPTIONS, getRoleLabel } = require('@/helpers/staffRoles')

const emptyForm = () => ({
  id: null,
  username: '',
  email: '',
  phone: '',
  password: '',
  pin: '',
  access: null,
  active: true,
})

export default {
  middleware: 'auth',
  data() {
    return {
      ROLE_OPTIONS,
      loading: false,
      submitting: false,
      removing: false,
      formDialog: false,
      credentialsDialog: false,
      createdCredentialsDialog: false,
      removeDialog: false,
      formValid: false,
      credentialsValid: false,
      credentialLoading: false,
      form: emptyForm(),
      credentialUser: null,
      credentialResult: null,
      createdCredentials: {},
      credentialsPin: '',
      regenerateLoginId: false,
      removeTarget: null,
      headers: [
        { text: 'Nom', value: 'username' },
        { text: 'E-mail', value: 'email' },
        { text: 'ID caisse', value: 'staff_login_id' },
        { text: 'Role', value: 'access' },
        { text: 'Statut', value: 'status' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      requiredRules: [(value) => !!value || 'Champ requis'],
      emailRules: [
        (value) => !value || /.+@.+\..+/.test(value) || 'E-mail invalide',
      ],
      pinRules: [
        (value) => /^\d{4}$/.test(value || '') || 'PIN a 4 chiffres requis',
      ],
      accessRules: [(value) => value !== null || 'Acces requis'],
    }
  },
  computed: {
    staff() {
      return this.$store.get('staff/data') || []
    },
    isEditing() {
      return this.form.id !== null
    },
  },
  mounted() {
    this.refresh()
  },
  methods: {
    roleLabel(access) {
      return getRoleLabel(access)
    },
    roleColor(access) {
      return {
        0: 'primary',
        1: 'green darken-2',
        4: 'orange darken-2',
        5: 'red darken-2',
      }[Number(access)] || 'grey'
    },
    async refresh() {
      this.loading = true
      await this.$store.dispatch('staff/getAll')
      this.loading = false
    },
    openCreate() {
      this.form = emptyForm()
      this.formDialog = true
    },
    openEdit(user) {
      this.form = {
        id: user.id,
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        pin: '',
        access: Number(user.access),
        active: Number(user.status) === 1,
      }
      this.formDialog = true
    },
    closeForm() {
      this.formDialog = false
      this.form = emptyForm()
      if (this.$refs.form) this.$refs.form.resetValidation()
    },
    async submit() {
      if (!this.$refs.form.validate()) return
      const isCreating = !this.isEditing
      this.submitting = true
      const data = {
        username: this.form.username,
        phone: this.form.phone,
        access: this.form.access,
        status: this.form.active ? 1 : 0,
      }
      const result = this.isEditing
        ? await this.$store.dispatch('staff/update', { id: this.form.id, data })
        : await this.$store.dispatch('staff/create', {
          ...data,
          email: this.form.email,
          pin: this.form.pin,
          password: this.form.password,
        })
      this.submitting = false
      if (!result) return
      this.closeForm()
      await this.refresh()
      if (isCreating && result.staff_login_id) {
        this.createdCredentials = result
        this.createdCredentialsDialog = true
      }
    },
    openCredentials(user) {
      this.credentialUser = user
      this.credentialResult = user.staff_login_id
        ? { staff_login_id: user.staff_login_id }
        : null
      this.credentialsPin = ''
      this.regenerateLoginId = false
      this.credentialsDialog = true
    },
    closeCredentials() {
      this.credentialsDialog = false
      this.credentialUser = null
      this.credentialResult = null
      this.credentialsPin = ''
      this.regenerateLoginId = false
      if (this.$refs.credentialsForm) this.$refs.credentialsForm.resetValidation()
    },
    async saveCredentials() {
      if (!this.credentialUser || !this.$refs.credentialsForm.validate()) return
      this.credentialLoading = true
      const result = await this.$store.dispatch('staff/provisionCredentials', {
        id: this.credentialUser.id,
        pin: this.credentialsPin,
        regenerateLoginId: this.regenerateLoginId,
      })
      this.credentialLoading = false
      if (!result) return
      this.credentialResult = result
      this.credentialsPin = ''
      this.regenerateLoginId = false
      await this.refresh()
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

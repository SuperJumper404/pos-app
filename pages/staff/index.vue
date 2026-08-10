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
              v-model="form.password"
              label="Mot de passe"
              type="password"
              :rules="requiredRules"
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
      removeDialog: false,
      formValid: false,
      form: emptyForm(),
      removeTarget: null,
      headers: [
        { text: 'Nom', value: 'username' },
        { text: 'E-mail', value: 'email' },
        { text: 'Role', value: 'access' },
        { text: 'Statut', value: 'status' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      requiredRules: [(value) => !!value || 'Champ requis'],
      emailRules: [
        (value) => !!value || 'E-mail requis',
        (value) => /.+@.+\..+/.test(value) || 'E-mail invalide',
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
          password: this.form.password,
          clearpass: this.form.password,
        })
      this.submitting = false
      if (!result) return
      this.closeForm()
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

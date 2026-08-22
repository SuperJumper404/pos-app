<template>
  <v-container fluid>
    <v-toolbar flat class="mb-4">
      <v-toolbar-title>Bornes</v-toolbar-title>
      <v-spacer />
      <v-btn color="primary" class="text-none" @click="openCreate">
        <v-icon left>mdi-tablet-dashboard</v-icon>
        Ajouter une borne
      </v-btn>
    </v-toolbar>

    <v-data-table
      :headers="headers"
      :items="bornes"
      :loading="loading"
      :items-per-page="10"
      class="elevation-1"
    >
      <template #[`item.is_active`]="{ item }">
        <v-chip small :color="Number(item.is_active) === 1 ? 'success' : 'grey'" dark>
          {{ Number(item.is_active) === 1 ? 'Actif' : 'Desactive' }}
        </v-chip>
      </template>

      <template #[`item.kiosk_login_id`]="{ item }">
        <span class="font-weight-medium">{{ item.kiosk_login_id || 'A generer' }}</span>
      </template>

      <template #[`item.pin`]="{ item }">
        <span>{{ visiblePin(item) }}</span>
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
            <v-btn
              icon
              small
              :color="Number(item.is_active) === 1 ? 'grey' : 'success'"
              v-bind="attrs"
              v-on="on"
              @click="toggleActive(item)"
            >
              <v-icon small>
                {{ Number(item.is_active) === 1 ? 'mdi-pause-circle' : 'mdi-play-circle' }}
              </v-icon>
            </v-btn>
          </template>
          {{ Number(item.is_active) === 1 ? 'Desactiver' : 'Activer' }}
        </v-tooltip>
        <v-tooltip top>
          <template #activator="{ on, attrs }">
            <v-btn icon small color="primary" v-bind="attrs" v-on="on" @click="regeneratePin(item)">
              <v-icon small>mdi-key-change</v-icon>
            </v-btn>
          </template>
          Regenerer le PIN
        </v-tooltip>
        <v-tooltip top>
          <template #activator="{ on, attrs }">
            <v-btn icon small color="secondary" v-bind="attrs" v-on="on" @click="copyKioskAccessUrl">
              <v-icon small>mdi-content-copy</v-icon>
            </v-btn>
          </template>
          Copier le lien borne
        </v-tooltip>
      </template>
    </v-data-table>

    <v-dialog v-model="formDialog" max-width="460" persistent>
      <v-card>
        <v-card-title>{{ form.id ? 'Modifier la borne' : 'Ajouter une borne' }}</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid" @submit.prevent="submit">
            <v-text-field
              v-model.trim="form.name"
              label="Nom de la borne"
              :rules="requiredRules"
              autofocus
            />
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

    <v-dialog v-model="credentialsDialog" max-width="420">
      <v-card>
        <v-card-title>Acces borne</v-card-title>
        <v-card-text>
          <v-text-field :value="credentials.kiosk_login_id" label="Identifiant" readonly />
          <v-text-field
            :value="credentials.kiosk_pin"
            label="PIN"
            readonly
            :type="showPin ? 'text' : 'password'"
            :append-icon="showPin ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append="showPin = !showPin"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text class="text-none" @click="credentialsDialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="2400" color="success">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script>
const emptyForm = () => ({
  id: null,
  name: '',
})

export default {
  middleware: 'auth',
  data() {
    return {
      loading: false,
      submitting: false,
      formDialog: false,
      credentialsDialog: false,
      formValid: false,
      form: emptyForm(),
      credentialsById: {},
      credentials: {},
      showPin: false,
      snackbar: {
        show: false,
        text: '',
      },
      headers: [
        { text: 'Nom', value: 'name' },
        { text: 'Identifiant', value: 'kiosk_login_id' },
        { text: 'PIN', value: 'pin', sortable: false },
        { text: 'Statut', value: 'is_active' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      requiredRules: [(value) => !!value || 'Champ requis'],
    }
  },
  computed: {
    bornes() {
      return this.$store.get('servicePoints/kiosks') || []
    },
  },
  mounted() {
    this.refresh()
  },
  methods: {
    visiblePin(item) {
      return this.credentialsById[item.id] || item.kiosk_pin || '****'
    },
    async refresh() {
      this.loading = true
      await this.$store.dispatch('servicePoints/getKiosks')
      this.loading = false
    },
    openCreate() {
      this.form = emptyForm()
      this.formDialog = true
    },
    openEdit(item) {
      this.form = {
        id: item.id,
        name: item.name || '',
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
      const result = this.form.id
        ? await this.$store.dispatch('servicePoints/updateKiosk', {
          id: this.form.id,
          data: { name: this.form.name },
        })
        : await this.$store.dispatch('servicePoints/createKiosk', this.form.name)
      this.submitting = false
      if (!result) return
      this.closeForm()
      if (result.kiosk_login_id && result.kiosk_pin) {
        this.showCredentials(result)
      }
      await this.refresh()
    },
    showCredentials(result) {
      this.credentials = result
      this.showPin = true
      if (result.id && result.kiosk_pin) {
        this.credentialsById = {
          ...this.credentialsById,
          [result.id]: result.kiosk_pin,
        }
      }
      this.credentialsDialog = true
    },
    async toggleActive(item) {
      const result = await this.$store.dispatch('servicePoints/updateKiosk', {
        id: item.id,
        data: { is_active: Number(item.is_active) === 1 ? 0 : 1 },
      })
      if (result) await this.refresh()
    },
    async regeneratePin(item) {
      const result = await this.$store.dispatch('servicePoints/regenerateKioskPin', item.id)
      if (!result) return
      this.showCredentials({ id: item.id, ...result })
      await this.refresh()
    },
    kioskAccessUrl() {
      if (typeof window === 'undefined') return
      return `${window.location.origin}/borne`
    },
    async copyKioskAccessUrl() {
      const url = this.kioskAccessUrl()
      if (!url) return

      try {
        await navigator.clipboard.writeText(url)
      } catch (error) {
        const input = document.createElement('textarea')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }

      this.snackbar = {
        show: true,
        text: 'Lien borne copie',
      }
    },
  },
}
</script>

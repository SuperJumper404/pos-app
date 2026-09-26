<template>
  <section class="terminal-readers" aria-labelledby="terminal-readers-title">
    <v-divider class="my-5" />
    <div class="terminal-readers__heading">
      <div>
        <h4 id="terminal-readers-title">Terminaux de paiement</h4>
        <p class="mb-0 mt-1">Gérez les TPE et leur caissier.</p>
      </div>
      <div class="terminal-readers__toolbar">
        <v-tooltip bottom>
          <template #activator="{ on, attrs }">
            <v-btn
              icon
              color="primary"
              :disabled="!stripeReady || busy"
              aria-label="Actualiser les TPE"
              v-bind="attrs"
              v-on="on"
              @click="refreshReaders"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </template>
          <span>Actualiser les TPE</span>
        </v-tooltip>
        <v-btn
          color="primary"
          class="text-none"
          :disabled="!stripeReady || !listLoaded || !staffLoaded || !cashiers.length || busy"
          @click="openRegistration"
        >
          <v-icon left small>mdi-credit-card-plus-outline</v-icon>
          Connecter TPE
        </v-btn>
      </div>
    </div>

    <v-alert v-if="!stripeReady" type="info" text dense class="mt-4 mb-0">
      Terminez la connexion Stripe pour gérer les TPE.
    </v-alert>
    <template v-else>
      <v-alert v-if="listError" type="error" text dense class="mt-4 mb-0" role="alert">
        {{ listError }}
      </v-alert>
      <v-alert v-if="listLoaded && staffLoaded && !cashiers.length" type="info" text dense class="mt-4 mb-0">
        Aucun caissier disponible pour affecter un TPE.
      </v-alert>
      <v-skeleton-loader v-if="!listLoaded && busy" type="list-item-two-line" class="mt-4" />
      <p v-else-if="listLoaded && !readers.length" class="terminal-readers__empty mb-0 mt-4">
        Aucun TPE connecté. Utilisez « Connecter TPE » pour ajouter le premier terminal.
      </p>
      <div v-else-if="listLoaded" class="terminal-readers__list mt-4">
        <div v-for="reader in readers" :key="reader.id" class="terminal-readers__row">
          <div class="terminal-readers__details">
            <strong>{{ reader.label }}</strong>
            <span class="terminal-readers__meta">{{ reader.serialNumber || reader.deviceType || 'Terminal' }}</span>
            <span class="terminal-readers__meta">Caissier : {{ cashierName(reader.assignedUserId) }}</span>
          </div>
          <div class="terminal-readers__controls">
            <div class="terminal-readers__chips">
              <v-chip small :color="reader.isActive ? 'success darken-3' : 'warning darken-4'" dark>
                {{ reader.isActive ? 'Actif' : 'Inactif' }}
              </v-chip>
              <v-chip small :color="reader.status === 'online' ? 'success darken-3' : 'grey darken-2'" dark>
                {{ reader.status === 'online' ? 'En ligne' : 'Hors ligne' }}
              </v-chip>
            </div>
            <div class="terminal-readers__actions">
              <v-tooltip bottom>
                <template #activator="{ on, attrs }">
                  <v-btn
                    icon
                    color="primary"
                    :disabled="busy"
                    :aria-label="`Réaffecter ${reader.label}`"
                    v-bind="attrs"
                    v-on="on"
                    @click="startAssignment(reader)"
                  >
                    <v-icon>mdi-account-switch</v-icon>
                  </v-btn>
                </template>
                <span>Réaffecter</span>
              </v-tooltip>
              <v-tooltip bottom>
                <template #activator="{ on, attrs }">
                  <v-btn
                    icon
                    :color="reader.isActive ? 'warning' : 'success'"
                    :disabled="busy"
                    :aria-label="`${reader.isActive ? 'Désactiver' : 'Réactiver'} ${reader.label}`"
                    v-bind="attrs"
                    v-on="on"
                    @click="setReaderActive(reader)"
                  >
                    <v-icon>{{ reader.isActive ? 'mdi-power' : 'mdi-power-on' }}</v-icon>
                  </v-btn>
                </template>
                <span>{{ reader.isActive ? 'Désactiver' : 'Réactiver' }}</span>
              </v-tooltip>
            </div>
          </div>
          <div v-if="editingReaderId === reader.id" class="terminal-readers__assignment">
            <v-select
              v-model="assignmentUserId"
              :items="cashiers"
              item-text="username"
              item-value="id"
              label="Caissier"
              dense
              outlined
              hide-details
              :disabled="busy"
            />
            <v-tooltip bottom>
              <template #activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="busy || !assignmentUserId"
                  :aria-label="`Enregistrer l'affectation de ${reader.label}`"
                  v-bind="attrs"
                  v-on="on"
                  @click="assignReader(reader, assignmentUserId)"
                >
                  <v-icon>mdi-check</v-icon>
                </v-btn>
              </template>
              <span>Enregistrer l'affectation</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ on, attrs }">
                <v-btn
                  icon
                  :disabled="busy"
                  aria-label="Annuler la réaffectation"
                  v-bind="attrs"
                  v-on="on"
                  @click="editingReaderId = null"
                >
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </template>
              <span>Annuler</span>
            </v-tooltip>
          </div>
        </div>
      </div>
    </template>

    <v-dialog v-model="dialogOpen" max-width="520" :persistent="busy">
      <v-card class="terminal-readers__dialog">
        <v-card-title>Connecter TPE</v-card-title>
        <v-card-text>
          <v-form ref="registrationForm" @submit.prevent="registerReader">
            <v-text-field
              v-model="registrationCode"
              label="Code d’enregistrement"
              autocomplete="off"
              :rules="[required]"
              :disabled="busy"
              outlined
              dense
              autofocus
            />
            <v-text-field
              v-model="readerLabel"
              label="Nom du terminal"
              :rules="[required]"
              :disabled="busy"
              outlined
              dense
            />
            <v-select
              v-model="assignedUserId"
              :items="cashiers"
              item-text="username"
              item-value="id"
              label="Caissier"
              :rules="[required]"
              :disabled="busy"
              outlined
              dense
            />
            <template v-if="firstLocation">
              <h5 class="terminal-readers__address-title">Adresse du terminal</h5>
              <v-text-field
                v-model="address.line1"
                label="Adresse"
                :rules="[required]"
                :disabled="busy"
                outlined
                dense
              />
              <div class="terminal-readers__address-grid">
                <v-text-field
                  v-model="address.postalCode"
                  label="Code postal"
                  :rules="[required]"
                  :disabled="busy"
                  outlined
                  dense
                />
                <v-text-field
                  v-model="address.city"
                  label="Ville"
                  :rules="[required]"
                  :disabled="busy"
                  outlined
                  dense
                />
              </div>
              <v-text-field label="Pays" :value="address.country" readonly outlined dense />
            </template>
            <v-alert v-if="actionError" type="error" text dense role="alert">
              {{ actionError }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text class="text-none" :disabled="busy" @click="closeRegistration">Annuler</v-btn>
          <v-btn color="primary" class="text-none" :loading="busy" @click="registerReader">
            Connecter TPE
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
export default {
  props: {
    stripeReady: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
  },
  data: () => ({
    busy: false,
    listLoaded: false,
    staffLoaded: false,
    loadAttempted: false,
    listError: '',
    actionError: '',
    dialogOpen: false,
    registrationCode: '',
    readerLabel: '',
    assignedUserId: null,
    address: { line1: '', postalCode: '', city: '', country: 'FR' },
    editingReaderId: null,
    assignmentUserId: null,
  }),
  computed: {
    readers() {
      return this.$store.get('stripeTerminal/readers') || []
    },
    cashiers() {
      return (this.$store.get('staff/data') || []).filter(
        (user) => [0, 1].includes(Number(user.access))
      )
    },
    firstLocation() {
      return this.readers.length === 0
    },
  },
  watch: {
    stripeReady: {
      immediate: true,
      handler() { this.loadData() },
    },
    dialogOpen(value) {
      if (!value) this.registrationCode = ''
    },
  },
  methods: {
    required(value) {
      return Boolean(value && String(value).trim()) || 'Champ requis'
    },
    async loadData() {
      if (!this.isAdmin || !this.stripeReady || this.loadAttempted) return
      this.loadAttempted = true
      this.busy = true
      this.listError = ''
      try {
        const [readers, staff] = await Promise.all([
          this.$store.dispatch('stripeTerminal/getReaders'),
          this.$store.dispatch('staff/getAll'),
        ])
        this.listLoaded = readers !== false
        this.staffLoaded = staff !== false
        if (readers === false || staff === false) {
          this.listError = 'Impossible de charger les TPE ou les caissiers. Actualisez pour réessayer.'
        }
      } catch (error) {
        this.listError = 'Impossible de charger les TPE ou les caissiers. Actualisez pour réessayer.'
      } finally {
        this.busy = false
      }
    },
    async refreshReaders() {
      if (!this.isAdmin || !this.stripeReady || this.busy) return
      this.busy = true
      this.listError = ''
      try {
        const [readers, staff] = await Promise.all([
          this.$store.dispatch('stripeTerminal/refreshReaders'),
          this.staffLoaded ? Promise.resolve(true) : this.$store.dispatch('staff/getAll'),
        ])
        this.listLoaded = readers !== false
        this.staffLoaded = staff !== false
        if (readers === false || staff === false) {
          this.listError = 'Actualisation impossible. Réessayez.'
        }
      } catch (error) {
        this.listError = 'Actualisation impossible. Réessayez.'
      } finally {
        this.busy = false
      }
    },
    cashierName(id) {
      const cashier = this.cashiers.find((item) => Number(item.id) === Number(id))
      return cashier ? cashier.username : 'Non attribué'
    },
    openRegistration() {
      if (!this.isAdmin || !this.stripeReady || !this.listLoaded || !this.staffLoaded) return
      this.actionError = ''
      this.dialogOpen = true
    },
    closeRegistration() {
      this.dialogOpen = false
      this.registrationCode = ''
      this.actionError = ''
      if (this.$refs.registrationForm) this.$refs.registrationForm.resetValidation()
    },
    async registerReader() {
      try {
        if (!this.isAdmin || !this.stripeReady || this.busy) return
        if (!this.$refs.registrationForm.validate()) return
        this.busy = true
        this.actionError = ''
        const payload = {
          registrationCode: this.registrationCode.trim(),
          label: this.readerLabel.trim(),
          assignedUserId: this.assignedUserId,
        }
        if (this.firstLocation) {
          payload.address = {
            line1: this.address.line1.trim(),
            postalCode: this.address.postalCode.trim(),
            city: this.address.city.trim(),
            country: 'FR',
          }
        }
        const result = await this.$store.dispatch('stripeTerminal/registerReader', payload)
        if (result === false) {
          this.actionError = 'Connexion du TPE impossible. Vérifiez le code et réessayez.'
        } else {
          this.closeRegistration()
          this.readerLabel = ''
          this.assignedUserId = null
        }
      } catch (error) {
        this.actionError = 'Connexion du TPE impossible. Vérifiez le code et réessayez.'
      } finally {
        this.registrationCode = ''
        this.busy = false
      }
    },
    startAssignment(reader) {
      this.editingReaderId = reader.id
      this.assignmentUserId = reader.assignedUserId
      this.listError = ''
    },
    async assignReader(reader, assignedUserId) {
      if (!this.isAdmin || !this.stripeReady || this.busy || !assignedUserId) return
      this.busy = true
      this.listError = ''
      try {
        const result = await this.$store.dispatch('stripeTerminal/assignReader', {
          id: reader.id, assignedUserId,
        })
        if (result === false) this.listError = 'Affectation impossible. Réessayez.'
        else this.editingReaderId = null
      } catch (error) {
        this.listError = 'Affectation impossible. Réessayez.'
      } finally {
        this.busy = false
      }
    },
    async setReaderActive(reader) {
      if (!this.isAdmin || !this.stripeReady || this.busy) return
      this.busy = true
      this.listError = ''
      try {
        const result = await this.$store.dispatch('stripeTerminal/setReaderActive', {
          id: reader.id, isActive: !reader.isActive,
        })
        if (result === false) this.listError = 'Modification du TPE impossible. Réessayez.'
      } catch (error) {
        this.listError = 'Modification du TPE impossible. Réessayez.'
      } finally {
        this.busy = false
      }
    },
  },
}
</script>

<style scoped>
.terminal-readers {
  min-width: 0;
}
.terminal-readers__heading,
.terminal-readers__toolbar,
.terminal-readers__controls,
.terminal-readers__chips,
.terminal-readers__actions,
.terminal-readers__assignment {
  display: flex;
  align-items: center;
  gap: 8px;
}
.terminal-readers__heading,
.terminal-readers__controls {
  justify-content: space-between;
}
.terminal-readers__heading,
.terminal-readers__row {
  min-width: 0;
}
.terminal-readers__heading h4 {
  font-weight: 600;
}
.terminal-readers__heading p,
.terminal-readers__meta,
.terminal-readers__empty {
  color: var(--se-color-text-muted, #687386);
  font-size: 0.875rem;
}
.terminal-readers__list {
  border-top: 1px solid var(--se-color-border, #dfe5ee);
}
.terminal-readers__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--se-color-border, #dfe5ee);
}
.terminal-readers__details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}
.terminal-readers__chips {
  flex-wrap: wrap;
}
.terminal-readers__assignment {
  grid-column: 1 / -1;
  max-width: 420px;
}
.terminal-readers__assignment .v-select {
  min-width: 0;
}
.terminal-readers__toolbar .v-btn--icon,
.terminal-readers__actions .v-btn--icon,
.terminal-readers__assignment .v-btn--icon {
  min-width: 44px;
  min-height: 44px;
}
.terminal-readers__dialog {
  border-radius: 8px;
}
.terminal-readers__address-title {
  margin: 4px 0 16px;
  font-size: 0.9rem;
  font-weight: 600;
}
.terminal-readers__address-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
@media (max-width: 600px) {
  .terminal-readers__heading,
  .terminal-readers__controls {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .terminal-readers__toolbar {
    width: 100%;
    justify-content: space-between;
  }
  .terminal-readers__row {
    grid-template-columns: minmax(0, 1fr);
  }
  .terminal-readers__controls {
    gap: 4px;
  }
  .terminal-readers__address-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}
</style>

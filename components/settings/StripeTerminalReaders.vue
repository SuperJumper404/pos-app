<template>
  <section class="terminal-readers" aria-labelledby="terminal-readers-title">
    <v-divider class="my-5" />
    <div class="terminal-readers__heading">
      <div>
        <h4 id="terminal-readers-title">Terminaux de paiement</h4>
        <p class="mb-0 mt-1">Gérez les TPE et leur caissier ou leur borne.</p>
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
          :disabled="!stripeReady || !listLoaded || !staffLoaded || !servicePointsLoaded || !hasAssignableTarget || busy"
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
      <v-alert v-if="listLoaded && staffLoaded && servicePointsLoaded && !hasAssignableTarget" type="info" text dense class="mt-4 mb-0">
        Aucun caissier ou borne disponible pour affecter un TPE.
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
            <span class="terminal-readers__meta">{{ assignmentLabel(reader) }}</span>
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
                    :disabled="busy || !reader.isActive"
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
              v-model="assignmentType"
              :items="assignmentTypeItems"
              item-text="text"
              item-value="value"
              label="Type d’affectation"
              dense
              outlined
              hide-details
              :disabled="busy || !reader.isActive"
            />
            <v-select
              v-if="assignmentType === 'cashier'"
              v-model="assignmentUserId"
              :items="cashiers"
              item-text="username"
              item-value="id"
              label="Caissier"
              dense
              outlined
              hide-details
              :disabled="busy || !reader.isActive"
            />
            <v-select
              v-else
              v-model="assignmentServicePointId"
              :items="kioskServicePoints"
              item-text="name"
              item-value="id"
              label="Borne"
              dense
              outlined
              hide-details
              :disabled="busy || !reader.isActive"
            />
            <v-tooltip bottom>
              <template #activator="{ on, attrs }">
                <v-btn
                  icon
                  color="primary"
                  :disabled="busy || !reader.isActive || !selectedAssignmentId"
                  :aria-label="`Enregistrer l'affectation de ${reader.label}`"
                  v-bind="attrs"
                  v-on="on"
                  @click="assignReader(reader, selectedAssignmentId)"
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

    <v-dialog v-model="dialogOpen" max-width="520" :persistent="busy" aria-labelledby="terminal-register-title">
      <v-card class="terminal-readers__dialog">
        <v-card-title id="terminal-register-title">Connecter TPE</v-card-title>
        <v-card-text>
          <v-form ref="registrationForm" @submit.prevent="registerReader">
            <v-text-field
              v-model="registrationCode"
              label="Code d’enregistrement"
              autocomplete="off"
              :rules="[required]"
              :disabled="!stripeReady || busy"
              outlined
              dense
              autofocus
            />
            <v-text-field
              v-model="readerLabel"
              label="Nom du terminal"
              :rules="[required]"
              :disabled="!stripeReady || busy"
              outlined
              dense
            />
            <v-select
              v-model="assignmentType"
              :items="assignmentTypeItems"
              item-text="text"
              item-value="value"
              label="Type d’affectation"
              :rules="[required]"
              :disabled="!stripeReady || busy"
              outlined
              dense
            />
            <v-select
              v-if="assignmentType === 'cashier'"
              v-model="assignedUserId"
              :items="cashiers"
              item-text="username"
              item-value="id"
              label="Caissier"
              :rules="[required]"
              :disabled="!stripeReady || busy"
              outlined
              dense
            />
            <v-select
              v-else
              v-model="assignedServicePointId"
              :items="kioskServicePoints"
              item-text="name"
              item-value="id"
              label="Borne"
              :rules="[required]"
              :disabled="!stripeReady || busy"
              outlined
              dense
            />
            <template v-if="firstLocation">
              <h5 class="terminal-readers__address-title">Adresse du terminal</h5>
              <v-text-field
                v-model="address.line1"
                label="Adresse"
                :rules="[required]"
                :disabled="!stripeReady || busy"
                outlined
                dense
              />
              <div class="terminal-readers__address-grid">
                <v-text-field
                  v-model="address.postalCode"
                  label="Code postal"
                  :rules="[postalCodeRule]"
                  :disabled="!stripeReady || busy"
                  maxlength="5"
                  inputmode="numeric"
                  autocomplete="postal-code"
                  outlined
                  dense
                />
                <v-text-field
                  v-model="address.city"
                  label="Ville"
                  :rules="[required]"
                  :disabled="!stripeReady || busy"
                  outlined
                  dense
                />
              </div>
              <v-text-field label="Pays" :value="address.country" :disabled="!stripeReady || busy" readonly outlined dense />
            </template>
            <v-alert v-if="actionError" type="error" text dense role="alert">
              {{ actionError }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text class="text-none" :disabled="!stripeReady || busy" @click="closeRegistration">Annuler</v-btn>
          <v-btn color="primary" class="text-none" :loading="busy" :disabled="!stripeReady || busy" @click="registerReader">
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
    busyOwner: 0,
    connectionVersion: 0,
    listLoaded: false,
    staffLoaded: false,
    servicePointsLoaded: false,
    loadAttempted: false,
    listError: '',
    actionError: '',
    dialogOpen: false,
    registrationCode: '',
    readerLabel: '',
    assignmentType: 'cashier',
    assignedUserId: null,
    assignedServicePointId: null,
    address: { line1: '', postalCode: '', city: '', country: 'FR' },
    editingReaderId: null,
    assignmentUserId: null,
    assignmentServicePointId: null,
  }),
  computed: {
    readers() {
      return this.$store.get('stripeTerminal/readers') || []
    },
    cashiers() {
      return (this.$store.get('staff/data') || []).filter(
        (user) => [0, 1].includes(Number(user.access)) && Number(user.status) === 1
      )
    },
    servicePoints() {
      return this.$store.get('servicePoints/items') || []
    },
    kioskServicePoints() {
      return this.servicePoints.filter(
        (point) => point && point.type === 'kiosk' && Number(point.is_active) === 1
      )
    },
    hasAssignableTarget() {
      return this.cashiers.length > 0 || this.kioskServicePoints.length > 0
    },
    assignmentTypeItems() {
      return [
        { text: 'Caissier', value: 'cashier' },
        { text: 'Borne', value: 'kiosk' },
      ]
    },
    selectedAssignmentId() {
      return this.assignmentType === 'kiosk'
        ? this.assignmentServicePointId
        : this.assignmentUserId
    },
    firstLocation() {
      return this.readers.length === 0
    },
  },
  watch: {
    stripeReady: {
      immediate: true,
      handler(ready) {
        if (ready) this.loadData()
        else this.resetConnection()
      },
    },
    dialogOpen(value) {
      if (!value) this.registrationCode = ''
    },
  },
  methods: {
    acquireBusy() {
      if (this.busy) return null
      this.busy = true
      return ++this.busyOwner
    },
    releaseBusy(owner) {
      if (this.busyOwner === owner) this.busy = false
    },
    resetConnection() {
      this.connectionVersion += 1
      this.busyOwner += 1
      this.busy = false
      this.closeRegistration()
      this.readerLabel = ''
      this.assignmentType = 'cashier'
      this.assignedUserId = null
      this.assignedServicePointId = null
      this.address = { line1: '', postalCode: '', city: '', country: 'FR' }
      this.editingReaderId = null
      this.assignmentUserId = null
      this.assignmentServicePointId = null
      this.listLoaded = false
      this.staffLoaded = false
      this.servicePointsLoaded = false
      this.loadAttempted = false
      this.listError = ''
    },
    required(value) {
      return Boolean(value && String(value).trim()) || 'Champ requis'
    },
    postalCodeRule(value) {
      return /^\d{5}$/.test(String(value || '')) || 'Code postal : 5 chiffres requis.'
    },
    async loadData() {
      if (!this.isAdmin || !this.stripeReady || this.loadAttempted || this.busy) return
      const owner = this.acquireBusy()
      const version = this.connectionVersion
      this.loadAttempted = true
      this.listError = ''
      try {
        const [readers, staff, servicePoints] = await Promise.all([
          this.$store.dispatch('stripeTerminal/getReaders'),
          this.$store.dispatch('staff/getAll', { silent: true }),
          this.$store.dispatch('servicePoints/getAll', { silent: true }),
        ])
        if (version !== this.connectionVersion || !this.stripeReady) return
        this.listLoaded = readers !== false
        this.staffLoaded = staff === true
        this.servicePointsLoaded = servicePoints !== false
        if (readers === false || !this.staffLoaded || !this.servicePointsLoaded) {
          this.listError = 'Impossible de charger les TPE ou les caissiers. Actualisez pour réessayer.'
        }
      } catch (error) {
        if (version === this.connectionVersion && this.stripeReady) {
          this.staffLoaded = false
          this.servicePointsLoaded = false
          this.listError = 'Impossible de charger les TPE ou les caissiers. Actualisez pour réessayer.'
        }
      } finally {
        this.releaseBusy(owner)
      }
    },
    async refreshReaders() {
      if (!this.isAdmin || !this.stripeReady || this.busy) return
      const owner = this.acquireBusy()
      const version = this.connectionVersion
      this.listError = ''
      try {
        const [readers, staff, servicePoints] = await Promise.all([
          this.$store.dispatch('stripeTerminal/refreshReaders'),
          this.$store.dispatch('staff/getAll', { silent: true }),
          this.$store.dispatch('servicePoints/getAll', { silent: true }),
        ])
        if (version !== this.connectionVersion || !this.stripeReady) return
        this.listLoaded = readers !== false
        this.staffLoaded = staff === true
        this.servicePointsLoaded = servicePoints !== false
        if (readers === false || !this.staffLoaded || !this.servicePointsLoaded) {
          this.listError = 'Actualisation impossible. Réessayez.'
        }
      } catch (error) {
        if (version === this.connectionVersion && this.stripeReady) {
          this.staffLoaded = false
          this.servicePointsLoaded = false
          this.listError = 'Actualisation impossible. Réessayez.'
        }
      } finally {
        this.releaseBusy(owner)
      }
    },
    cashierName(id) {
      const cashier = (this.$store.get('staff/data') || []).find(
        (item) => Number(item.id) === Number(id)
      )
      return cashier ? cashier.username : 'Non attribué'
    },
    kioskName(id) {
      const kiosk = this.kioskServicePoints.find(
        (item) => Number(item.id) === Number(id)
      )
      return kiosk ? kiosk.name : 'Non attribuée'
    },
    assignmentLabel(reader) {
      if (reader.assignedServicePointId) {
        return `Borne : ${this.kioskName(reader.assignedServicePointId)}`
      }
      return `Caissier : ${this.cashierName(reader.assignedUserId)}`
    },
    openRegistration() {
      if (!this.isAdmin || !this.stripeReady || !this.listLoaded || !this.staffLoaded || !this.servicePointsLoaded) return
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
      if (!this.isAdmin || !this.stripeReady || this.busy) {
        this.registrationCode = ''
        return
      }
      const owner = this.acquireBusy()
      const version = this.connectionVersion
      try {
        if (!this.$refs.registrationForm.validate()) return
        this.actionError = ''
        const payload = {
          registrationCode: this.registrationCode.trim(),
          label: this.readerLabel.trim(),
          ...(this.assignmentType === 'kiosk'
            ? { assignedServicePointId: this.assignedServicePointId }
            : { assignedUserId: this.assignedUserId }),
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
        if (version !== this.connectionVersion || !this.stripeReady) return
        if (result === false) {
          this.actionError = 'Connexion du TPE impossible. Vérifiez le code et réessayez.'
        } else {
          this.closeRegistration()
          this.readerLabel = ''
          this.assignmentType = 'cashier'
          this.assignedUserId = null
          this.assignedServicePointId = null
        }
      } catch (error) {
        if (version === this.connectionVersion && this.stripeReady) {
          this.actionError = 'Connexion du TPE impossible. Vérifiez le code et réessayez.'
        }
      } finally {
        if (version === this.connectionVersion) this.registrationCode = ''
        this.releaseBusy(owner)
      }
    },
    startAssignment(reader) {
      if (!this.isAdmin || !this.stripeReady || this.busy || !reader.isActive) return
      this.editingReaderId = reader.id
      this.assignmentType = reader.assignedServicePointId ? 'kiosk' : 'cashier'
      this.assignmentUserId = reader.assignedUserId
      this.assignmentServicePointId = reader.assignedServicePointId
      this.listError = ''
    },
    async assignReader(reader, assignedId) {
      if (!this.isAdmin || !this.stripeReady || this.busy || !reader.isActive || !assignedId) return
      const owner = this.acquireBusy()
      const version = this.connectionVersion
      this.listError = ''
      try {
        const result = await this.$store.dispatch('stripeTerminal/assignReader', {
          id: reader.id,
          ...(this.assignmentType === 'kiosk'
            ? { assignedServicePointId: assignedId }
            : { assignedUserId: assignedId }),
        })
        if (version !== this.connectionVersion || !this.stripeReady) return
        if (result === false) this.listError = 'Affectation impossible. Réessayez.'
        else this.editingReaderId = null
      } catch (error) {
        if (version === this.connectionVersion && this.stripeReady) {
          this.listError = 'Affectation impossible. Réessayez.'
        }
      } finally {
        this.releaseBusy(owner)
      }
    },
    async setReaderActive(reader) {
      if (!this.isAdmin || !this.stripeReady || this.busy) return
      const owner = this.acquireBusy()
      const version = this.connectionVersion
      this.listError = ''
      try {
        const result = await this.$store.dispatch('stripeTerminal/setReaderActive', {
          id: reader.id, isActive: !reader.isActive,
        })
        if (version !== this.connectionVersion || !this.stripeReady) return
        if (result === false) this.listError = 'Modification du TPE impossible. Réessayez.'
        else if (reader.isActive) this.editingReaderId = null
      } catch (error) {
        if (version === this.connectionVersion && this.stripeReady) {
          this.listError = 'Modification du TPE impossible. Réessayez.'
        }
      } finally {
        this.releaseBusy(owner)
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

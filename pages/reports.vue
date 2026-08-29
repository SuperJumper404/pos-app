<template>
  <v-container fluid class="reports-page full-width pa-5">
    <div class="reports-hero">
      <div class="reports-hero__title">
        <div class="reports-hero__icon">
          <v-icon>mdi-file-chart-check-outline</v-icon>
        </div>
        <div>
          <h1>Clôture Z</h1>
          <p>Ticket Z courant, paiements, TVA et historique des clôtures.</p>
        </div>
      </div>

      <v-btn
        color="primary"
        class="reports-refresh text-none"
        depressed
        :loading="loadPage"
        @click="refreshReports"
      >
        <v-icon small left>mdi-refresh</v-icon>
        Actualiser
      </v-btn>
    </div>

    <v-row class="reports-summary" dense>
      <v-col
        v-for="card in summaryCards"
        :key="card.label"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-card outlined class="reports-kpi" :class="card.className">
          <div class="reports-kpi__icon">
            <v-icon>{{ card.icon }}</v-icon>
          </div>
          <div>
            <div class="reports-kpi__label">{{ card.label }}</div>
            <div class="reports-kpi__value">{{ card.value }}</div>
            <div class="reports-kpi__hint">{{ card.hint }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-skeleton-loader
      v-if="loadPage"
      class="mt-5"
      type="card, table"
    ></v-skeleton-loader>

    <template v-else>
      <v-row class="mt-5" dense>
        <v-col cols="12" lg="5">
          <v-card outlined class="reports-panel reports-z-current">
            <div class="reports-panel__header">
              <div>
                <div class="reports-panel__title">
                  <v-icon color="primary" left>mdi-receipt-text-clock</v-icon>
                  Ticket Z courant
                </div>
                <div class="reports-panel__subtitle">
                  Aperçu de la période encore ouverte
                </div>
              </div>
              <v-chip small class="reports-status" :class="currentStatusClass">
                {{ currentStatusLabel }}
              </v-chip>
            </div>

            <div class="reports-current">
              <div class="reports-current__period">
                <span>Période</span>
                <strong>{{ formatClosurePeriod(currentClosure) }}</strong>
              </div>

              <div class="reports-current__metrics">
                <div>
                  <span>Commandes</span>
                  <strong>{{ currentClosure.orders_count || 0 }}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{{ formatCurrency(currentClosure.total_revenue || 0) }}</strong>
                </div>
              </div>
            </div>

            <v-card-actions class="reports-current__actions">
              <v-btn
                color="primary"
                class="reports-close-action text-none"
                depressed
                :loading="closingClosure"
                :disabled="closingClosure || !canCloseClosure"
                @click="closeClosureDialog = true"
              >
                <v-icon small left>mdi-lock-check</v-icon>
                Clôturer la caisse
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12" lg="7">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-card outlined class="reports-panel reports-panel--compact">
                <div class="reports-panel__header">
                  <div>
                    <div class="reports-panel__title">
                      <v-icon color="primary" left>mdi-credit-card-outline</v-icon>
                      Paiements
                    </div>
                    <div class="reports-panel__subtitle">
                      Répartition du Ticket Z courant
                    </div>
                  </div>
                </div>

                <v-data-table
                  :headers="paymentHeaders"
                  :items="paymentRows"
                  dense
                  :disable-sort="$vuetify.breakpoint.smAndDown"
                  hide-default-footer
                  class="reports-table"
                  no-data-text="Aucun paiement sur cette période"
                >
                  <template #[`item.payment`]="{ item }">
                    <strong>{{ formatPaymentLabel(item.payment) }}</strong>
                  </template>
                  <template #[`item.total`]="{ item }">
                    <div class="reports-bar-cell">
                      <v-progress-linear
                        :value="paymentWidth(item.total)"
                        height="8"
                        rounded
                        color="primary"
                        background-color="#e8edf3"
                      ></v-progress-linear>
                      <strong>{{ formatCurrency(item.total) }}</strong>
                    </div>
                  </template>
                </v-data-table>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card outlined class="reports-panel reports-panel--compact">
                <div class="reports-panel__header">
                  <div>
                    <div class="reports-panel__title">
                      <v-icon color="primary" left>mdi-percent-outline</v-icon>
                      TVA
                    </div>
                    <div class="reports-panel__subtitle">
                      TVA collectée par taux
                    </div>
                  </div>
                </div>

                <v-data-table
                  :headers="vatHeaders"
                  :items="vatRows"
                  dense
                  :disable-sort="$vuetify.breakpoint.smAndDown"
                  hide-default-footer
                  class="reports-table"
                  no-data-text="Aucune TVA sur cette période"
                >
                  <template #[`item.vat_rate`]="{ item }">
                    <v-chip small class="reports-vat-chip">
                      {{ formatVatRate(item.vat_rate) }}
                    </v-chip>
                  </template>
                  <template #[`item.total_vat`]="{ item }">
                    <strong>{{ formatCurrency(item.total_vat) }}</strong>
                  </template>
                </v-data-table>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <v-card outlined class="reports-panel reports-history mt-5">
        <div class="reports-panel__header">
          <div>
            <div class="reports-panel__title">
              <v-icon color="primary" left>mdi-archive-clock-outline</v-icon>
              Historique Z
            </div>
            <div class="reports-panel__subtitle">
              Tickets clôturés et prêts à consulter ou imprimer
            </div>
          </div>
        </div>

        <v-data-table
          :headers="closureHeaders"
          :items="closureHistory"
          item-key="id"
          dense
          :disable-sort="$vuetify.breakpoint.smAndDown"
          class="reports-table reports-history-table"
          no-data-text="Aucun Ticket Z clôturé"
        >
          <template #[`item.closure_number`]="{ item }">
            <div class="reports-ticket-number">
              <v-icon small color="primary">mdi-receipt-text-check</v-icon>
              <strong>Ticket Z #{{ item.closure_number }}</strong>
            </div>
          </template>
          <template #[`item.closed_at`]="{ item }">
            {{ formatClosureDate(item.closed_at) }}
          </template>
          <template #[`item.total_revenue`]="{ item }">
            <strong>{{ formatCurrency(item.total_revenue) }}</strong>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              icon
              small
              title="Voir le Ticket Z"
              :loading="loadingClosureDetail === item.id"
              @click="showClosureDetail(item)"
            >
              <v-icon small>mdi-eye</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <v-dialog v-model="closeClosureDialog" max-width="520">
      <v-card class="reports-dialog">
        <v-card-title class="reports-dialog__title">
          <v-icon color="primary" left>mdi-lock-check</v-icon>
          Clôturer la caisse
        </v-card-title>
        <v-card-text class="reports-dialog__copy">
          Cette action va creer un Ticket Z fige pour la periode courante.
        </v-card-text>
        <v-card-actions class="reports-dialog__actions">
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closeClosureDialog = false">
            Annuler
          </v-btn>
          <v-btn
            color="primary"
            class="text-none"
            depressed
            :loading="closingClosure"
            @click="confirmCloseClosure"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="closureDetailDialog" max-width="760">
      <v-card class="reports-detail">
        <div class="reports-detail__header">
          <div>
            <div class="reports-detail__title">
              Ticket Z #{{ selectedClosureDetail.closure_number || '-' }}
            </div>
            <div class="reports-detail__subtitle">
              Date de cloture :
              {{ formatClosureDate(selectedClosureDetail.closed_at) }}
            </div>
          </div>
          <v-btn icon small @click="closureDetailDialog = false">
            <v-icon small>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="reports-detail__body">
          <div class="reports-detail-summary">
            <div>
              <span>Période</span>
              <strong>{{ formatClosurePeriod(selectedClosureDetail) }}</strong>
            </div>
            <div>
              <span>Operateur</span>
              <strong>{{ formatClosureOperator(selectedClosureDetail) }}</strong>
            </div>
            <div>
              <span>Commandes</span>
              <strong>{{ selectedClosureDetail.orders_count || 0 }}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>
                {{ formatCurrency(selectedClosureDetail.total_revenue || 0) }}
              </strong>
            </div>
          </div>

          <v-row class="mt-4" dense>
            <v-col cols="12" md="6">
              <div class="reports-detail-section">
                <div class="reports-detail-section__title">Paiements</div>
                <v-simple-table dense>
                  <thead>
                    <tr>
                      <th>Methode</th>
                      <th class="text-right">Commandes</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in selectedClosurePaymentRows"
                      :key="item.payment"
                    >
                      <td>{{ formatPaymentLabel(item.payment) }}</td>
                      <td class="text-right">{{ item.orders_count }}</td>
                      <td class="text-right">{{ formatCurrency(item.total) }}</td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="reports-detail-section">
                <div class="reports-detail-section__title">TVA</div>
                <v-simple-table dense>
                  <thead>
                    <tr>
                      <th>Taux</th>
                      <th class="text-right">HT</th>
                      <th class="text-right">TVA</th>
                      <th class="text-right">TTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in selectedClosureDetail.vat_summary || []"
                      :key="item.vat_rate"
                    >
                      <td>{{ formatVatRate(item.vat_rate) }}</td>
                      <td class="text-right">{{ formatCurrency(item.total_ht) }}</td>
                      <td class="text-right">{{ formatCurrency(item.total_vat) }}</td>
                      <td class="text-right">{{ formatCurrency(item.total_ttc) }}</td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="reports-detail__actions">
          <v-btn text class="text-none" @click="printClosureDetail">
            <v-icon small left>mdi-printer</v-icon>
            Imprimer
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closureDetailDialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import formatdate from '@/helpers/formatdate'
import price from '@/helpers/price'
import { normalizePaymentSummary } from '@/helpers/paymentMethods'

export default {
  mixins: [formatdate, price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      closeClosureDialog: false,
      closingClosure: false,
      closureDetailDialog: false,
      loadingClosureDetail: null,
      selectedClosureDetail: {},
      paymentHeaders: [
        { text: 'Methode', value: 'payment' },
        { text: 'Total', value: 'total', sortable: false },
      ],
      vatHeaders: [
        { text: 'Taux', value: 'vat_rate' },
        { text: 'TVA', value: 'total_vat' },
      ],
      closureHeaders: [
        { text: 'Numero', value: 'closure_number' },
        { text: 'Date', value: 'closed_at' },
        { text: 'Commandes', value: 'orders_count' },
        { text: 'Total', value: 'total_revenue' },
        { text: '', value: 'actions', sortable: false },
      ],
    }
  },
  head() {
    return {
      title: `${
        this.$route.name.charAt(0).toUpperCase() + this.$route.name.slice(1)
      }`,
    }
  },
  computed: {
    currentClosure() {
      return this.$store.get('cashClosures/current') || {}
    },
    closureHistory() {
      return this.$store.get('cashClosures/history') || []
    },
    closureDetail() {
      return this.$store.get('cashClosures/detail') || {}
    },
    canCloseClosure() {
      return Number(this.currentClosure.orders_count || 0) > 0
    },
    paymentRows() {
      return normalizePaymentSummary(this.currentClosure.payments_summary || [])
    },
    selectedClosurePaymentRows() {
      return normalizePaymentSummary(
        this.selectedClosureDetail.payments_summary || []
      )
    },
    vatRows() {
      return this.currentClosure.vat_summary || []
    },
    maxPaymentTotal() {
      return Math.max(0, ...this.paymentRows.map((item) => Number(item.total) || 0))
    },
    currentStatusLabel() {
      return this.canCloseClosure ? 'Prêt à clôturer' : 'En attente'
    },
    currentStatusClass() {
      return this.canCloseClosure
        ? 'reports-status--success'
        : 'reports-status--neutral'
    },
    summaryCards() {
      return [
        {
          label: 'Ticket courant',
          value: this.formatCurrency(this.currentClosure.total_revenue || 0),
          hint: 'Total à figer',
          icon: 'mdi-cash-register',
          className: 'reports-kpi--revenue',
        },
        {
          label: 'Commandes',
          value: this.currentClosure.orders_count || 0,
          hint: 'Sur la période ouverte',
          icon: 'mdi-silverware-fork-knife',
          className: 'reports-kpi--orders',
        },
        {
          label: 'Paiements',
          value: this.paymentRows.length,
          hint: 'Moyens encaissés',
          icon: 'mdi-credit-card-check-outline',
          className: 'reports-kpi--payments',
        },
        {
          label: 'Tickets Z',
          value: this.closureHistory.length,
          hint: 'Historique clôturé',
          icon: 'mdi-archive-check-outline',
          className: 'reports-kpi--history',
        },
      ]
    },
  },
  mounted() {
    this.refreshReports()
  },
  methods: {
    refreshReports() {
      this.loadPage = true
      return Promise.all([
        this.$store.dispatch('cashClosures/getCurrent'),
        this.$store.dispatch('cashClosures/getHistory'),
      ]).finally(() => {
        this.loadPage = false
      })
    },
    formatClosureDate(value) {
      if (!value) return '-'
      return new Date(value).toLocaleString('fr-FR')
    },
    formatClosurePeriod(closure) {
      if (!closure || !closure.opened_at) return 'Aucune commande à clôturer'
      const openedAt = this.formatClosureDate(closure.opened_at)
      const closedAt = closure.closed_at
        ? this.formatClosureDate(closure.closed_at)
        : 'En cours'
      return `${openedAt} - ${closedAt}`
    },
    formatClosureOperator(closure) {
      return closure.closed_by_name || closure.closed_by_user_id || '-'
    },
    formatPaymentLabel(value) {
      return value || 'Non renseigné'
    },
    formatVatRate(value) {
      if (value === null || value === undefined || value === '') return '-'
      return String(value).includes('%') ? value : `${value}%`
    },
    paymentWidth(value) {
      if (!this.maxPaymentTotal) return 0
      return Math.min(100, ((Number(value) || 0) / this.maxPaymentTotal) * 100)
    },
    printClosureDetail() {
      if (process.client) window.print()
    },
    async showClosureDetail(closure) {
      this.loadingClosureDetail = closure.id
      const ok = await this.$store.dispatch('cashClosures/getDetail', closure.id)
      if (ok) {
        this.selectedClosureDetail = this.closureDetail
        this.closureDetailDialog = true
      }
      this.loadingClosureDetail = null
    },
    async confirmCloseClosure() {
      if (this.closingClosure || !this.canCloseClosure) return
      this.closingClosure = true
      const ok = await this.$store.dispatch('cashClosures/closeCurrent')
      if (ok) {
        this.closeClosureDialog = false
        await this.refreshReports()
      }
      this.closingClosure = false
    },
  },
}
</script>

<style scoped>
.reports-page {
  background: #f7f9fc;
  min-height: calc(100vh - 64px);
}

.reports-hero {
  align-items: center;
  background: var(--se-color-surface);
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-md);
  display: flex;
  gap: var(--se-space-4);
  justify-content: space-between;
  padding: 18px 20px;
}

.reports-hero__title {
  align-items: center;
  display: flex;
  gap: var(--se-space-4);
  min-width: 0;
}

.reports-hero__icon,
.reports-kpi__icon {
  align-items: center;
  border-radius: var(--se-radius-lg);
  display: flex;
  flex: 0 0 44px;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.reports-hero__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.reports-hero h1 {
  color: var(--se-color-text);
  font-size: var(--se-font-page-title);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin: 0;
}

.reports-hero p {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-small);
  margin: 4px 0 0;
}

.reports-refresh,
.reports-close-action {
  border-radius: var(--se-radius-sm) !important;
  min-height: 38px;
}

.reports-refresh {
  min-width: 128px;
}

.reports-summary {
  margin-top: var(--se-space-5);
}

.reports-kpi {
  align-items: center;
  border-color: var(--se-color-border) !important;
  display: flex;
  gap: 14px;
  min-height: 112px;
  padding: 18px;
}

.reports-kpi__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-semibold);
}

.reports-kpi__value {
  color: var(--se-color-text);
  font-size: 24px;
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
  margin-top: 4px;
}

.reports-kpi__hint {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  margin-top: 4px;
}

.reports-kpi--revenue .reports-kpi__icon {
  background: var(--se-color-success-soft);
  color: var(--se-color-success);
}

.reports-kpi--orders .reports-kpi__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}

.reports-kpi--payments .reports-kpi__icon {
  background: var(--se-color-warning-soft);
  color: var(--se-color-warning);
}

.reports-kpi--history .reports-kpi__icon {
  background: var(--se-color-brand-purple-soft);
  color: var(--se-color-brand-purple);
}

.reports-panel {
  border-color: var(--se-color-border) !important;
  height: 100%;
  overflow: hidden;
}

.reports-panel__header {
  align-items: center;
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  gap: var(--se-space-3);
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.reports-panel__title {
  align-items: center;
  color: var(--se-color-text);
  display: flex;
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-semibold);
}

.reports-panel__subtitle {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  margin-top: 4px;
}

.reports-status,
.reports-vat-chip {
  border-radius: var(--se-radius-pill) !important;
  font-weight: var(--se-weight-bold);
}

.reports-status--success {
  background: var(--se-color-success-soft) !important;
  color: #007a3d !important;
}

.reports-status--neutral {
  background: var(--se-color-surface-muted) !important;
  color: var(--se-color-text-muted) !important;
}

.reports-current {
  padding: 18px 20px 0;
}

.reports-current__period {
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  padding: 14px 16px;
}

.reports-current__period span,
.reports-current__metrics span,
.reports-detail-summary span {
  color: var(--se-color-text-muted);
  display: block;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-semibold);
}

.reports-current__period strong {
  color: var(--se-color-text);
  display: block;
  font-size: var(--se-font-small);
  margin-top: 4px;
}

.reports-current__metrics {
  display: grid;
  gap: var(--se-space-3);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: var(--se-space-3);
}

.reports-current__metrics div {
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  padding: 14px 16px;
}

.reports-current__metrics strong {
  color: var(--se-color-text);
  display: block;
  font-size: var(--se-font-title);
  line-height: var(--se-line-tight);
  margin-top: 4px;
}

.reports-current__actions {
  padding: 18px 20px;
}

.reports-close-action {
  width: 100%;
}

.reports-table {
  color: var(--se-color-text-body);
}

.reports-bar-cell {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(80px, 1fr) auto;
  min-width: 150px;
}

.reports-vat-chip {
  background: var(--se-color-primary-soft) !important;
  color: var(--se-color-primary) !important;
}

.reports-history {
  height: auto;
}

.reports-ticket-number {
  align-items: center;
  display: flex;
  gap: var(--se-space-2);
  min-width: 150px;
}

.reports-dialog,
.reports-detail {
  border-radius: var(--se-radius-md) !important;
}

.reports-dialog__title {
  color: var(--se-color-text);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-semibold);
}

.reports-dialog__copy {
  color: var(--se-color-text-body);
}

.reports-dialog__actions,
.reports-detail__actions {
  border-top: 1px solid var(--se-color-border-soft);
  padding: 12px 20px;
}

.reports-detail__header {
  align-items: flex-start;
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  gap: var(--se-space-3);
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.reports-detail__title {
  color: var(--se-color-text);
  font-size: var(--se-font-title);
  font-weight: var(--se-weight-bold);
  line-height: var(--se-line-tight);
}

.reports-detail__subtitle {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  margin-top: 4px;
}

.reports-detail__body {
  padding: 18px 20px !important;
}

.reports-detail-summary {
  display: grid;
  gap: var(--se-space-3);
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.reports-detail-summary div,
.reports-detail-section {
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-md);
  padding: 14px 16px;
}

.reports-detail-summary strong {
  color: var(--se-color-text);
  display: block;
  font-size: var(--se-font-small);
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.reports-detail-section {
  height: 100%;
}

.reports-detail-section__title {
  color: var(--se-color-text);
  font-size: var(--se-font-small);
  font-weight: var(--se-weight-bold);
  margin-bottom: var(--se-space-2);
}

@media (max-width: 960px) {
  .reports-detail-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .reports-hero,
  .reports-hero__title,
  .reports-panel__header {
    align-items: stretch;
    flex-direction: column;
  }

  .reports-refresh {
    width: 100%;
  }

  .reports-current__metrics,
  .reports-detail-summary {
    grid-template-columns: 1fr;
  }

  .reports-bar-cell {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .reports-kpi,
  .reports-panel,
  .reports-close-action {
    transition:
      border-color var(--se-transition-fast),
      transform var(--se-transition-fast);
  }

  .reports-kpi:hover,
  .reports-panel:hover {
    border-color: var(--se-color-primary) !important;
    transform: translateY(-1px);
  }

  .reports-close-action:hover {
    transform: translateY(-1px);
  }
}
</style>

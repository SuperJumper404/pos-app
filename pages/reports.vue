<template>
  <v-container>
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>

    <v-card v-else outlined class="mt-5">
      <v-card-title>Clôture Z</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-card outlined>
              <v-card-title>Ticket Z courant</v-card-title>
              <v-card-text>
                <div>Periode : {{ formatClosurePeriod(currentClosure) }}</div>
                <div>Commandes : {{ currentClosure.orders_count || 0 }}</div>
                <div>
                  Total : {{ formatCurrency(currentClosure.total_revenue || 0) }}
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="primary"
                  class="text-none"
                  :loading="closingClosure"
                  :disabled="closingClosure || !canCloseClosure"
                  @click="closeClosureDialog = true"
                >
                  Clôturer la caisse
                  <v-icon small right>mdi-lock-check</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card outlined>
              <v-card-title>Paiements</v-card-title>
              <v-simple-table dense>
                <tbody>
                  <tr
                    v-for="item in currentClosure.payments_summary || []"
                    :key="item.payment"
                  >
                    <td>{{ item.payment }}</td>
                    <td class="text-right">{{ formatCurrency(item.total) }}</td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card outlined>
              <v-card-title>TVA</v-card-title>
              <v-simple-table dense>
                <tbody>
                  <tr
                    v-for="item in currentClosure.vat_summary || []"
                    :key="item.vat_rate"
                  >
                    <td>{{ item.vat_rate }}</td>
                    <td class="text-right">
                      {{ formatCurrency(item.total_vat) }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-title>Historique Z</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="closureHeaders"
          :items="closureHistory"
          item-key="id"
        >
          <template #[`item.closure_number`]="{ item }">
            Ticket Z #{{ item.closure_number }}
          </template>
          <template #[`item.closed_at`]="{ item }">
            {{ formatClosureDate(item.closed_at) }}
          </template>
          <template #[`item.total_revenue`]="{ item }">
            {{ formatCurrency(item.total_revenue) }}
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
      </v-card-text>
    </v-card>

    <v-dialog v-model="closeClosureDialog" max-width="520">
      <v-card>
        <v-card-title>Clôturer la caisse</v-card-title>
        <v-card-text>
          Cette action va creer un Ticket Z fige pour la periode courante.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="closeClosureDialog = false">
            Annuler
          </v-btn>
          <v-btn
            color="primary"
            class="text-none"
            :loading="closingClosure"
            @click="confirmCloseClosure"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="closureDetailDialog" max-width="520">
      <v-card>
        <v-card-title>
          Ticket Z #{{ selectedClosureDetail.closure_number || '-' }}
        </v-card-title>
        <v-card-text>
          <div>
            Periode : {{ formatClosurePeriod(selectedClosureDetail) }}
          </div>
          <div>
            Date de cloture :
            {{ formatClosureDate(selectedClosureDetail.closed_at) }}
          </div>
          <div>
            Operateur : {{ formatClosureOperator(selectedClosureDetail) }}
          </div>
          <div>Commandes : {{ selectedClosureDetail.orders_count || 0 }}</div>
          <div>
            Total : {{ formatCurrency(selectedClosureDetail.total_revenue || 0) }}
          </div>
          <v-divider class="my-4"></v-divider>
          <div class="font-weight-medium">Paiements</div>
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
                v-for="item in selectedClosureDetail.payments_summary || []"
                :key="item.payment"
              >
                <td>{{ item.payment }}</td>
                <td class="text-right">{{ item.orders_count }}</td>
                <td class="text-right">{{ formatCurrency(item.total) }}</td>
              </tr>
            </tbody>
          </v-simple-table>
          <v-divider class="my-4"></v-divider>
          <div class="font-weight-medium">TVA</div>
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
                <td>{{ item.vat_rate }}</td>
                <td class="text-right">{{ formatCurrency(item.total_ht) }}</td>
                <td class="text-right">{{ formatCurrency(item.total_vat) }}</td>
                <td class="text-right">{{ formatCurrency(item.total_ttc) }}</td>
              </tr>
            </tbody>
          </v-simple-table>
        </v-card-text>
        <v-card-actions>
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
  },
  mounted() {
    this.loadPage = true
    Promise.all([
      this.$store.dispatch('cashClosures/getCurrent'),
      this.$store.dispatch('cashClosures/getHistory'),
    ]).finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    formatClosureDate(value) {
      if (!value) return '-'
      return new Date(value).toLocaleString('fr-FR')
    },
    formatClosurePeriod(closure) {
      if (!closure || !closure.opened_at) return 'Aucune commande à clôturer'
      return `${this.formatClosureDate(closure.opened_at)} - ${this.formatClosureDate(closure.closed_at)}`
    },
    formatClosureOperator(closure) {
      return closure.closed_by_name || closure.closed_by_user_id || '-'
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
        await Promise.all([
          this.$store.dispatch('cashClosures/getCurrent'),
          this.$store.dispatch('cashClosures/getHistory'),
        ])
      }
      this.closingClosure = false
    },
  },
}
</script>

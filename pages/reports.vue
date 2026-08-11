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
      <v-tabs v-model="activeTab" background-color="grey lighten-4">
        <v-tab class="text-none">Commandes</v-tab>
        <v-tab class="text-none">Cloture Z</v-tab>
        <v-tab class="text-none">Historique Z</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <v-tab-item>
          <v-app-bar flat color="grey lighten-4" light>
            <v-spacer></v-spacer>
            <div class="mt-6">
              <v-text-field
                type="number"
                placeholder="Rechercher un numéro de commande"
                label="Rechercher"
                outlined
                dense
                append-icon="mdi-card-search"
                @keyup="searchData()"
              ></v-text-field>
            </div>
          </v-app-bar>
          <v-simple-table fixed-header height="300px">
            <template #default>
              <thead>
                <tr>
                  <th class="text-left">Date</th>
                  <th class="text-left">Numéro de commande</th>
                  <th class="text-left">Client</th>
                  <th class="text-left">Opérateur</th>
                  <th class="text-left">Total</th>
                  <th class="text-left">Paiement</th>
                  <th class="text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="dataOrders.length === 0">
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>Commande</td>
                  <td>Aucune commande</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
                <tr v-for="item in dataOrders" v-else :key="item.name">
                  <td>{{ setFormatDate(item.created) }}</td>
                  <td>{{ item.ordernumber }}</td>
                  <td>{{ item.customer }}</td>
                  <td>{{ item.operator ? item.operator : '-' }}</td>
                  <td>{{ formatCurrency(item.subtotal) }}</td>
                  <td>{{ item.payment }}</td>
                  <td>{{ item.status === 1 ? 'En attente' : 'Approuvée' }}</td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>
        </v-tab-item>

        <v-tab-item>
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
                      Cloturer la caisse
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
        </v-tab-item>

        <v-tab-item>
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
            </v-data-table>
          </v-card-text>
        </v-tab-item>
      </v-tabs-items>
    </v-card>

    <v-dialog v-model="closeClosureDialog" max-width="520">
      <v-card>
        <v-card-title>Cloturer la caisse</v-card-title>
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
      activeTab: 0,
      closeClosureDialog: false,
      closingClosure: false,
      closureHeaders: [
        { text: 'Numero', value: 'closure_number' },
        { text: 'Date', value: 'closed_at' },
        { text: 'Commandes', value: 'orders_count' },
        { text: 'Total', value: 'total_revenue' },
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
    dataOrders() {
      return this.$store.get('orders/dataOrders')
    },
    currentClosure() {
      return this.$store.get('cashClosures/current') || {}
    },
    closureHistory() {
      return this.$store.get('cashClosures/history') || []
    },
    canCloseClosure() {
      return Number(this.currentClosure.orders_count || 0) > 0
    },
  },
  mounted() {
    this.loadPage = true
    Promise.all([
      this.$store.dispatch('orders/getAllOrder'),
      this.$store.dispatch('cashClosures/getCurrent'),
      this.$store.dispatch('cashClosures/getHistory'),
    ]).finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    searchData() {
      this.$store.dispatch('orders/getAllOrder')
    },
    formatClosureDate(value) {
      if (!value) return '-'
      return new Date(value).toLocaleString('fr-FR')
    },
    formatClosurePeriod(closure) {
      if (!closure || !closure.opened_at) return 'Aucune commande a cloturer'
      return `${this.formatClosureDate(closure.opened_at)} - ${this.formatClosureDate(closure.closed_at)}`
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

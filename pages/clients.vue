<template>
  <v-container fluid class="pa-5">
    <v-alert v-model="errMsg" outlined text type="error">
      <v-row align="center" no-gutters>
        <v-col class="grow">
          {{ message }}
        </v-col>
        <v-spacer></v-spacer>
        <v-col class="shrink">
          <v-btn icon small @click="errMsg = false">
            <v-icon>mdi-close-circle-outline</v-icon>
          </v-btn>
        </v-col>
      </v-row>
    </v-alert>

    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>

    <div v-else>
      <v-row dense class="clients-metrics mt-5">
        <v-col
          v-for="metric in metricsCards"
          :key="metric.label"
          cols="12"
          sm="6"
          md="3"
        >
          <v-card outlined class="clients-metric pa-3">
            <div class="clients-metric__header">
              <v-icon color="primary">{{ metric.icon }}</v-icon>
              <div class="clients-metric__label">{{ metric.label }}</div>
            </div>
            <div class="clients-metric__value">{{ metric.value }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card outlined class="mt-3">
      <v-app-bar flat color="grey lighten-4" light>
        <v-spacer></v-spacer>
        <v-text-field
          v-model="searchFilter"
          style="max-width: 320px"
          placeholder="Rechercher un telephone ou un nom"
          outlined
          dense
          hide-details
          append-icon="mdi-card-search"
        ></v-text-field>
        <v-btn
          color="primary"
          class="ml-3 text-none"
          :disabled="!clientRows.length"
          @click="downloadClientsCsv"
        >
          Telecharger CSV
          <v-icon small right>mdi-download</v-icon>
        </v-btn>
      </v-app-bar>

      <v-data-table
        :headers="headers"
        :items="clientRows"
        :search="searchFilter"
        :custom-filter="customFilter"
        :sort-by="['lastVisitDays']"
        :sort-desc="[false]"
        :hide-default-header="$vuetify.breakpoint.smAndDown"
      >
        <template #[`item.phone`]="{ item }">
          <a :href="`tel:${item.phoneKey}`" class="clients-phone">
            {{ item.phone }}
          </a>
        </template>

        <template #[`item.topNames`]="{ item }">
          <div class="clients-names">
            <v-chip
              v-for="name in item.topNames"
              :key="`${item.phoneKey}-${name}`"
              small
              class="ma-1"
            >
              {{ name }}
            </v-chip>
            <span v-if="!item.topNames.length">-</span>
          </div>
        </template>

        <template #[`item.totalSpent`]="{ item }">
          {{ formatCurrency(item.totalSpent) }}
        </template>

        <template #[`item.averageSpent`]="{ item }">
          {{ formatCurrency(item.averageSpent) }}
        </template>

        <template #[`item.firstOrderAt`]="{ item }">
          {{ formatDate(item.firstOrderAt) }}
        </template>

        <template #[`item.lastVisitDays`]="{ item }">
          {{ item.lastVisitLabel }}
        </template>
      </v-data-table>
      </v-card>
    </div>
  </v-container>
</template>

<script>
import moment from 'moment'
import Loading from '@/components/loading'
import price from '@/helpers/price'
const {
  buildArchivedClientRows,
  buildArchivedClientsCsv,
  buildArchivedClientsMetrics,
} = require('@/helpers/clients')

export default {
  components: { Loading },
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      errMsg: false,
      searchFilter: '',
      headers: [
        { text: 'Telephone', value: 'phone', filterable: true },
        { text: 'Top 3 noms', value: 'topNames', filterable: true },
        { text: 'Commandes', value: 'orderCount', filterable: false },
        { text: 'Total depense', value: 'totalSpent', filterable: false },
        { text: 'Panier moyen', value: 'averageSpent', filterable: false },
        { text: 'Premiere commande', value: 'firstOrderAt', filterable: false },
        { text: 'Derniere visite', value: 'lastVisitDays', filterable: false },
      ],
    }
  },
  computed: {
    archivedOrders() {
      return this.$store.get('history/dataArchivedOrders') || []
    },
    message() {
      return this.$store.get('history/message')
    },
    clientRows() {
      return buildArchivedClientRows(this.archivedOrders)
    },
    clientsMetrics() {
      return buildArchivedClientsMetrics(this.archivedOrders, this.clientRows)
    },
    metricsCards() {
      return [
        {
          icon: 'mdi-account-multiple-outline',
          label: 'Nombre de client',
          value: this.clientsMetrics.clientCount,
        },
        {
          icon: 'mdi-phone-check-outline',
          label: 'Commandes avec numero',
          value: this.clientsMetrics.phoneCoverageRatio,
        },
        {
          icon: 'mdi-account-clock-outline',
          label: 'Clients inactifs',
          value: this.clientsMetrics.inactiveOver30Days,
        },
        {
          icon: 'mdi-repeat',
          label: 'Taux de retour',
          value: this.clientsMetrics.returnRateLabel,
        },
      ]
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('history/getAllArchivedOrders').then((success) => {
      if (!success) this.errMsg = true
      this.loadPage = false
    })
  },
  methods: {
    formatDate(date) {
      return date ? moment(new Date(date)).format('DD/MM/YYYY') : '-'
    },
    customFilter(value, search, item) {
      if (!search) return true
      const text = String(item && item.searchText ? item.searchText : '')
      return text.toLowerCase().includes(String(search).toLowerCase())
    },
    downloadClientsCsv() {
      const csv = buildArchivedClientsCsv(this.clientRows)
      const blob = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'mes-clients.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
  },
}
</script>

<style scoped>
.clients-phone {
  color: inherit;
  font-weight: 700;
  text-decoration: none;
}

.clients-names {
  min-width: 180px;
}

.clients-metric {
  height: 100%;
}

.clients-metric__header {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.clients-metric__label {
  color: rgba(0, 0, 0, 0.58);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
}

.clients-metric__value {
  color: rgba(0, 0, 0, 0.86);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 6px;
}

::v-deep .v-data-table-header th {
  white-space: nowrap;
  vertical-align: middle;
}

::v-deep .v-data-table td {
  vertical-align: middle;
}
</style>

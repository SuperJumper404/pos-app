<template>
  <v-card v-if="items.length" outlined class="vat-breakdown">
    <v-card-title class="py-3 text-subtitle-2">Ventilation TVA</v-card-title>
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
        <tr v-for="item in items" :key="item.vatRate">
          <td>{{ formatRate(item.vatRate) }}</td>
          <td class="text-right">{{ formatCurrency(item.totalHt) }}</td>
          <td class="text-right">{{ formatCurrency(item.totalVat) }}</td>
          <td class="text-right font-weight-bold">
            {{ formatCurrency(item.totalTtc) }}
          </td>
        </tr>
      </tbody>
    </v-simple-table>
  </v-card>
</template>

<script>
import price from '@/helpers/price'
import { normalizeVatBreakdown } from '@/helpers/vat'

export default {
  mixins: [price],
  props: {
    details: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    items() {
      return normalizeVatBreakdown(this.details)
    },
  },
  methods: {
    formatRate(value) {
      return `${String(value).replace('.', ',')} %`
    },
  },
}
</script>

<style scoped>
.vat-breakdown {
  border-radius: 12px !important;
}
</style>

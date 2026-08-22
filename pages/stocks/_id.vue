<template>
  <v-container>
    <Loading v-if="loading" />
    <div v-else-if="item">
      <v-card outlined class="mb-4">
        <v-card-title>{{ item.name }}</v-card-title>
        <v-card-text>
          <div>Stock: {{ item.current_stock }} {{ item.unit }}</div>
          <div>Seuil minimum: {{ item.minimum_stock }}</div>
          <div>Stock cible: {{ item.target_stock }}</div>
          <div>Prix moyen: {{ formatEstimatedPrice(item.average_unit_price) }}</div>
        </v-card-text>
      </v-card>
      <v-data-table :headers="headers" :items="movements">
        <template #[`item.movement_type`]="{ item: movement }">
          <span>{{ movementLabel(movement.movement_type) }}</span>
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'
import { formatEstimatedPrice } from '@/helpers/stockInventory'

export default {
  components: { Loading },
  middleware: 'auth',
  data: () => ({
    loading: false,
    headers: [
      { text: 'Date', value: 'created_at' },
      { text: 'Type', value: 'movement_type' },
      { text: 'Quantite', value: 'quantity' },
      { text: 'Stock avant', value: 'previous_stock' },
      { text: 'Stock apres', value: 'new_stock' },
      { text: 'Fournisseur', value: 'supplier' },
      { text: 'Prix unitaire', value: 'unit_price' },
      { text: 'Prix total', value: 'total_price' },
    ],
  }),
  computed: {
    item() { return this.$store.get('stockInventory/detailItem') },
    movements() { return this.$store.get('stockInventory/movements') || [] },
  },
  mounted() { this.load() },
  methods: {
    formatEstimatedPrice,
    movementLabel(type) {
      return type === 'replenishment' ? 'Reapprovisionnement' : type === 'inventory' ? 'Inventaire' : type
    },
    async load() {
      this.loading = true
      await this.$store.dispatch('stockInventory/getItemDetail', this.$route.params.id)
      this.loading = false
    },
  },
}
</script>

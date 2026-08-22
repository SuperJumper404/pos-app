<template>
  <v-container>
    <v-card outlined>
      <v-card-title class="pb-0">
        Stock
        <v-spacer />
        <v-btn color="primary" class="text-none mr-2" @click="ingredientDialog = true">
          <v-icon left>mdi-plus</v-icon>
          Ajouter un ingredient
        </v-btn>
        <v-text-field v-model="search" label="Rechercher" append-icon="mdi-magnify" dense outlined hide-details class="stock-search" />
      </v-card-title>
      <v-tabs v-model="activeTab">
        <v-tab>Produits</v-tab>
        <v-tab>Ingredients</v-tab>
        <v-tab>Stocks bas</v-tab>
        <v-tab>Liste de courses</v-tab>
        <v-tab>Inventaire</v-tab>
      </v-tabs>
      <v-tabs-items v-model="activeTab">
        <v-tab-item>
          <v-data-table :headers="itemHeaders" :items="products" :loading="loading">
            <template #[`item.status`]="{ item }"><v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip></template>
            <template #[`item.actions`]="{ item }"><v-btn icon :to="`/stocks/${item.id}`" aria-label="Voir le detail"><v-icon>mdi-eye</v-icon></v-btn></template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item>
          <v-data-table :headers="itemHeaders" :items="ingredients" :loading="loading">
            <template #[`item.status`]="{ item }"><v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip></template>
            <template #[`item.actions`]="{ item }"><v-btn icon :to="`/stocks/${item.id}`" aria-label="Voir le detail"><v-icon>mdi-eye</v-icon></v-btn></template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item>
          <v-data-table :headers="itemHeaders" :items="lowItems" :loading="loading">
            <template #[`item.status`]="{ item }"><v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip></template>
            <template #[`item.actions`]="{ item }"><v-btn icon aria-label="Reapprovisionner" @click="openReplenish(item)"><v-icon>mdi-package-up</v-icon></v-btn></template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item>
          <div class="pa-4"><v-btn color="primary" class="text-none" @click="generateShoppingList">Generer la liste</v-btn></div>
          <v-data-table :headers="shoppingHeaders" :items="shoppingList" :loading="loading">
            <template #[`item.taken`]="{ item }"><v-checkbox :input-value="Boolean(Number(item.taken))" label="Pris" hide-details class="mt-0" @change="toggleTaken(item)" /></template>
            <template #[`item.estimated_unit_price`]="{ item }">{{ formatEstimatedPrice(item.estimated_unit_price) || 'Non renseigne' }}</template>
            <template #[`item.estimated_total_price`]="{ item }">{{ formatEstimatedPrice(item.estimated_total_price) || 'Non renseigne' }}</template>
            <template #[`item.actions`]="{ item }"><v-btn small color="primary" class="text-none" @click="openReplenish(item)">Reapprovisionner</v-btn></template>
          </v-data-table>
        </v-tab-item>
        <v-tab-item>
          <v-data-table :headers="inventoryHeaders" :items="filteredItems" :loading="loading">
            <template #[`item.actions`]="{ item }"><v-btn small color="primary" class="text-none" @click="openInventory(item)">Inventorier</v-btn></template>
          </v-data-table>
        </v-tab-item>
      </v-tabs-items>
    </v-card>

    <v-dialog v-model="ingredientDialog" max-width="720">
      <v-card>
        <v-card-title>Ajouter un ingredient</v-card-title>
        <v-card-text>
          <v-text-field v-model="ingredientForm.name" label="Nom" />
          <v-combobox v-model="ingredientForm.unit" :items="units" label="Unite" />
          <v-row>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.current_stock" label="Stock actuel" type="number" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.minimum_stock" label="Seuil minimum" type="number" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.target_stock" label="Stock cible" type="number" /></v-col>
          </v-row>
          <v-text-field v-model="ingredientForm.category_label" label="Categorie" />
          <v-text-field v-model="ingredientForm.reference" label="Reference" />
          <v-text-field v-model="ingredientForm.default_supplier" label="Fournisseur par defaut" />
          <v-textarea v-model="ingredientForm.note" label="Note" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="ingredientDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="createIngredient">Ajouter</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="replenishDialog" max-width="560">
      <v-card>
        <v-card-title>Reapprovisionner</v-card-title>
        <v-card-text>
          <v-text-field v-model="replenishForm.quantity" label="Quantite" type="number" />
          <v-text-field v-model="replenishForm.supplier" label="Fournisseur" />
          <v-text-field v-model="replenishForm.unit_price" label="Prix unitaire" type="number" />
          <v-text-field v-model="replenishForm.total_price" label="Prix total" type="number" />
          <v-textarea v-model="replenishForm.remark" label="Remarque" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="replenishDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="replenishItem">Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="inventoryDialog" max-width="560">
      <v-card>
        <v-card-title>Inventaire</v-card-title>
        <v-card-text><v-text-field v-model="inventoryForm.quantity" label="Quantite constatee" type="number" /><v-textarea v-model="inventoryForm.remark" label="Remarque" /></v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="inventoryDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="inventoryItem">Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { getStockStatus, sortShoppingListItems, formatEstimatedPrice } from '@/helpers/stockInventory'

export default {
  middleware: 'auth',
  data: () => ({
    activeTab: 0, search: '', loading: false, ingredientDialog: false, replenishDialog: false, inventoryDialog: false, selectedItem: null,
    units: ['piece', 'kg', 'g', 'l', 'ml'],
    itemHeaders: [{ text: 'Nom', value: 'name' }, { text: 'Stock', value: 'current_stock' }, { text: 'Unite', value: 'unit' }, { text: 'Minimum', value: 'minimum_stock' }, { text: 'Cible', value: 'target_stock' }, { text: 'Statut', value: 'status' }, { text: '', value: 'actions', sortable: false }],
    shoppingHeaders: [{ text: 'Article', value: 'name' }, { text: 'A acheter', value: 'quantity_to_buy' }, { text: 'Unite', value: 'unit' }, { text: 'Prix unitaire', value: 'estimated_unit_price' }, { text: 'Prix total', value: 'estimated_total_price' }, { text: 'Pris', value: 'taken', sortable: false }, { text: '', value: 'actions', sortable: false }],
    inventoryHeaders: [{ text: 'Article', value: 'name' }, { text: 'Stock theorique', value: 'current_stock' }, { text: 'Unite', value: 'unit' }, { text: '', value: 'actions', sortable: false }],
    ingredientForm: { name: '', unit: 'piece', current_stock: 0, minimum_stock: 1, target_stock: 1, category_label: '', reference: '', default_supplier: '', note: '' },
    replenishForm: { quantity: 1, supplier: '', unit_price: '', total_price: '', remark: '' },
    inventoryForm: { quantity: 0, remark: '' },
  }),
  computed: {
    items() { return this.$store.get('stockInventory/dataItems') || [] },
    products() { return this.items.filter((item) => item.item_type === 'product') },
    ingredients() { return this.items.filter((item) => item.item_type === 'ingredient') },
    lowItems() { return this.filteredItems.filter((item) => getStockStatus(item) !== 'normal') },
    shoppingList() { return sortShoppingListItems(this.$store.get('stockInventory/shoppingList') || []) },
    filteredItems() {
      const term = this.search.trim().toLowerCase()
      if (!term) return this.items
      return this.items.filter((item) => String(item.name || '').toLowerCase().includes(term))
    },
  },
  mounted() { this.loadStock() },
  methods: {
    getStockStatus, formatEstimatedPrice,
    statusColor(item) {
      const status = getStockStatus(item)
      return status === 'red' ? 'red' : status === 'orange' ? 'orange' : 'grey'
    },
    statusLabel(item) {
      const status = getStockStatus(item)
      return status === 'red' ? 'Sous le minimum' : status === 'orange' ? 'Sous la cible' : 'Normal'
    },
    async loadStock() {
      this.loading = true
      await Promise.all([this.$store.dispatch('stockInventory/getItems'), this.$store.dispatch('stockInventory/getShoppingList')])
      this.loading = false
    },
    async createIngredient() {
      const success = await this.$store.dispatch('stockInventory/createIngredient', this.ingredientForm)
      if (success) { this.ingredientDialog = false; await this.loadStock() }
    },
    async generateShoppingList() { await this.$store.dispatch('stockInventory/generateShoppingList') },
    async toggleTaken(item) {
      await this.$store.dispatch('stockInventory/setShoppingListTaken', { id: item.id, taken: !Number(item.taken) })
      await this.$store.dispatch('stockInventory/getShoppingList')
    },
    openReplenish(item) {
      this.selectedItem = item
      this.replenishForm = { quantity: item.quantity_to_buy || 1, supplier: item.default_supplier || '', unit_price: item.estimated_unit_price || item.average_unit_price || '', total_price: item.estimated_total_price || '', remark: '' }
      this.replenishDialog = true
    },
    async replenishItem() {
      await this.$store.dispatch('stockInventory/replenishItem', { id: this.selectedItem.stock_item_id || this.selectedItem.id, data: this.replenishForm })
      this.replenishDialog = false
      await this.loadStock()
    },
    openInventory(item) { this.selectedItem = item; this.inventoryForm = { quantity: item.current_stock, remark: '' }; this.inventoryDialog = true },
    async inventoryItem() {
      await this.$store.dispatch('stockInventory/inventoryItem', { id: this.selectedItem.id, data: this.inventoryForm })
      this.inventoryDialog = false
      await this.loadStock()
    },
  },
}
</script>

<style scoped>
.stock-search { max-width: 280px; }
</style>

<template>
  <v-container>
    <v-card outlined>
      <v-card-title class="stock-toolbar">
        <span>Stock</span>
        <v-spacer />
        <v-btn color="primary" class="text-none mr-2" @click="openIngredient()">
          <v-icon left>mdi-plus</v-icon>
          Ajouter un ingredient
        </v-btn>
        <v-text-field
          v-model="search"
          label="Rechercher"
          append-icon="mdi-magnify"
          dense
          outlined
          hide-details
          class="stock-search"
        />
      </v-card-title>

      <v-tabs v-model="activeTab" show-arrows>
        <v-tab>Produits</v-tab>
        <v-tab>Ingredients</v-tab>
        <v-tab>Stocks bas</v-tab>
        <v-tab>Liste de courses</v-tab>
        <v-tab>Inventaire</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <v-tab-item>
          <v-data-table :headers="productHeaders" :items="filteredProducts" :loading="loading">
            <template #[`item.track_stock`]="{ item }">
              <v-icon :color="Number(item.track_stock) === 1 ? 'success' : 'grey'">
                {{ Number(item.track_stock) === 1 ? 'mdi-check-circle' : 'mdi-minus-circle' }}
              </v-icon>
            </template>
            <template #[`item.status`]="{ item }">
              <v-chip v-if="Number(item.track_stock) === 1" small :color="statusColor(item)" label>
                {{ statusLabel(item) }}
              </v-chip>
              <span v-else class="grey--text">Non suivi</span>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn icon :to="`/stocks/${item.id}`" aria-label="Voir le detail" title="Voir le detail">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
              <v-btn icon :to="`/products/edit/${item.product_id}`" aria-label="Modifier" title="Modifier">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-tab-item>

        <v-tab-item>
          <v-data-table :headers="itemHeaders" :items="filteredIngredients" :loading="loading">
            <template #[`item.status`]="{ item }">
              <v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn icon :to="`/stocks/${item.id}`" aria-label="Voir le detail" title="Voir le detail"><v-icon>mdi-eye</v-icon></v-btn>
              <v-btn icon aria-label="Modifier" title="Modifier" @click="openIngredient(item)"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn icon aria-label="Archiver" title="Archiver" @click="archiveIngredient(item)"><v-icon>mdi-archive</v-icon></v-btn>
              <v-btn icon aria-label="Supprimer" title="Supprimer" @click="deleteIngredient(item)"><v-icon>mdi-delete</v-icon></v-btn>
            </template>
          </v-data-table>
        </v-tab-item>

        <v-tab-item>
          <v-data-table :headers="itemHeaders" :items="lowItems" :loading="loading">
            <template #[`item.status`]="{ item }"><v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip></template>
            <template #[`item.actions`]="{ item }"><v-btn icon aria-label="Reapprovisionner" title="Reapprovisionner" @click="openReplenish(item)"><v-icon>mdi-package-up</v-icon></v-btn></template>
          </v-data-table>
        </v-tab-item>

        <v-tab-item>
          <div class="pa-4 d-flex flex-wrap align-center shopping-actions">
            <v-btn color="primary" class="text-none mr-2 mb-2" @click="generateShoppingList">
              <v-icon left>mdi-format-list-checks</v-icon>
              Generer la liste
            </v-btn>
            <v-btn outlined class="text-none mb-2" @click="printShoppingList">
              <v-icon left>mdi-printer</v-icon>
              Imprimer
            </v-btn>
          </div>
          <div id="shopping-list-print">
            <v-data-table
              :headers="shoppingHeaders"
              :items="filteredShoppingList"
              :loading="loading"
              :item-class="shoppingRowClass"
            >
              <template #[`item.taken`]="{ item }"><v-checkbox :input-value="Boolean(Number(item.taken))" label="Pris" hide-details class="mt-0" @change="toggleTaken(item)" /></template>
              <template #[`item.estimated_unit_price`]="{ item }">{{ item.estimated_unit_price == null ? 'Non renseigne' : formatEstimatedPrice(item.estimated_unit_price) }}</template>
              <template #[`item.estimated_total_price`]="{ item }">{{ item.estimated_total_price == null ? 'Non renseigne' : formatEstimatedPrice(item.estimated_total_price) }}</template>
              <template #[`item.actions`]="{ item }"><v-btn small color="primary" class="text-none" @click="openReplenish(item)">Reapprovisionner</v-btn></template>
            </v-data-table>
          </div>
        </v-tab-item>

        <v-tab-item>
          <div class="pa-4">
            <v-btn color="primary" class="text-none" :disabled="!hasInventoryCounts" @click="bulkInventory">
              <v-icon left>mdi-content-save</v-icon>
              Enregistrer les lignes remplies
            </v-btn>
          </div>
          <v-data-table :headers="inventoryHeaders" :items="inventoryItems" :loading="loading">
            <template #[`item.counted_stock`]="{ item }">
              <v-text-field
                :value="inventoryCounts[item.id]"
                type="number"
                min="0"
                step="1"
                dense
                outlined
                hide-details
                aria-label="Stock compte"
                @input="$set(inventoryCounts, item.id, $event)"
              />
            </template>
            <template #[`item.actions`]="{ item }"><v-btn icon aria-label="Inventaire rapide" title="Inventaire rapide" @click="openInventory(item)"><v-icon>mdi-clipboard-check</v-icon></v-btn></template>
          </v-data-table>
        </v-tab-item>
      </v-tabs-items>
    </v-card>

    <v-dialog v-model="ingredientDialog" max-width="720">
      <v-card>
        <v-card-title>{{ editingIngredientId ? 'Modifier l ingredient' : 'Ajouter un ingredient' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="ingredientForm.name" label="Nom" />
          <v-combobox v-model="ingredientForm.unit" :items="units" label="Unite" />
          <v-row>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.current_stock" label="Stock actuel" type="number" min="0" step="1" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.minimum_stock" label="Seuil minimum" type="number" min="0" step="1" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.target_stock" label="Stock cible" type="number" min="0" step="1" /></v-col>
          </v-row>
          <v-combobox v-model="ingredientForm.category_label" :items="ingredientCategories" label="Categorie" />
          <v-text-field v-model="ingredientForm.reference" label="Reference" />
          <v-text-field v-model="ingredientForm.default_supplier" label="Fournisseur par defaut" />
          <v-textarea v-model="ingredientForm.note" label="Note" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="ingredientDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="saveIngredient">Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="replenishDialog" max-width="560">
      <v-card>
        <v-card-title>Reapprovisionner</v-card-title>
        <v-card-text>
          <v-text-field v-model="replenishForm.quantity" label="Quantite achetee" type="number" min="1" step="1" />
          <v-text-field v-model="replenishForm.supplier" label="Fournisseur" />
          <v-text-field v-model="replenishForm.reference" label="Reference" />
          <v-text-field v-model="replenishForm.purchase_date" label="Date d achat" type="date" />
          <v-text-field v-model="replenishForm.unit_price" label="Prix unitaire" type="number" min="0" />
          <v-text-field v-model="replenishForm.total_price" label="Prix total" type="number" min="0" />
          <v-textarea v-model="replenishForm.remark" label="Remarque" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="replenishDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="replenishItem">Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="inventoryDialog" max-width="560">
      <v-card>
        <v-card-title>Inventaire rapide</v-card-title>
        <v-card-text><v-text-field v-model="inventoryForm.quantity" label="Quantite constatee" type="number" min="0" step="1" /><v-textarea v-model="inventoryForm.remark" label="Remarque" /></v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="inventoryDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="inventoryItem">Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import {
  filterStockItems,
  formatEstimatedPrice,
  getStockStatus,
  isOperationalStockItem,
  sortShoppingListItems,
} from '@/helpers/stockInventory'

const emptyIngredientForm = () => ({
  name: '', unit: 'piece', current_stock: 0, minimum_stock: 1, target_stock: 1,
  category_label: '', reference: '', default_supplier: '', note: '',
})

export default {
  middleware: ['auth', 'stocks'],
  data: () => ({
    activeTab: 0,
    search: '',
    loading: false,
    ingredientDialog: false,
    replenishDialog: false,
    inventoryDialog: false,
    editingIngredientId: null,
    selectedItem: null,
    inventoryCounts: {},
    units: ['piece', 'paquet', 'bouteille', 'carton', 'bac', 'kg', 'g', 'l', 'ml'],
    productHeaders: [
      { text: 'Nom', value: 'name' }, { text: 'Suivi', value: 'track_stock' },
      { text: 'Stock', value: 'current_stock' }, { text: 'Unite', value: 'unit' },
      { text: 'Minimum', value: 'minimum_stock' }, { text: 'Cible', value: 'target_stock' },
      { text: 'Statut', value: 'status' }, { text: '', value: 'actions', sortable: false },
    ],
    itemHeaders: [
      { text: 'Nom', value: 'name' }, { text: 'Stock', value: 'current_stock' },
      { text: 'Unite', value: 'unit' }, { text: 'Minimum', value: 'minimum_stock' },
      { text: 'Cible', value: 'target_stock' }, { text: 'Statut', value: 'status' },
      { text: '', value: 'actions', sortable: false },
    ],
    shoppingHeaders: [
      { text: 'Article', value: 'name' }, { text: 'A acheter', value: 'quantity_to_buy' },
      { text: 'Unite', value: 'unit' }, { text: 'Prix unitaire', value: 'estimated_unit_price' },
      { text: 'Prix total', value: 'estimated_total_price' }, { text: 'Pris', value: 'taken', sortable: false },
      { text: '', value: 'actions', sortable: false },
    ],
    inventoryHeaders: [
      { text: 'Article', value: 'name' }, { text: 'Stock theorique', value: 'current_stock' },
      { text: 'Unite', value: 'unit' }, { text: 'Stock compte', value: 'counted_stock', sortable: false },
      { text: '', value: 'actions', sortable: false },
    ],
    ingredientForm: emptyIngredientForm(),
    replenishForm: { quantity: 1, supplier: '', reference: '', purchase_date: '', unit_price: '', total_price: '', remark: '' },
    inventoryForm: { quantity: 0, remark: '' },
  }),
  computed: {
    items() { return this.$store.get('stockInventory/dataItems') || [] },
    filteredItems() { return filterStockItems(this.items, this.search) },
    filteredProducts() { return this.filteredItems.filter((item) => item.item_type === 'product') },
    filteredIngredients() { return this.filteredItems.filter((item) => item.item_type === 'ingredient') },
    lowItems() { return filterStockItems(this.$store.get('stockInventory/lowItems') || [], this.search) },
    shoppingList() { return sortShoppingListItems(this.$store.get('stockInventory/shoppingList') || []) },
    filteredShoppingList() { return filterStockItems(this.shoppingList, this.search) },
    inventoryItems() { return this.filteredItems.filter(isOperationalStockItem) },
    ingredientCategories() {
      return [...new Set(this.items.filter((item) => item.item_type === 'ingredient').map((item) => item.category_label).filter(Boolean))]
    },
    hasInventoryCounts() {
      return Object.values(this.inventoryCounts).some((value) => value !== '' && value !== null && value !== undefined)
    },
  },
  mounted() { this.loadStock() },
  methods: {
    formatEstimatedPrice,
    statusColor(item) {
      const status = getStockStatus(item)
      return status === 'red' ? 'red' : status === 'orange' ? 'orange' : 'grey'
    },
    statusLabel(item) {
      const status = getStockStatus(item)
      return status === 'red' ? 'Sous le minimum' : status === 'orange' ? 'Sous la cible' : 'Normal'
    },
    shoppingRowClass(item) { return Number(item.taken) === 1 ? 'shopping-taken' : '' },
    async loadStock() {
      this.loading = true
      await Promise.all([
        this.$store.dispatch('stockInventory/getItems'),
        this.$store.dispatch('stockInventory/getLowItems'),
        this.$store.dispatch('stockInventory/getShoppingList'),
      ])
      this.loading = false
    },
    openIngredient(item = null) {
      this.editingIngredientId = item ? item.id : null
      this.ingredientForm = item
        ? Object.keys(emptyIngredientForm()).reduce((form, key) => ({ ...form, [key]: item[key] ?? '' }), {})
        : emptyIngredientForm()
      this.ingredientDialog = true
    },
    async saveIngredient() {
      const success = this.editingIngredientId
        ? await this.$store.dispatch('stockInventory/updateItem', { id: this.editingIngredientId, data: this.ingredientForm })
        : await this.$store.dispatch('stockInventory/createIngredient', this.ingredientForm)
      if (success) {
        this.ingredientDialog = false
        await this.loadStock()
      }
    },
    async archiveIngredient(item) {
      if (!window.confirm(`Archiver ${item.name} ?`)) return
      const success = await this.$store.dispatch('stockInventory/archiveIngredient', item.id)
      if (success) await this.loadStock()
    },
    async deleteIngredient(item) {
      if (!window.confirm(`Supprimer ${item.name} ?`)) return
      const success = await this.$store.dispatch('stockInventory/deleteIngredient', item.id)
      if (success) await this.loadStock()
    },
    async generateShoppingList() { await this.$store.dispatch('stockInventory/generateShoppingList') },
    printShoppingList() { window.print() },
    async toggleTaken(item) {
      const success = await this.$store.dispatch('stockInventory/setShoppingListTaken', { id: item.id, taken: !Number(item.taken) })
      if (success) await this.$store.dispatch('stockInventory/getShoppingList')
    },
    openReplenish(item) {
      this.selectedItem = item
      this.replenishForm = {
        quantity: item.quantity_to_buy ?? 1,
        supplier: item.default_supplier ?? '',
        reference: item.reference ?? '',
        purchase_date: new Date().toISOString().slice(0, 10),
        unit_price: item.estimated_unit_price ?? item.average_unit_price ?? '',
        total_price: item.estimated_total_price ?? '',
        remark: '',
      }
      this.replenishDialog = true
    },
    async replenishItem() {
      const success = await this.$store.dispatch('stockInventory/replenishItem', {
        id: this.selectedItem.stock_item_id || this.selectedItem.id,
        data: this.replenishForm,
      })
      if (success) {
        this.replenishDialog = false
        await this.loadStock()
      }
    },
    openInventory(item) {
      this.selectedItem = item
      this.inventoryForm = { quantity: item.current_stock, remark: '' }
      this.inventoryDialog = true
    },
    async inventoryItem() {
      const success = await this.$store.dispatch('stockInventory/inventoryItem', {
        id: this.selectedItem.id,
        data: this.inventoryForm,
      })
      if (success) {
        this.inventoryDialog = false
        await this.loadStock()
      }
    },
    async bulkInventory() {
      const items = this.inventoryItems
        .filter((item) => {
          const value = this.inventoryCounts[item.id]
          return value !== '' && value !== null && value !== undefined
        })
        .map((item) => ({ stock_item_id: item.id, quantity: this.inventoryCounts[item.id] }))
      if (!items.length) return
      const success = await this.$store.dispatch('stockInventory/bulkInventory', items)
      if (success) {
        this.inventoryCounts = {}
        await this.loadStock()
      }
    },
  },
}
</script>

<style scoped>
.stock-toolbar { gap: 8px; }
.stock-search { max-width: 280px; }
.shopping-actions { gap: 4px; }
::v-deep .shopping-taken { color: #777; background: #f2f2f2; text-decoration: line-through; }
@media print {
  .stock-toolbar, .v-tabs, .shopping-actions, ::v-deep .v-data-table__wrapper th:last-child,
  ::v-deep .v-data-table__wrapper td:last-child { display: none !important; }
  ::v-deep .v-window-item { display: none !important; }
  ::v-deep .v-window-item--active { display: block !important; }
}
</style>

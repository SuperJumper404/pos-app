<template>
  <v-container>
    <v-card outlined class="stock-panel">
      <SePageHeader
        title="Stock"
        subtitle="Inventaire, alertes et liste de courses"
        icon="mdi-warehouse"
      >
        <template #actions>
          <v-btn
            color="primary"
            class="text-none stock-action"
            depressed
            @click="openIngredient()"
          >
            <v-icon left>mdi-plus</v-icon>
            Ajouter un ingrédient
          </v-btn>
          <v-text-field
            v-model="search"
            label="Rechercher"
            prepend-inner-icon="mdi-magnify"
            dense
            outlined
            hide-details
            class="stock-search"
          />
        </template>
      </SePageHeader>

      <v-tabs v-model="activeTab" show-arrows class="stock-tabs">
        <v-tab><v-icon left small>mdi-package-variant-closed</v-icon>Produits</v-tab>
        <v-tab><v-icon left small>mdi-food-apple-outline</v-icon>Ingrédients</v-tab>
        <v-tab><v-icon left small>mdi-alert-circle-outline</v-icon>Stocks bas</v-tab>
        <v-tab><v-icon left small>mdi-cart-outline</v-icon>Liste de courses</v-tab>
        <v-tab><v-icon left small>mdi-clipboard-check-outline</v-icon>Inventaire</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <v-tab-item>
          <v-data-table class="stock-table" :headers="productHeaders" :items="filteredProducts" :loading="loading">
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
              <v-btn icon :to="`/stocks/${item.id}`" aria-label="Voir le détail" title="Voir le détail">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
              <v-btn icon :to="`/products/edit/${item.product_id}`" aria-label="Modifier" title="Modifier">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-tab-item>

        <v-tab-item>
          <v-data-table class="stock-table" :headers="itemHeaders" :items="filteredIngredients" :loading="loading">
            <template #[`item.status`]="{ item }">
              <v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn icon :to="`/stocks/${item.id}`" aria-label="Voir le détail" title="Voir le détail"><v-icon>mdi-eye</v-icon></v-btn>
              <v-btn icon aria-label="Modifier" title="Modifier" @click="openIngredient(item)"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn icon aria-label="Archiver" title="Archiver" @click="archiveIngredient(item)"><v-icon>mdi-archive</v-icon></v-btn>
              <v-btn icon color="error" aria-label="Supprimer" title="Supprimer" @click="deleteIngredient(item)"><v-icon>mdi-delete</v-icon></v-btn>
            </template>
          </v-data-table>
        </v-tab-item>

        <v-tab-item>
          <v-data-table class="stock-table" :headers="itemHeaders" :items="lowItems" :loading="loading">
            <template #[`item.status`]="{ item }"><v-chip small :color="statusColor(item)" label>{{ statusLabel(item) }}</v-chip></template>
            <template #[`item.actions`]="{ item }"><v-btn icon aria-label="Réapprovisionner" title="Réapprovisionner" @click="openReplenish(item)"><v-icon>mdi-package-up</v-icon></v-btn></template>
          </v-data-table>
        </v-tab-item>

        <v-tab-item>
          <div class="stock-section-actions">
            <v-btn color="primary" class="text-none stock-action" depressed @click="generateShoppingList">
              <v-icon left>mdi-format-list-checks</v-icon>
              Générer la liste
            </v-btn>
            <v-btn outlined class="text-none stock-action" @click="printShoppingList">
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
              <template #[`item.estimated_unit_price`]="{ item }">{{ item.estimated_unit_price == null ? 'Non renseigné' : formatEstimatedPrice(item.estimated_unit_price) }}</template>
              <template #[`item.estimated_total_price`]="{ item }">{{ item.estimated_total_price == null ? 'Non renseigné' : formatEstimatedPrice(item.estimated_total_price) }}</template>
              <template #[`item.actions`]="{ item }"><v-btn small color="primary" class="text-none" depressed @click="openReplenish(item)"><v-icon left small>mdi-package-up</v-icon>Réapprovisionner</v-btn></template>
            </v-data-table>
          </div>
        </v-tab-item>

        <v-tab-item>
          <div class="stock-section-actions">
            <v-btn color="primary" class="text-none stock-action" depressed :disabled="!hasInventoryCounts" @click="bulkInventory">
              <v-icon left>mdi-content-save</v-icon>
              Enregistrer les lignes remplies
            </v-btn>
          </div>
          <v-data-table class="stock-table" :headers="inventoryHeaders" :items="inventoryItems" :loading="loading">
            <template #[`item.counted_stock`]="{ item }">
              <v-text-field
                :value="inventoryCounts[item.id]"
                type="number"
                min="0"
                step="1"
                dense
                outlined
                hide-details
                prepend-icon="mdi-counter"
                aria-label="Stock compté"
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
        <v-card-title class="stock-dialog-title">
          <v-icon left color="primary">mdi-food-apple-outline</v-icon>
          {{ editingIngredientId ? "Modifier l'ingrédient" : 'Ajouter un ingrédient' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="ingredientForm.name" label="Nom" prepend-icon="mdi-tag-outline" outlined dense />
          <v-combobox v-model="ingredientForm.unit" :items="units" label="Unité" prepend-icon="mdi-scale" outlined dense />
          <v-row>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.current_stock" label="Stock actuel" type="number" min="0" step="1" prepend-icon="mdi-package-variant-closed" outlined dense /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.minimum_stock" label="Seuil minimum" type="number" min="0" step="1" prepend-icon="mdi-alert-outline" outlined dense /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="ingredientForm.target_stock" label="Stock cible" type="number" min="0" step="1" prepend-icon="mdi-bullseye-arrow" outlined dense /></v-col>
          </v-row>
          <v-combobox v-model="ingredientForm.category_label" :items="ingredientCategories" label="Catégorie" prepend-icon="mdi-shape-outline" outlined dense />
          <v-text-field v-model="ingredientForm.reference" label="Référence" prepend-icon="mdi-barcode" outlined dense />
          <v-text-field v-model="ingredientForm.default_supplier" label="Fournisseur par défaut" prepend-icon="mdi-truck-outline" outlined dense />
          <v-textarea v-model="ingredientForm.note" label="Note" prepend-icon="mdi-note-text-outline" outlined dense rows="3" />
        </v-card-text>
        <v-card-actions class="stock-dialog-actions"><v-spacer /><v-btn text @click="ingredientDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" depressed @click="saveIngredient"><v-icon left small>mdi-content-save</v-icon>Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="replenishDialog" max-width="560">
      <v-card>
        <v-card-title class="stock-dialog-title">
          <v-icon left color="primary">mdi-truck-delivery-outline</v-icon>
          Réapprovisionner
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="replenishForm.quantity" label="Quantité achetée" type="number" min="1" step="1" prepend-icon="mdi-counter" outlined dense />
          <v-text-field v-model="replenishForm.supplier" label="Fournisseur" prepend-icon="mdi-truck-outline" outlined dense />
          <v-text-field v-model="replenishForm.reference" label="Référence" prepend-icon="mdi-barcode" outlined dense />
          <v-text-field v-model="replenishForm.purchase_date" label="Date d'achat" type="date" prepend-icon="mdi-calendar" outlined dense />
          <v-text-field v-model="replenishForm.unit_price" label="Prix unitaire" type="number" min="0" prepend-icon="mdi-currency-eur" outlined dense />
          <v-text-field v-model="replenishForm.total_price" label="Prix total" type="number" min="0" prepend-icon="mdi-cash-multiple" outlined dense />
          <v-textarea v-model="replenishForm.remark" label="Remarque" prepend-icon="mdi-note-text-outline" outlined dense rows="3" />
        </v-card-text>
        <v-card-actions class="stock-dialog-actions"><v-spacer /><v-btn text @click="replenishDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" depressed @click="replenishItem"><v-icon left small>mdi-content-save</v-icon>Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="inventoryDialog" max-width="560">
      <v-card>
        <v-card-title class="stock-dialog-title">
          <v-icon left color="primary">mdi-clipboard-check-outline</v-icon>
          Inventaire rapide
        </v-card-title>
        <v-card-text><v-text-field v-model="inventoryForm.quantity" label="Quantité constatée" type="number" min="0" step="1" prepend-icon="mdi-counter" outlined dense /><v-textarea v-model="inventoryForm.remark" label="Remarque" prepend-icon="mdi-note-text-outline" outlined dense rows="3" /></v-card-text>
        <v-card-actions class="stock-dialog-actions"><v-spacer /><v-btn text @click="inventoryDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" depressed @click="inventoryItem"><v-icon left small>mdi-content-save</v-icon>Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import SePageHeader from '@/components/design-system/SePageHeader'
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
  components: {
    SePageHeader,
  },
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
      { text: 'Stock', value: 'current_stock' }, { text: 'Unité', value: 'unit' },
      { text: 'Minimum', value: 'minimum_stock' }, { text: 'Cible', value: 'target_stock' },
      { text: 'Statut', value: 'status' }, { text: '', value: 'actions', sortable: false },
    ],
    itemHeaders: [
      { text: 'Nom', value: 'name' }, { text: 'Stock', value: 'current_stock' },
      { text: 'Unité', value: 'unit' }, { text: 'Minimum', value: 'minimum_stock' },
      { text: 'Cible', value: 'target_stock' }, { text: 'Statut', value: 'status' },
      { text: '', value: 'actions', sortable: false },
    ],
    shoppingHeaders: [
      { text: 'Article', value: 'name' }, { text: 'À acheter', value: 'quantity_to_buy' },
      { text: 'Unité', value: 'unit' }, { text: 'Prix unitaire', value: 'estimated_unit_price' },
      { text: 'Prix total', value: 'estimated_total_price' }, { text: 'Pris', value: 'taken', sortable: false },
      { text: '', value: 'actions', sortable: false },
    ],
    inventoryHeaders: [
      { text: 'Article', value: 'name' }, { text: 'Stock théorique', value: 'current_stock' },
      { text: 'Unité', value: 'unit' }, { text: 'Stock compté', value: 'counted_stock', sortable: false },
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
.stock-panel { overflow: hidden; }
.stock-search {
  max-width: 300px;
  min-width: 220px;
}
.stock-action {
  min-height: 38px;
}
.stock-tabs {
  border-bottom: 1px solid var(--se-color-border-soft);
}
.stock-section-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 10px;
}
.stock-dialog-title {
  gap: var(--se-space-2);
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-semibold);
  border-bottom: 1px solid var(--se-color-border-soft);
}
.stock-dialog-actions {
  padding: 12px 24px 20px;
}
.stock-table ::v-deep th {
  color: var(--se-color-text-muted) !important;
  font-weight: 600 !important;
}
.stock-table ::v-deep td {
  color: var(--se-color-text-body);
}
::v-deep .shopping-taken {
  color: var(--se-color-text-muted);
  background: var(--se-color-surface-muted);
  text-decoration: line-through;
}
@media print {
  .se-page-header, .v-tabs, .stock-section-actions, ::v-deep .v-data-table__wrapper th:last-child,
  ::v-deep .v-data-table__wrapper td:last-child { display: none !important; }
  ::v-deep .v-window-item { display: none !important; }
  ::v-deep .v-window-item--active { display: block !important; }
}
@media (max-width: 720px) {
  .se-page-header {
    align-items: stretch;
  }
  .stock-search {
    max-width: none;
    width: 100%;
  }
  .stock-action {
    width: 100%;
  }
}
</style>

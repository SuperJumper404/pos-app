<template>
  <v-container fluid class="stock-page full-width pa-5">
    <v-card outlined class="stock-panel">
      <SePageHeader
        title="Stock"
        subtitle="Inventaire, alertes et liste de courses"
        icon="mdi-warehouse"
      >
        <template #actions>
          <v-text-field
            v-model="search"
            placeholder="Rechercher un ingrédient ou produit"
            prepend-inner-icon="mdi-magnify"
            dense
            outlined
            hide-details
            class="se-search-field"
          />
        </template>
      </SePageHeader>

      <div class="stock-cockpit">
        <v-card
          v-for="card in stockKpiCards"
          :key="card.label"
          outlined
          class="stock-kpi"
          :class="card.className"
          role="button"
          tabindex="0"
          @click="applyStockFilter(card.filter)"
          @keydown.enter.prevent="applyStockFilter(card.filter)"
          @keydown.space.prevent="applyStockFilter(card.filter)"
        >
          <div class="stock-kpi__icon">
            <v-icon>{{ card.icon }}</v-icon>
          </div>
          <div>
            <div class="stock-kpi__label">{{ card.label }}</div>
            <div class="stock-kpi__value">{{ card.value }}</div>
            <div class="stock-kpi__hint">{{ card.hint }}</div>
          </div>
        </v-card>
      </div>

      <div class="stock-quick-filters">
        <v-btn
          v-for="filter in stockQuickFilters"
          :key="filter.value"
          small
          depressed
          class="text-none stock-filter"
          :outlined="activeStockFilter !== filter.value"
          :color="activeStockFilter === filter.value ? filter.color : undefined"
          @click="applyStockFilter(filter.value)"
        >
          <v-icon small left>{{ filter.icon }}</v-icon>
          {{ filter.label }}
          <span class="stock-filter__count">{{ filter.count }}</span>
        </v-btn>
      </div>

      <v-tabs v-model="activeTab" show-arrows class="stock-tabs">
        <v-tab><v-icon left small>mdi-package-variant-closed</v-icon>Produits <span class="stock-tab-count">{{ filteredProducts.length }}</span></v-tab>
        <v-tab><v-icon left small>mdi-food-apple-outline</v-icon>Ingrédients <span class="stock-tab-count">{{ filteredIngredients.length }}</span></v-tab>
        <v-tab><v-icon left small>mdi-alert-circle-outline</v-icon>Stocks bas <span class="stock-tab-count">{{ lowItems.length }}</span></v-tab>
        <v-tab><v-icon left small>mdi-cart-outline</v-icon>Liste de courses <span class="stock-tab-count">{{ filteredShoppingList.length }}</span></v-tab>
        <v-tab><v-icon left small>mdi-clipboard-check-outline</v-icon>Inventaire <span class="stock-tab-count">{{ inventoryItems.length }}</span></v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <v-tab-item>
          <v-data-table class="stock-table" :headers="productHeaders" :items="filteredProducts" :loading="loading">
            <template #[`item.current_stock`]="{ item }">
              <div class="stock-level-cell">
                <strong>{{ item.current_stock }}</strong>
                <v-progress-linear
                  class="stock-level-meter"
                  :value="stockLevelPercent(item)"
                  :color="statusColor(item)"
                  height="7"
                  rounded
                  background-color="#e8edf3"
                />
              </div>
            </template>
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
          <div class="stock-ingredient-actions">
            <v-btn
              color="primary"
              class="text-none stock-action"
              depressed
              @click="openIngredient()"
            >
              <v-icon left>mdi-plus</v-icon>
              Ajouter un ingrédient
            </v-btn>
          </div>
          <v-data-table class="stock-table" :headers="itemHeaders" :items="filteredIngredients" :loading="loading">
            <template #[`item.current_stock`]="{ item }">
              <div class="stock-level-cell">
                <strong>{{ item.current_stock }}</strong>
                <v-progress-linear
                  class="stock-level-meter"
                  :value="stockLevelPercent(item)"
                  :color="statusColor(item)"
                  height="7"
                  rounded
                  background-color="#e8edf3"
                />
              </div>
            </template>
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
            <template #[`item.current_stock`]="{ item }">
              <div class="stock-level-cell">
                <strong>{{ item.current_stock }}</strong>
                <v-progress-linear
                  class="stock-level-meter"
                  :value="stockLevelPercent(item)"
                  :color="statusColor(item)"
                  height="7"
                  rounded
                  background-color="#e8edf3"
                />
              </div>
            </template>
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
          <div class="stock-inventory-express">
            <div>
              <div class="stock-section-title">
                <v-icon color="primary" left>mdi-clipboard-check-outline</v-icon>
                Inventaire express
              </div>
              <div class="stock-section-subtitle">
                {{ inventorySummary }}
              </div>
            </div>
            <v-btn color="primary" class="text-none stock-action" depressed :disabled="!hasInventoryCounts" @click="bulkInventory">
              <v-icon left>mdi-content-save</v-icon>
              Enregistrer les lignes remplies
            </v-btn>
          </div>
          <v-data-table class="stock-table stock-inventory-table" :headers="inventoryHeaders" :items="inventoryItems" :loading="loading" :item-class="inventoryRowClass">
            <template #[`item.counted_stock`]="{ item }">
              <v-text-field
                :ref="`inventory-${item.id}`"
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
                @keydown.enter.prevent="focusNextInventoryField(item)"
              />
            </template>
            <template #[`item.deviation`]="{ item }">
              <v-chip small label :color="inventoryDeviationColor(item)">
                {{ inventoryDeviationLabel(item) }}
              </v-chip>
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
    activeStockFilter: 'all',
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
      { text: 'Écart', value: 'deviation', sortable: false },
      { text: '', value: 'actions', sortable: false },
    ],
    ingredientForm: emptyIngredientForm(),
    replenishForm: { quantity: 1, supplier: '', reference: '', purchase_date: '', unit_price: '', total_price: '', remark: '' },
    inventoryForm: { quantity: 0, remark: '' },
  }),
  computed: {
    items() { return this.$store.get('stockInventory/dataItems') || [] },
    trackedItems() { return this.items.filter(isOperationalStockItem) },
    criticalItems() { return this.trackedItems.filter((item) => getStockStatus(item) === 'red') },
    warningItems() { return this.trackedItems.filter((item) => getStockStatus(item) === 'orange') },
    normalItems() { return this.trackedItems.filter((item) => getStockStatus(item) === 'normal') },
    filteredItems() {
      const searchedItems = filterStockItems(this.items, this.search)
      if (this.activeStockFilter === 'critical') return searchedItems.filter((item) => getStockStatus(item) === 'red')
      if (this.activeStockFilter === 'warning') return searchedItems.filter((item) => getStockStatus(item) === 'orange')
      if (this.activeStockFilter === 'tracked') return searchedItems.filter(isOperationalStockItem)
      return searchedItems
    },
    filteredProducts() { return this.filteredItems.filter((item) => item.item_type === 'product') },
    filteredIngredients() { return this.filteredItems.filter((item) => item.item_type === 'ingredient') },
    lowItems() { return filterStockItems(this.$store.get('stockInventory/lowItems') || [], this.search) },
    shoppingList() { return sortShoppingListItems(this.$store.get('stockInventory/shoppingList') || []) },
    filteredShoppingList() { return filterStockItems(this.shoppingList, this.search) },
    inventoryItems() { return this.filteredItems.filter(isOperationalStockItem) },
    stockKpiCards() {
      return [
        {
          label: 'Critiques',
          value: this.criticalItems.length,
          hint: 'Sous le minimum',
          icon: 'mdi-alert-circle-outline',
          className: 'stock-kpi--critical',
          filter: 'critical',
        },
        {
          label: 'À surveiller',
          value: this.warningItems.length,
          hint: 'Sous la cible',
          icon: 'mdi-bell-ring-outline',
          className: 'stock-kpi--warning',
          filter: 'warning',
        },
        {
          label: 'Suivis',
          value: this.trackedItems.length,
          hint: 'Articles inventoriables',
          icon: 'mdi-radar',
          className: 'stock-kpi--tracked',
          filter: 'tracked',
        },
      ]
    },
    stockQuickFilters() {
      return [
        { label: 'Tout', value: 'all', count: this.items.length, icon: 'mdi-view-list-outline', color: 'primary' },
        { label: 'Critiques', value: 'critical', count: this.criticalItems.length, icon: 'mdi-alert-circle-outline', color: 'red' },
        { label: 'À surveiller', value: 'warning', count: this.warningItems.length, icon: 'mdi-bell-ring-outline', color: 'warning' },
        { label: 'Suivis', value: 'tracked', count: this.trackedItems.length, icon: 'mdi-radar', color: 'primary' },
      ]
    },
    inventoryReadyCount() {
      return Object.values(this.inventoryCounts).filter((value) => value !== '' && value !== null && value !== undefined).length
    },
    inventorySummary() {
      if (!this.inventoryReadyCount) return `${this.inventoryItems.length} lignes à compter`
      return `${this.inventoryReadyCount} ligne${this.inventoryReadyCount > 1 ? 's' : ''} prête${this.inventoryReadyCount > 1 ? 's' : ''} à enregistrer`
    },
    ingredientCategories() {
      return [...new Set(this.items.filter((item) => item.item_type === 'ingredient').map((item) => item.category_label).filter(Boolean))]
    },
    hasInventoryCounts() {
      return this.inventoryReadyCount > 0
    },
  },
  mounted() { this.loadStock() },
  methods: {
    formatEstimatedPrice,
    statusColor(item) {
      const status = getStockStatus(item)
      return status === 'red' ? 'red' : status === 'orange' ? 'warning' : 'grey'
    },
    statusLabel(item) {
      const status = getStockStatus(item)
      return status === 'red' ? 'Sous le minimum' : status === 'orange' ? 'Sous la cible' : 'Normal'
    },
    applyStockFilter(filter) {
      this.activeStockFilter = filter || 'all'
    },
    stockLevelPercent(item) {
      const current = Number(item.current_stock) || 0
      const target = Number(item.target_stock) || Number(item.minimum_stock) || 1
      return Math.min(100, Math.max(0, (current / target) * 100))
    },
    shoppingRowClass(item) { return Number(item.taken) === 1 ? 'shopping-taken' : '' },
    inventoryRowClass(item) {
      return this.hasInventoryValue(item) ? 'inventory-row--filled' : ''
    },
    hasInventoryValue(item) {
      const value = this.inventoryCounts[item.id]
      return value !== '' && value !== null && value !== undefined
    },
    inventoryDeviation(item) {
      if (!this.hasInventoryValue(item)) return null
      return (Number(this.inventoryCounts[item.id]) || 0) - (Number(item.current_stock) || 0)
    },
    inventoryDeviationLabel(item) {
      const deviation = this.inventoryDeviation(item)
      if (deviation === null) return 'À compter'
      if (deviation === 0) return 'OK'
      return deviation > 0 ? `+${deviation}` : `${deviation}`
    },
    inventoryDeviationColor(item) {
      const deviation = this.inventoryDeviation(item)
      if (deviation === null || deviation === 0) return 'grey'
      return deviation > 0 ? 'success' : 'warning'
    },
    focusNextInventoryField(item) {
      const index = this.inventoryItems.findIndex((inventoryItem) => inventoryItem.id === item.id)
      const nextItem = this.inventoryItems[index + 1]
      if (!nextItem) return
      this.$nextTick(() => {
        const field = this.$refs[`inventory-${nextItem.id}`]
        const input = Array.isArray(field) ? field[0] : field
        if (input && input.focus) input.focus()
      })
    },
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
.stock-page {
  background: #f7f9fc;
  min-height: calc(100vh - 64px);
}
.stock-panel {
  border-color: var(--se-color-border) !important;
  overflow: hidden;
}
.stock-action {
  min-height: 38px;
}
.stock-cockpit {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 18px 20px 12px;
}
.stock-kpi {
  align-items: center;
  border-color: var(--se-color-border) !important;
  cursor: pointer;
  display: flex;
  gap: 14px;
  min-height: 104px;
  padding: 16px;
}
.stock-kpi__icon {
  align-items: center;
  border-radius: 12px;
  display: flex;
  height: 44px;
  justify-content: center;
  width: 44px;
}
.stock-kpi__label {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  font-weight: var(--se-weight-semibold);
}
.stock-kpi__value {
  color: var(--se-color-text);
  font-size: 26px;
  font-weight: var(--se-weight-bold);
  line-height: 1.1;
  margin-top: 4px;
}
.stock-kpi__hint {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-caption);
  margin-top: 4px;
}
.stock-kpi--critical .stock-kpi__icon {
  background: var(--se-color-danger-soft);
  color: var(--se-color-danger);
}
.stock-kpi--warning .stock-kpi__icon {
  background: var(--se-color-warning-soft);
  color: var(--se-color-warning);
}
.stock-kpi--tracked .stock-kpi__icon {
  background: var(--se-color-primary-soft);
  color: var(--se-color-primary);
}
.stock-quick-filters {
  align-items: center;
  border-top: 1px solid var(--se-color-border-soft);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 20px;
}
.stock-filter {
  border-radius: var(--se-radius-sm) !important;
  min-height: 34px;
}
.stock-filter__count,
.stock-tab-count {
  align-items: center;
  background: var(--se-color-surface-muted);
  border: 1px solid var(--se-color-border-soft);
  border-radius: var(--se-radius-pill);
  color: var(--se-color-text-muted);
  display: inline-flex;
  font-size: var(--se-font-caption);
  font-weight: var(--se-weight-bold);
  height: 20px;
  justify-content: center;
  margin-left: 8px;
  min-width: 24px;
  padding: 0 7px;
}
.stock-tabs {
  border-bottom: 1px solid var(--se-color-border-soft);
}
.stock-section-actions,
.stock-ingredient-actions {
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
.stock-level-cell {
  display: grid;
  gap: 6px;
  min-width: 110px;
}
.stock-level-meter {
  max-width: 132px;
}
.stock-inventory-express {
  align-items: center;
  background: var(--se-color-surface-muted);
  border-bottom: 1px solid var(--se-color-border-soft);
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: space-between;
  padding: 16px 20px;
}
.stock-section-title {
  align-items: center;
  color: var(--se-color-text);
  display: flex;
  font-size: var(--se-font-title-sm);
  font-weight: var(--se-weight-semibold);
}
.stock-section-subtitle {
  color: var(--se-color-text-muted);
  font-size: var(--se-font-meta);
  margin-top: 4px;
}
.stock-table ::v-deep th {
  color: var(--se-color-text-muted) !important;
  font-weight: 600 !important;
}
.stock-table ::v-deep td {
  color: var(--se-color-text-body);
}
.stock-inventory-table ::v-deep .inventory-row--filled {
  background: var(--se-color-primary-soft);
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
@media (max-width: 1180px) {
  .stock-cockpit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .stock-page {
    padding: 12px !important;
  }
  .se-page-header {
    align-items: stretch;
  }
  .stock-cockpit {
    grid-template-columns: 1fr;
    padding: 14px;
  }
  .stock-quick-filters,
  .stock-inventory-express {
    align-items: stretch;
    flex-direction: column;
    padding: 14px;
  }
  .stock-filter,
  .stock-action {
    width: 100%;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .stock-kpi,
  .stock-filter {
    transition:
      border-color var(--se-transition-fast),
      transform var(--se-transition-fast);
  }

  .stock-kpi:hover,
  .stock-filter:hover {
    border-color: var(--se-color-primary) !important;
    transform: translateY(-1px);
  }
}
</style>

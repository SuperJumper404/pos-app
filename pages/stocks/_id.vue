<template>
  <v-container>
    <Loading v-if="loading" />
    <div v-else-if="item">
      <div class="stock-detail-header mb-4">
        <div class="stock-detail-title">
          <div class="stock-detail-icon">
            <v-icon color="primary">{{ item.item_type === 'ingredient' ? 'mdi-food-apple-outline' : 'mdi-package-variant-closed' }}</v-icon>
          </div>
          <div>
            <h1 class="text-h5 font-weight-medium mb-1">{{ item.name }}</h1>
            <div class="stock-detail-subtitle">{{ item.item_type === 'ingredient' ? 'Ingrédient' : 'Produit' }} suivi en stock</div>
          </div>
        </div>
        <div class="detail-actions">
          <v-btn color="primary" class="text-none" depressed @click="openReplenish"><v-icon left>mdi-package-up</v-icon>Réapprovisionner</v-btn>
          <v-btn outlined class="text-none" @click="openInventory"><v-icon left>mdi-clipboard-check</v-icon>Inventorier</v-btn>
          <v-btn outlined class="text-none" @click="editItem"><v-icon left>mdi-pencil</v-icon>Modifier</v-btn>
        </div>
        <template v-if="item.item_type === 'ingredient'">
          <v-btn icon aria-label="Archiver" title="Archiver" @click="archiveIngredient"><v-icon>mdi-archive</v-icon></v-btn>
          <v-btn icon color="error" aria-label="Supprimer" title="Supprimer" @click="deleteIngredient"><v-icon>mdi-delete</v-icon></v-btn>
        </template>
      </div>

      <v-card outlined class="mb-4">
        <v-card-text class="stock-info-grid">
          <v-row>
            <v-col cols="6" sm="3">
              <div class="stock-info-tile">
                <v-icon color="primary">mdi-package-variant-closed</v-icon>
                <div><strong>Stock</strong><div>{{ item.current_stock }} {{ item.unit }}</div></div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="stock-info-tile">
                <v-icon color="error">mdi-alert-outline</v-icon>
                <div><strong>Minimum</strong><div>{{ item.minimum_stock }}</div></div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="stock-info-tile">
                <v-icon color="warning">mdi-bullseye-arrow</v-icon>
                <div><strong>Cible</strong><div>{{ item.target_stock }}</div></div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="stock-info-tile">
                <v-icon color="success">mdi-currency-eur</v-icon>
                <div><strong>Prix moyen</strong><div>{{ formatEstimatedPrice(item.average_unit_price) }}</div></div>
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="stock-info-tile">
                <v-icon>mdi-truck-outline</v-icon>
                <div><strong>Fournisseur</strong><div>{{ item.default_supplier || 'Non renseigné' }}</div></div>
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="stock-info-tile">
                <v-icon>mdi-barcode</v-icon>
                <div><strong>Référence</strong><div>{{ item.reference || 'Non renseigné' }}</div></div>
              </div>
            </v-col>
            <v-col cols="12" sm="4">
              <div class="stock-info-tile">
                <v-icon>mdi-information-outline</v-icon>
                <div><strong>Statut</strong><div>{{ item.status || 'Normal' }}</div></div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card outlined>
        <v-card-title class="stock-dialog-title">
          <v-icon left color="primary">mdi-history</v-icon>
          Historique des mouvements
        </v-card-title>
        <v-data-table class="stock-table" :headers="headers" :items="movements">
        <template #[`item.movement_type`]="{ item: movement }">{{ movementLabel(movement.movement_type) }}</template>
        <template #[`item.unit_price`]="{ item: movement }">{{ formatEstimatedPrice(movement.unit_price) }}</template>
        <template #[`item.total_price`]="{ item: movement }">{{ formatEstimatedPrice(movement.total_price) }}</template>
        </v-data-table>
      </v-card>
    </div>

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

    <v-dialog v-model="inventoryDialog" max-width="520">
      <v-card>
        <v-card-title class="stock-dialog-title">
          <v-icon left color="primary">mdi-clipboard-check-outline</v-icon>
          Inventaire rapide
        </v-card-title>
        <v-card-text><v-text-field v-model="inventoryForm.quantity" label="Quantité constatée" type="number" min="0" step="1" prepend-icon="mdi-counter" outlined dense /><v-textarea v-model="inventoryForm.remark" label="Remarque" prepend-icon="mdi-note-text-outline" outlined dense rows="3" /></v-card-text>
        <v-card-actions class="stock-dialog-actions"><v-spacer /><v-btn text @click="inventoryDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" depressed @click="inventoryItem"><v-icon left small>mdi-content-save</v-icon>Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editDialog" max-width="640">
      <v-card>
        <v-card-title class="stock-dialog-title">
          <v-icon left color="primary">mdi-food-apple-outline</v-icon>
          Modifier l'ingrédient
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="editForm.name" label="Nom" prepend-icon="mdi-tag-outline" outlined dense />
          <v-text-field v-model="editForm.unit" label="Unité" prepend-icon="mdi-scale" outlined dense />
          <v-row>
            <v-col cols="12" sm="4"><v-text-field v-model="editForm.current_stock" label="Stock actuel" type="number" prepend-icon="mdi-package-variant-closed" outlined dense /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="editForm.minimum_stock" label="Minimum" type="number" prepend-icon="mdi-alert-outline" outlined dense /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="editForm.target_stock" label="Cible" type="number" prepend-icon="mdi-bullseye-arrow" outlined dense /></v-col>
          </v-row>
          <v-text-field v-model="editForm.category_label" label="Catégorie" prepend-icon="mdi-shape-outline" outlined dense />
          <v-text-field v-model="editForm.reference" label="Référence" prepend-icon="mdi-barcode" outlined dense />
          <v-text-field v-model="editForm.default_supplier" label="Fournisseur par défaut" prepend-icon="mdi-truck-outline" outlined dense />
          <v-textarea v-model="editForm.note" label="Note" prepend-icon="mdi-note-text-outline" outlined dense rows="3" />
        </v-card-text>
        <v-card-actions class="stock-dialog-actions"><v-spacer /><v-btn text @click="editDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" depressed @click="saveItem"><v-icon left small>mdi-content-save</v-icon>Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import Loading from '@/components/loading'
import { formatEstimatedPrice } from '@/helpers/stockInventory'

export default {
  components: { Loading },
  middleware: ['auth', 'stocks'],
  data: () => ({
    loading: false,
    replenishDialog: false,
    inventoryDialog: false,
    editDialog: false,
    replenishForm: { quantity: 1, supplier: '', reference: '', purchase_date: '', unit_price: '', total_price: '', remark: '' },
    inventoryForm: { quantity: 0, remark: '' },
    editForm: {},
    headers: [
      { text: 'Date', value: 'created_at' }, { text: 'Type', value: 'movement_type' },
      { text: 'Quantité', value: 'quantity' }, { text: 'Stock avant', value: 'previous_stock' },
      { text: 'Stock après', value: 'new_stock' }, { text: 'Fournisseur', value: 'supplier' },
      { text: 'Référence', value: 'reference' }, { text: "Date d'achat", value: 'purchase_date' },
      { text: 'Prix unitaire', value: 'unit_price' }, { text: 'Prix total', value: 'total_price' },
      { text: 'Opérateur', value: 'username' },
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
      return type === 'replenishment' ? 'Réapprovisionnement' : type === 'inventory' ? 'Inventaire' : type
    },
    async load() {
      this.loading = true
      await this.$store.dispatch('stockInventory/getItemDetail', this.$route.params.id)
      this.loading = false
    },
    openReplenish() {
      this.replenishForm = {
        quantity: 1,
        supplier: this.item.default_supplier ?? '',
        reference: this.item.reference ?? '',
        purchase_date: new Date().toISOString().slice(0, 10),
        unit_price: this.item.average_unit_price ?? '',
        total_price: '',
        remark: '',
      }
      this.replenishDialog = true
    },
    openInventory() {
      this.inventoryForm = { quantity: this.item.current_stock, remark: '' }
      this.inventoryDialog = true
    },
    editItem() {
      if (this.item.item_type === 'product') {
        this.$router.push(`/products/edit/${this.item.product_id}`)
        return
      }
      const fields = ['name', 'unit', 'current_stock', 'minimum_stock', 'target_stock', 'category_label', 'reference', 'default_supplier', 'note']
      this.editForm = fields.reduce((form, key) => ({ ...form, [key]: this.item[key] ?? '' }), {})
      this.editDialog = true
    },
    async saveItem() {
      const success = await this.$store.dispatch('stockInventory/updateItem', { id: this.item.id, data: this.editForm })
      if (success) { this.editDialog = false; await this.load() }
    },
    async replenishItem() {
      const success = await this.$store.dispatch('stockInventory/replenishItem', { id: this.item.id, data: this.replenishForm })
      if (success) { this.replenishDialog = false; await this.load() }
    },
    async inventoryItem() {
      const success = await this.$store.dispatch('stockInventory/inventoryItem', { id: this.item.id, data: this.inventoryForm })
      if (success) { this.inventoryDialog = false; await this.load() }
    },
    async archiveIngredient() {
      if (!window.confirm(`Archiver ${this.item.name} ?`)) return
      const success = await this.$store.dispatch('stockInventory/archiveIngredient', this.item.id)
      if (success) this.$router.push('/stocks')
    },
    async deleteIngredient() {
      if (!window.confirm(`Supprimer ${this.item.name} ?`)) return
      const success = await this.$store.dispatch('stockInventory/deleteIngredient', this.item.id)
      if (success) this.$router.push('/stocks')
    },
  },
}
</script>

<style scoped>
.stock-detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  background: #fbfcfe;
}
.stock-detail-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: auto;
}
.stock-detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid #d9e3ee;
  border-radius: 8px;
  background: #fff;
}
.stock-detail-subtitle {
  color: #6b7280;
  font-size: 13px;
}
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stock-info-grid {
  padding: 18px;
}
.stock-info-tile {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 64px;
  padding: 12px;
  border: 1px solid #edf1f5;
  border-radius: 8px;
  background: #fff;
}
.stock-info-tile strong {
  display: block;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}
.stock-info-tile div div {
  color: #111827;
  font-size: 15px;
  font-weight: 500;
}
.stock-dialog-title {
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #edf1f5;
}
.stock-dialog-actions {
  padding: 12px 24px 20px;
}
.stock-table ::v-deep th {
  color: #4b5563 !important;
  font-weight: 600 !important;
}
@media (max-width: 720px) {
  .stock-detail-header,
  .stock-detail-title,
  .detail-actions {
    align-items: stretch;
    width: 100%;
  }
  .detail-actions .v-btn {
    flex: 1 1 100%;
  }
}
</style>

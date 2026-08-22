<template>
  <v-container>
    <Loading v-if="loading" />
    <div v-else-if="item">
      <div class="d-flex flex-wrap align-center mb-4 detail-actions">
        <h1 class="text-h5 mr-auto">{{ item.name }}</h1>
        <v-btn color="primary" class="text-none" @click="openReplenish"><v-icon left>mdi-package-up</v-icon>Reapprovisionner</v-btn>
        <v-btn outlined class="text-none" @click="openInventory"><v-icon left>mdi-clipboard-check</v-icon>Inventorier</v-btn>
        <v-btn outlined class="text-none" @click="editItem"><v-icon left>mdi-pencil</v-icon>Modifier</v-btn>
        <template v-if="item.item_type === 'ingredient'">
          <v-btn icon aria-label="Archiver" title="Archiver" @click="archiveIngredient"><v-icon>mdi-archive</v-icon></v-btn>
          <v-btn icon aria-label="Supprimer" title="Supprimer" @click="deleteIngredient"><v-icon>mdi-delete</v-icon></v-btn>
        </template>
      </div>

      <v-card outlined class="mb-4">
        <v-card-text>
          <v-row>
            <v-col cols="6" sm="3"><strong>Stock</strong><div>{{ item.current_stock }} {{ item.unit }}</div></v-col>
            <v-col cols="6" sm="3"><strong>Minimum</strong><div>{{ item.minimum_stock }}</div></v-col>
            <v-col cols="6" sm="3"><strong>Cible</strong><div>{{ item.target_stock }}</div></v-col>
            <v-col cols="6" sm="3"><strong>Prix moyen</strong><div>{{ formatEstimatedPrice(item.average_unit_price) }}</div></v-col>
            <v-col cols="12" sm="4"><strong>Fournisseur</strong><div>{{ item.default_supplier || 'Non renseigne' }}</div></v-col>
            <v-col cols="12" sm="4"><strong>Reference</strong><div>{{ item.reference || 'Non renseigne' }}</div></v-col>
            <v-col cols="12" sm="4"><strong>Statut</strong><div>{{ item.status }}</div></v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-data-table :headers="headers" :items="movements">
        <template #[`item.movement_type`]="{ item: movement }">{{ movementLabel(movement.movement_type) }}</template>
        <template #[`item.unit_price`]="{ item: movement }">{{ formatEstimatedPrice(movement.unit_price) }}</template>
        <template #[`item.total_price`]="{ item: movement }">{{ formatEstimatedPrice(movement.total_price) }}</template>
      </v-data-table>
    </div>

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

    <v-dialog v-model="inventoryDialog" max-width="520">
      <v-card>
        <v-card-title>Inventaire rapide</v-card-title>
        <v-card-text><v-text-field v-model="inventoryForm.quantity" label="Quantite constatee" type="number" min="0" step="1" /><v-textarea v-model="inventoryForm.remark" label="Remarque" /></v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="inventoryDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="inventoryItem">Enregistrer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editDialog" max-width="640">
      <v-card>
        <v-card-title>Modifier l ingredient</v-card-title>
        <v-card-text>
          <v-text-field v-model="editForm.name" label="Nom" />
          <v-text-field v-model="editForm.unit" label="Unite" />
          <v-row>
            <v-col cols="12" sm="4"><v-text-field v-model="editForm.current_stock" label="Stock actuel" type="number" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="editForm.minimum_stock" label="Minimum" type="number" /></v-col>
            <v-col cols="12" sm="4"><v-text-field v-model="editForm.target_stock" label="Cible" type="number" /></v-col>
          </v-row>
          <v-text-field v-model="editForm.category_label" label="Categorie" />
          <v-text-field v-model="editForm.reference" label="Reference" />
          <v-text-field v-model="editForm.default_supplier" label="Fournisseur par defaut" />
          <v-textarea v-model="editForm.note" label="Note" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="editDialog = false">Annuler</v-btn><v-btn color="primary" class="text-none" @click="saveItem">Enregistrer</v-btn></v-card-actions>
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
      { text: 'Quantite', value: 'quantity' }, { text: 'Stock avant', value: 'previous_stock' },
      { text: 'Stock apres', value: 'new_stock' }, { text: 'Fournisseur', value: 'supplier' },
      { text: 'Reference', value: 'reference' }, { text: 'Date achat', value: 'purchase_date' },
      { text: 'Prix unitaire', value: 'unit_price' }, { text: 'Prix total', value: 'total_price' },
      { text: 'Operateur', value: 'username' },
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
.detail-actions { gap: 8px; }
</style>

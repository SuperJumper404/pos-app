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
    </v-card>
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
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('orders/getAllOrder').finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    searchData() {
      this.$store.dispatch('orders/getAllOrder')
    },
  },
}
</script>

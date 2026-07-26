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
    <v-card v-else outlined class="mt-5 overflow-y-auto" style="height: 350px">
      <v-app-bar flat color="grey lighten-4" light>
        <v-btn
          color="success"
          class="text-none mr-3"
          @click="$router.push('/stocks/newstock')"
          ><v-icon>mdi-plus</v-icon> Ajouter un mouvement</v-btn
        >
        <v-spacer></v-spacer>
        <div class="mt-6">
          <v-text-field
            placeholder="Rechercher un opérateur"
            label="Rechercher"
            outlined
            dense
            append-icon="mdi-card-search"
            @keyup="searchData()"
          ></v-text-field>
        </div>
      </v-app-bar>
      <v-data-table
        :headers="headers"
        :items="dataStocks"
        :items-per-page="5"
        class="elevation-1"
      >
        <template #[`item.created`]="{ item }">
          <span>{{ setFormatDate(item.created) }}</span>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import formatdate from '@/helpers/formatdate'
export default {
  components: {
    Loading,
  },
  mixins: [formatdate],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      headers: [
        {
          text: 'Date',
          align: 'start',
          sortable: false,
          value: 'created',
        },
        { text: 'Produit', value: 'productid' },
        { text: 'Quantité', value: 'qty' },
        { text: "ID de l'opérateur", value: 'operator' },
        { text: 'Opérateur', value: 'username' },
        { text: 'Remarque', value: 'remark' },
      ],
    }
  },

  computed: {
    dataStocks() {
      return this.$store.get('stocks/dataStock')
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('stocks/getAllStock').finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    searchData() {
      this.$store.dispatch('stocks/getAllStock')
    },
  },
}
</script>

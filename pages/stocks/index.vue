<template>
  <v-container>
    <Breadcrumbs />
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
          class="text-capitalize mr-3"
          @click="$router.push('/stocks/newstock')"
          ><v-icon>mdi-plus</v-icon> Stocks</v-btn
        >
        <v-spacer></v-spacer>
        <div class="mt-6">
          <v-text-field
            placeholder="Search name operator"
            label="Seaching"
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
import Breadcrumbs from '@/components/breadcrumbs'
import Loading from '@/components/loading'
import formatdate from '@/helpers/formatdate'
export default {
  components: {
    Breadcrumbs,
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
        { text: 'Product', value: 'productid' },
        { text: 'Quantity', value: 'qty' },
        { text: 'ID Operator', value: 'operator' },
        { text: 'Operator', value: 'username' },
        { text: 'Remark', value: 'remark' },
      ],
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

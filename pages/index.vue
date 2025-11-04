<template>
  <v-container>
    <v-card outlined class="d-flex align-center mt-10">
      <v-card-title class="pa-5 d-block" style="width: 50%">
        <v-row dense>
          <!-- FROM -->
          <v-col cols="12" sm="6" md="4">
            <v-menu
              v-model="menuFrom"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="from"
                  label="Date de début"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="from"
                locale="fr"
                @input="menuFrom = false"
              ></v-date-picker>
            </v-menu>
          </v-col>

          <!-- TO -->
          <v-col cols="12" sm="6" md="4">
            <v-menu
              v-model="menuTo"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="to"
                  label="Date de fin"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="to"
                :min="from"
                locale="fr"
                @input="menuTo = false"
              ></v-date-picker>
            </v-menu>
          </v-col>

          <!-- Bouton charger -->
          <v-col cols="12" md="4" class="d-flex align-end">
            <v-btn color="primary" @click="fetchMetrics">
              Charger les KPI
            </v-btn>
          </v-col>
        </v-row>

        <!-- <h5 v-if="accessUser === 0">You are logged in as administrator.</h5>
        <h5 v-else-if="accessUser === 1">You are logged in as cashier.</h5>
        <h5 v-else>You are logged in as customer.</h5> -->
      </v-card-title>
    </v-card>

    <v-card outlined class="d-flex align-center mt-10">
      <v-row>
        <h2>Total Caisse</h2>
      </v-row>
      <br />
      <h1>{{ metrics.totalRevenue }}</h1></v-card
    >
    <Loading v-if="loadPage && !accessUser" />

    <!-- <pre type="json">{{ totalProduct }}</pre> -->
    <pre type="json">{{ metrics }}</pre>
    <!-- <pre type="json">{{ totalCategory }}</pre> -->
    <!-- <pre type="json">{{ totalProduct }}</pre>
    <pre type="json">{{ totalStock }}</pre> -->
  </v-container>
</template>

<template>
  <v-container>
    <!-- Filtres de date -->
    <v-card outlined class="d-flex align-center mt-10">
      <v-card-title class="pa-5 d-block" style="width: 100%">
        <v-row dense>
          <v-btn small outlined color="primary" @click="setToday"
            >Aujourd’hui</v-btn
          >
          <v-btn small outlined color="secondary" @click="setYesterday"
            >Hier</v-btn
          >
          <v-btn small outlined color="success" @click="setThisWeek"
            >Semaine en cours</v-btn
          >

          <!-- FROM -->
          <v-col cols="12" sm="2" md="2">
            <v-menu
              v-model="menuFrom"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="from"
                  label="Date de début"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="from"
                locale="fr"
                @input="menuFrom = false"
              ></v-date-picker>
            </v-menu>
          </v-col>

          <!-- TO -->
          <v-col cols="12" sm="6" md="2">
            <v-menu
              v-model="menuTo"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="to"
                  label="Date de fin"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="to"
                :min="from"
                locale="fr"
                @input="menuTo = false"
              ></v-date-picker>
            </v-menu>
          </v-col>

          <!-- Bouton charger -->
          <v-col cols="12" md="4" class="d-flex align-end">
            <v-btn color="primary" @click="fetchMetrics">
              Charger les KPI
            </v-btn>
          </v-col>
        </v-row>
      </v-card-title>
    </v-card>

    <!-- Résumé général -->
    <v-row class="mt-6" dense>
      <v-col cols="12" sm="6" md="3">
        <v-card outlined>
          <v-card-title>💰 Total Caisse</v-card-title>
          <v-card-text
            ><strong>{{ metrics.totalRevenue }} €</strong></v-card-text
          >
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card outlined>
          <v-card-title>📦 Commandes</v-card-title>
          <v-card-text
            ><strong>{{ metrics.totalOrders }}</strong></v-card-text
          >
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card outlined>
          <v-card-title>🧾 Ticket moyen</v-card-title>
          <v-card-text
            ><strong>{{ metrics.averageOrder }} €</strong></v-card-text
          >
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card outlined>
          <v-card-title>⏱️ Temps moyen préparation</v-card-title>
          <v-card-text
            ><strong
              >{{ metrics.averageOrderPreparationTime }} min</strong
            ></v-card-text
          >
        </v-card>
      </v-col>
    </v-row>

    <!-- Paiements -->
    <v-card class="mt-6" outlined>
      <v-card-title>💳 Répartition des paiements</v-card-title>
      <v-data-table
        :headers="[
          { text: 'Moyen', value: 'name' },
          { text: 'Montant (€)', value: 'amount' },
          { text: 'Pourcentage (%)', value: 'percentage' },
        ]"
        :items="metrics.paymentsSummary"
        dense
        hide-default-footer
      />
    </v-card>

    <!-- Produits -->
    <v-card class="mt-6" outlined>
      <v-card-title>🔥 Top Produits</v-card-title>
      <v-data-table
        :headers="[
          { text: 'Produit', value: 'name' },
          { text: 'Quantité', value: 'qty' },
          { text: 'Revenu (€)', value: 'revenue' },
        ]"
        :items="metrics.topProducts"
        dense
        hide-default-footer
      />
    </v-card>

    <Loading v-if="loadPage && !accessUser" />
  </v-container>
</template>

<script>
import listdashboard from '@/helpers/listdashboard'
import Loading from '@/components/loading'
export default {
  components: {
    Loading,
  },
  mixins: [listdashboard],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: ['auth'],
  data() {
    return {
      loadPage: false,
      accessUser: 0,
      menuFrom: false,
      menuTo: false,
      from: '',
      to: '',
    }
  },
  head() {
    return {
      title: 'Accueil',
    }
  },
  computed: {
    // totalProduct() {
    //   console.log('Init Product')
    //   return this.$store.get('products/dataProduct')
    // },
    // totalCategory() {
    //   return this.$store.get('categories/dataCategories')
    // },
    // totalStock() {
    //   return this.$store.get('stocks/dataStock')
    // },
    // totalOrder() {
    //   return this.$store.get('orders/dataOrders')
    // },
    metrics() {
      return this.$store.get('history/metrics')
    },
  },
  mounted() {
    // Initialisation des variables
    this.loadPage = true
    this.accessUser = parseInt(localStorage.getItem('access'))
    const apiCalls = []

    // Configurer les appels API en fonction du niveau d'accès de l'utilisateur
    if (this.accessUser === 2) {
      this.$router.push('/menus')
      apiCalls.push(
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('orders/getAllOrder')
      )
    }

    if (this.accessUser === 0) {
      apiCalls.push(
        this.$store.dispatch('products/getProducts'),
        this.$store.dispatch('categories/getAllCategories'),
        this.$store.dispatch('stocks/getAllStock'),
        this.$store.dispatch('orders/getAllOrder'),
        this.$store.dispatch('tables/getAllTables'),
        this.$store.dispatch('shop/getShopInfo'),
        this.$store.dispatch('history/getMetrics')
      )
    }

    // Affichage d'un message de confirmation dans la console
    console.log('Initialisation du magasin effectuée avec succès')

    // Attendre que tous les appels API soient terminés avant de désactiver loadPage
    Promise.all(apiCalls).finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    fetchMetrics() {
      this.$store.dispatch('history/getMetrics', {
        from: this.from,
        to: this.to,
      })
    },
    setToday() {
      const today = new Date()
      const iso = today.toISOString().slice(0, 10)
      this.from = iso
      this.to = iso
      this.fetchMetrics()
    },
    setYesterday() {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const iso = yesterday.toISOString().slice(0, 10)
      this.from = iso
      this.to = iso
      this.fetchMetrics()
    },
    setThisWeek() {
      const today = new Date()
      const dayOfWeek = today.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)) // Lundi

      const fromIso = monday.toISOString().slice(0, 10)
      const toIso = today.toISOString().slice(0, 10)

      this.from = fromIso
      this.to = toIso
      this.fetchMetrics()
    },
  },
}
</script>

<template>
  <v-container>
    <!-- Filtres de date -->
    <v-card outlined class="mt-10">
      <v-card-title class="pt-0 pb-0 d-flex justify-center" style="width: 100%">
        <v-spacer></v-spacer>
        <v-btn
          class="mr-2 ml-2"
          small
          :outlined="!(currentDateButton === 1)"
          color="primary"
          @click="setToday"
          >Aujourd’hui</v-btn
        >
        <v-btn
          class="mr-2 ml-2"
          small
          :outlined="!(currentDateButton === 2)"
          color="secondary"
          @click="setYesterday"
          >Hier</v-btn
        >
        <v-btn
          class="mr-2 ml-2"
          small
          :outlined="!(currentDateButton === 3)"
          color="success"
          @click="setThisWeek"
          >Semaine en cours</v-btn
        >
        <v-btn
          :class="[
            'mr-2',
            'ml-2',
            {
              'primaryWhite--text': currentDateButton === 4,
            },
          ]"
          small
          :outlined="!(currentDateButton === 4)"
          color="primaryPurple"
          @click="setThisMonth"
        >
          Mois en cours
        </v-btn>

        <v-spacer></v-spacer>
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
        <v-spacer></v-spacer>
        <!-- Bouton charger -->
        <v-btn color="primary" class="text-none" @click="fetchMetrics">
          Raffraîchir
        </v-btn>
        <v-spacer></v-spacer>
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
      currentDateButton: 1,
      from: '',
      to: '',
    }
  },

  computed: {
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
    if (this.accessUser === 2 || this.accessUser === 3) {
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
        this.$store.dispatch('history/getMetrics'),
        this.$store.dispatch('shop/getShopInfo')
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
      this.currentDateButton = 1
      const today = new Date()
      const iso = today.toISOString().slice(0, 10)
      this.from = iso
      this.to = iso
      this.fetchMetrics()
    },
    setYesterday() {
      this.currentDateButton = 2
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const iso = yesterday.toISOString().slice(0, 10)
      this.from = iso
      this.to = iso
      this.fetchMetrics()
    },
    setThisWeek() {
      this.currentDateButton = 3
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
    setThisMonth() {
      this.currentDateButton = 4
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1) // First day of the month

      const fromIso = firstDayOfMonth.toISOString().slice(0, 10)
      const toIso = today.toISOString().slice(0, 10)

      this.from = fromIso
      this.to = toIso
      this.fetchMetrics()
    },
  },
}
</script>

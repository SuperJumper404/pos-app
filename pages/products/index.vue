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
    <v-card v-else outlined class="mt-5 overflow-y-auto">
      <v-app-bar flat color="grey lighten-4" light class="d-flex justify-end">
        <v-btn
          color="primaryPurple lighten-1"
          class="primaryWhite--text text--lighten-1 mr-3 text-none"
          @click="$router.push('/products/newproduct')"
          ><v-icon>mdi-plus</v-icon> Ajouter un produit</v-btn
        >
      </v-app-bar>
      <v-card-title
        v-if="dataProduct.length == 0"
        class="d-md-flex d-sm-none d-none justify-center"
      >
        <v-icon large>mdi-emoticon-neutral-outline</v-icon>
        <h4>Product Empty</h4>
      </v-card-title>
      <!-- md -->
      <div v-else>
        <v-card
          v-for="items in dataProduct"
          :key="items.id"
          outlined
          :disabled="items.archived === 1"
          class="pa-2 d-md-flex d-sm-none d-none justify-space-between ma-3"
        >
          <v-img
            :src="
              items.image
                ? `${staticurl}/api/v1/imgproducts/${items.image}`
                : `${staticurl}/api/v1/imgproducts/default.png`
            "
            width="120"
          ></v-img>
          <v-card-text
            class="d-flex justify-content-between align-items-center mt-5"
          >
            <p class="font-weight-bold mr-4" style="flex: 1">
              {{ items.name }}
            </p>
            <p class="mr-4" style="flex: 1">{{ items.category }}</p>
            <p class="mr-4" style="flex: 1">{{ conversiRp(items.price) }} €</p>
            <p class="mr-4" style="flex: 1">Stock: {{ items.stock }}</p>
          </v-card-text>

          <v-card-actions class="d-md-flex">
            <!-- Si pas archivé : boutons visibles -->
            <template v-if="items.archived === 0">
              <v-btn
                color="primary"
                class="text-none"
                @click="$router.push(`/products/edit/${items.id}`)"
              >
                Modifier
              </v-btn>

              <v-btn
                color="red darken-1"
                dark
                class="text-none"
                @click="
                  $router.push(`/products/delete/${items.id}?modals=true`)
                "
              >
                Supprimer
              </v-btn>
            </template>

            <!-- Si archivé : on garde 2 boutons "fantômes" (même taille) -->
            <template v-else>
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Modifier</v-btn
              >
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Supprimer</v-btn
              >
            </template>
          </v-card-actions>
        </v-card>
      </div>

      <!-- sm to xs -->
      <v-card-title
        v-if="dataProduct.length == 0"
        class="d-md-none d-sm-flex d-flex justify-center"
      >
        <v-icon large>mdi-emoticon-neutral-outline</v-icon>
        <h4>Product Empty</h4>
      </v-card-title>

      <div v-else>
        <v-card
          v-for="itm in dataProduct"
          :key="itm.name"
          outlined
          :disabled="itm.archived === 1"
          class="pa-2 d-block d-sm-block d-md-none ma-5"
        >
          <v-img
            :src="
              itm.image
                ? `${staticurl}/api/v1/imgproducts/${itm.image}`
                : `${staticurl}/api/v1/imgproducts/default.png`
            "
            width="100%"
          ></v-img>
          <v-card-text>
            <p class="font-weight-bold">{{ itm.name }}</p>
            <p>{{ itm.category }}</p>
            <p>{{ conversiRp(itm.price) }} €</p>
            <p>Stock: {{ itm.stock }}</p>
          </v-card-text>
          <v-card-actions class="d-md-flex">
            <!-- Si pas archivé : boutons visibles -->
            <template v-if="itm.archived === 0">
              <v-btn
                color="primary"
                class="text-none"
                @click="$router.push(`/products/edit/${items.id}`)"
              >
                Modifier
              </v-btn>

              <v-btn
                color="red darken-1"
                dark
                class="text-none"
                @click="
                  $router.push(`/products/delete/${items.id}?modals=true`)
                "
              >
                Supprimer
              </v-btn>
            </template>

            <!-- Si archivé : on garde 2 boutons "fantômes" (même taille) -->
            <template v-else>
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Modifier</v-btn
              >
              <v-btn class="text-none" disabled style="visibility: hidden"
                >Supprimer</v-btn
              >
            </template>
          </v-card-actions>
        </v-card>
      </div>
    </v-card>
    <!-- pagination -->
    <v-row class="mt-2 justify-end">
      <v-pagination
        :length="totalPage"
        :total-visible="5"
        prev-icon="mdi-menu-left"
        next-icon="mdi-menu-right"
        color="grey lighten-2"
        circle
        class="my-4"
        @input="pageProduct('')"
      ></v-pagination>
    </v-row>
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import price from '@/helpers/price'
export default {
  components: {
    Loading,
  },
  mixins: [price],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
    }
  },

  computed: {
    staticurl() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    dataProduct() {
      const arr = this.$store.get('products/dataProduct') || []
      return [...arr].sort((a, b) => (a.archived ?? 0) - (b.archived ?? 0))
    },
    totalPage() {
      return this.$store.get('products/totalPage')
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('products/getProducts').finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    pageProduct() {
      this.$store.dispatch('products/getProducts')
    },
  },
}
</script>

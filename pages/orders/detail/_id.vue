<template>
  <v-container>
    <div v-if="!isMobile">
      <v-card
        v-if="loadPage"
        outlined
        class="mt-5 overflow-y-auto"
        style="height: 350px"
      >
        <Loading />
      </v-card>
      <v-card
        v-else
        outlined
        class="mt-5 overflow-y-auto"
        style="height: 400px"
      >
        <v-card
          v-for="(itm, i) in detailOrder"
          :key="i"
          outlined
          class="mb-3 d-flex justify-space-between align-center pa-2"
        >
          <v-img
            :src="`${staticURL}/api/v1/imgproducts/${itm.image}`"
            max-width="120px"
          ></v-img>
          <!-- //TODO Faire en sorte que les colonnes soient bien alignées sur mobile -->
          <v-card-text class="">
            <v-row align="center" no-gutters>
              <!-- Produit -->
              <v-col cols="2" class="d-flex align-center justify-center">
                <div class="text-center">
                  <div
                    class="text-center text-truncate"
                    style="
                      font-weight: bold;
                      font-size: large;
                      color: rgba(0, 0, 0, 0.8);
                    "
                  >
                    {{ itm.name }}
                  </div>
                  <div
                    class="text-center text-truncate"
                    style="
                      font-weight: bold;
                      font-size: large;
                      color: rgba(0, 0, 0, 0.8);
                    "
                  >
                    {{ itm.subtotal }} €
                  </div>
                </div>
              </v-col>

              <!-- Customisations -->
              <v-col cols="4" class="text-center">
                <v-chip
                  v-for="(customization, i) in itm.customizationList"
                  :key="i"
                  class="ma-1"
                >
                  {{ customization.name }}
                </v-chip>
              </v-col>

              <!-- Numéro de commande -->
              <v-col cols="3" class="text-center">
                <div style="font-size: large; color: rgba(0, 0, 0, 0.8)">
                  Numéro de commande
                </div>
                <h6
                  class="text-center text-truncate"
                  style="
                    font-weight: bold;
                    font-size: large;
                    color: rgba(0, 0, 0, 0.8);
                  "
                >
                  #{{ itm.ordernumber }}
                </h6>
              </v-col>

              <!-- Client -->
              <v-col cols="2" class="text-center">
                <div style="font-size: large; color: rgba(0, 0, 0, 0.8)">
                  Client
                </div>
                <h6
                  class="text-center text-truncate"
                  style="
                    font-weight: bold;
                    font-size: large;
                    color: rgba(0, 0, 0, 0.8);
                  "
                >
                  {{ itm.customer }}
                </h6>
              </v-col>

              <!-- Quantité -->
              <v-col cols="1" class="text-center">
                <v-btn
                  style="font-size: x-large"
                  color="success"
                  fab
                  small
                  dark
                >
                  {{ itm.qty }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-card>
      <v-alert
        class="my-4"
        outlined
        text
        type="info"
        transition="scroll-x-transition"
        border="left"
        v-if="detailOrder[0] !== undefined && detailOrder[0].remark !== null"
      >
        Notes : {{ detailOrder[0].remark }}
      </v-alert>
      <v-card color="grey lighten-3" class="mt-5">
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" class="text-none" @click="$router.go(-1)"
            >Retour <v-icon small right>mdi-arrow-left</v-icon></v-btn
          >
        </v-card-actions>
      </v-card>
    </div>
    <div v-if="isMobile">
      <v-card
        v-if="loadPage"
        outlined
        class="mt-5 overflow-y-auto"
        style="height: 350px"
      >
        <Loading />
      </v-card>
      <v-card
        v-else
        outlined
        class="mt-5 overflow-y-auto"
        style="height: 400px"
      >
        <v-card
          v-for="(itm, i) in detailOrder"
          :key="i"
          outlined
          class="mb-3 d-flex flex-column"
          rounded="7"
        >
          <!-- TOP ROW -->
          <v-row class="align-center mx-2 mt-2 w-100" no-gutters>
            <!-- LEFT: image + name/price -->
            <v-col class="d-flex align-center min-w-0">
              <v-avatar size="75" rounded tile class="mr-3">
                <v-img
                  class="rounded-lg"
                  :src="`${staticURL}/api/v1/imgproducts/${itm.image}`"
                />
              </v-avatar>

              <div class="min-w-0">
                <div
                  class="text-truncate font-weight-bold"
                  style="font-size: large; color: rgba(0, 0, 0, 0.8)"
                >
                  {{ itm.name }}
                </div>
                <div class="font-weight-bold" style="color: rgba(0, 0, 0, 0.8)">
                  {{ itm.price }} €
                </div>
              </div>
            </v-col>

            <!-- RIGHT: customer + order + qty -->
            <v-col
              cols="auto"
              class="d-flex align-center justify-center ml-auto"
              style="flex-wrap: nowrap"
            >
              <div class="text-right mr-8">
                <div
                  class="text-truncate font-weight-bold"
                  style="color: rgba(0, 0, 0, 0.8)"
                >
                  {{ itm.customer }}
                </div>
                <div
                  class="text-truncate font-weight-bold"
                  style="color: rgba(0, 0, 0, 0.8)"
                >
                  #{{ itm.ordernumber }}
                </div>
              </div>

              <v-btn
                style="font-size: x-large"
                class="mr-2"
                color="success"
                fab
                small
                dark
              >
                {{ itm.qty }}
              </v-btn>
            </v-col>
          </v-row>

          <!-- CHIPS ROW -->
          <v-row class="mx-2 mb-2" no-gutters>
            <v-col class="pt-2">
              <v-chip
                v-for="(customization, j) in itm.customizationList"
                :key="j"
                class="ma-1"
              >
                {{ customization.name }}
              </v-chip>
            </v-col>
          </v-row>
        </v-card>
      </v-card>
      <v-alert
        class="my-4"
        outlined
        text
        type="info"
        transition="scroll-x-transition"
        border="left"
        v-if="detailOrder[0] !== undefined && detailOrder[0].remark !== null"
      >
        Notes : {{ detailOrder[0].remark }}
      </v-alert>
      <v-card color="grey lighten-3" class="mt-5">
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" class="text-none" @click="$router.go(-1)"
            >Retour <v-icon small right>mdi-arrow-left</v-icon></v-btn
          >
        </v-card-actions>
      </v-card>
    </div>
    <!-- <pre type="json">{{ detailOrder }}</pre> -->
  </v-container>
</template>
<script>
import price from '@/helpers/price'
export default {
  mixins: [price],
  middleware: 'auth',
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  data() {
    return {
      id: this.$route.params.id,
      loadPage: false,
    }
  },

  computed: {
    isMobile() {
      return this.$vuetify.breakpoint.smAndDown
    },
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    detailOrder() {
      return this.$store.get('orders/detailOrder')
    },
  },
  async mounted() {
    this.loadPage = true
    const res = await this.$store.dispatch('orders/getDetailOrder', this.id)
    console.log('res detail order ID ', this.detailOrder)
    if (res) {
      this.loadPage = false
    }
  },
}
</script>

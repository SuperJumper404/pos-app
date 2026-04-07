<template>
  <v-container>
    <v-row class="mt-8">
      <v-col md="8" sm="12" cols="12">
        <v-card outlined height="100%" class="pa-2 overflow-y-auto">
          <v-card-text v-if="!dataCart" class="row justify-center">
            <p style="margin-top: 30vh">
              <v-icon size="90">mdi-room-service-outline</v-icon> Votre assiette
              est vide !
            </p>
          </v-card-text>
          <div v-else>
            <v-card
              v-for="itm in dataCart"
              :key="itm.id"
              outlined
              class="d-flex mb-2 flex-column"
              rounded="7"
            >
              <v-row class="d-flex align-center mr-2 ml-2 mt-2" no-gutters>
                <!-- Left block: avatar + texts -->
                <v-col class="d-flex align-center">
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
                    <div
                      class="font-weight-bold"
                      style="color: rgba(0, 0, 0, 0.8)"
                    >
                      {{ itm.price }} €
                    </div>
                  </div>
                </v-col>

                <!-- Right block: qty -->
                <v-col class="d-flex align-center justify-end" cols="auto">
                  <v-btn
                    class="mx-2"
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

              <!-- Chips below -->
              <v-col class="pt-2">
                <v-chip
                  v-for="(choice, index) in itm.customizationList"
                  :key="index"
                  class="mr-1 mt-1"
                >
                  {{ choice.name }}
                </v-chip>
              </v-col>
            </v-card>
          </div>
        </v-card>
      </v-col>
      <v-col md="4" sm="12" cols="12">
        <v-card v-if="access === 0" outlined class="pa-2 mb-3">
          <v-select
            v-model="selectedTable"
            :items="dataTables"
            item-text="username"
            item-value="id"
            :rules="[(v) => !!v || 'Veuillez sélectionner une table']"
            label="Sélectionner une table"
            default
            required
          ></v-select>
        </v-card>
        <v-card v-if="loadPage" outlined class="pa-2">
          <Loading />
        </v-card>
        <v-card v-else outlined class="pa-2 overflow-x-hidden overflow-y-auto">
          <v-card-actions v-if="!dataCart">
            <v-btn
              color="primary"
              width="100%"
              dark
              class="text-none"
              @click="$router.push('/menus')"
              >Retourner au menu</v-btn
            >
          </v-card-actions>
          <v-form v-else v-model="isValue" @submit.prevent="paymentBtn">
            <v-text-field
              v-model="formuser.customer"
              type="text"
              label="Nom du client"
              :rules="[(v) => !!v || 'Veuillez saisir le nom']"
              placeholder="Saisir le nom du client"
              required
            ></v-text-field>
            <v-text-field
              v-model="formuser.phone"
              type="tel"
              prepend-inner-icon="mdi-phone"
              label="Numéro de téléphone"
              :rules="[
                (v) =>
                  /^[0-9]+$/.test(v) || 'Seuls les chiffres sont autorisés',
              ]"
              placeholder="Saisir le numéro de téléphone"
              class="mb-5"
              required
            ></v-text-field>
            <!-- <v-select
              v-model="formuser.payment"
              :items="items"
              label="Méthodes de paiement"
              :rules="[(v) => !!v || 'Méthodes de paiement requises']"
            ></v-select> -->
            <v-textarea
              v-model="formuser.notes"
              label="Note à la commande"
              :rows="2"
              filled
              prepend-inner-icon="mdi-comment"
              placeholder="Ajouter une note à la commande"
            ></v-textarea>
            <!-- struc -->
            <v-card-title>
              <h5>Total</h5>
              <v-spacer></v-spacer>
              <h5>{{ conversiRp(total) }} €</h5>
            </v-card-title>
            <v-card-text> </v-card-text>
            <v-card-actions>
              <v-btn
                :disabled="!isValue"
                :loading="loadingBtn"
                type="submit"
                color="success"
                width="50%"
                class="text-none"
                >Commander</v-btn
              >

              <v-btn
                color="red lighten-1"
                width="50%"
                dark
                class="text-none"
                @click="cancelCart"
                >Annuler</v-btn
              >
            </v-card-actions>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
    <!-- {{ dataCart }}
    <pre>acces :{{ access }}</pre>
    <pre>current table : {{ selectedTable }}</pre> -->
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
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  data: () => ({
    ppn: 0,
    total: 0,
    isValue: false,
    loadingBtn: false,
    loadPage: false,
    selectedTable: parseInt(localStorage.getItem('idUser')),
    access: parseInt(localStorage.getItem('access')),
    formuser: {
      customer: '',
      phone: '',
      payment: 'Espèce',
      notes: '',
    },
    // Pour le moment on a que l'espece
    items: ['Carte Bleu ', 'Espèce', 'Ticket Restaurant'],
  }),
  computed: {
    staticURL() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    dataCart() {
      return this.$store.get('cart/dataCart')
    },
    totalCart() {
      return this.$store.get('cart/totalCart')
    },
    insertId() {
      return this.$store.get('cart/insertId')
    },
    message() {
      return this.$store.get('cart/message')
    },
    dataTables() {
      // ICI on ne  filtre pas les tables car on veut tout recup sinon on filter sur  acces === 2
      const result = this.$store.get('tables/dataTables') || []
      // const filtered = result.filter((x) => x.access === 2)
      return result
    },
  },
  mounted() {
    this.total = this.totalCart
  },
  methods: {
    async paymentBtn() {
      const params = {
        customer: this.formuser.customer,
        customerID: this.selectedTable,
        subtotal: this.total,
        payment: this.formuser.payment,
        remark: this.formuser.notes,
        phone: this.formuser.phone,
        status: 1, // 1 pending & 2 approve
        created: new Date(),
      }
      console.log('Parametre de la commande ', params)
      const res = await this.$store.dispatch('cart/postOrder', params)
      if (res) {
        this.dataCart.forEach((e) => {
          const detailData = {
            orderid: this.insertId,
            productid: e.id,
            price: e.price,
            qty: e.qty,
            total: e.qty * e.price,
            remark: 'Transaction',
            customizationList: e.customizationList,
            operator: 2,
          }
          const detail = this.$store.dispatch(
            'cart/postDetailOrder',
            detailData
          )
          if (detail) {
            // alert('Order success!')
            this.$store.set('stateDialog', false)
            this.$router.push('/menus')
          } else {
            this.$store.set('stateDialog', false)
            this.$router.push('/menus')
          }
        })
      } else {
        // console.log(this.message)
      }
    },
    cancelCart() {
      this.$store.set('stateDialog', false)
      this.$store.dispatch('cart/setTotal', 0)
      this.$store.dispatch('cart/setIndex', 0)
      this.$router.push('/menus')
    },
  },
}
</script>

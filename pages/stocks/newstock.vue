<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>
    <div class="mt-5">
      <h3>Nouveau mouvement de stock</h3>
    </div>
    <v-form v-model="isValue">
      <v-select
        v-model="formstock.productid"
        :items="dataProduct"
        :rules="[(v) => !!v || 'Le produit est requis']"
        item-value="id"
        item-text="name"
        label="Produit"
        required
      ></v-select>
      <v-text-field
        v-model="formstock.qty"
        label="Quantité"
        type="number"
        :rules="[(v) => !!v || 'La quantité est requise']"
        placeholder="Saisir la quantité"
        required
      ></v-text-field>
      <v-textarea
        v-model="formstock.remark"
        name="input-2-1"
        label="Remarque"
        type="text"
        :rules="[(v) => !!v || 'La remarque est requise']"
        placeholder="Préciser l'ajout, le retrait ou l'ajustement"
        hint="La remarque est obligatoire."
        class="mb-5"
      ></v-textarea>
      <!-- sm upto md lg -->
      <div class="d-sm-flex d-none">
        <v-btn color="warning" @click.stop="$router.push('/stocks')"
          >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
        >
        <v-btn
          :disabled="!isValue"
          :loading="loadingBtn1"
          class="ml-2"
          color="success"
          dark
          @click="addStock"
          >Ajouter <v-icon small right>mdi-plus-circle</v-icon></v-btn
        >
        <v-btn
          :disabled="!isValue"
          :loading="loadingBtn2"
          class="ml-2"
          color="primary"
          dark
          @click="reduceStock"
          >Retirer <v-icon small right>mdi-minus-circle</v-icon></v-btn
        >
        <v-btn
          :disabled="!isValue"
          :loading="loadingBtn3"
          class="ml-2"
          color="red lighten-4"
          dark
          @click="adjusmentStock"
          >Ajuster <v-icon small right>mdi-tune</v-icon></v-btn
        >
      </div>
      <!-- xs -->
      <v-row class="d-sm-none d-flex justify-center">
        <v-col cols="6">
          <v-btn
            color="warning"
            small
            width="100%"
            @click.stop="$router.push('/stocks')"
            >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
          >
        </v-col>
        <v-col cols="6">
          <v-btn
            :disabled="!isValue"
            :loading="loadingBtn1"
            color="success"
            dark
            small
            width="100%"
            @click="addStock"
            >Ajouter <v-icon small right>mdi-plus-circle</v-icon></v-btn
          >
        </v-col>
        <v-col cols="6">
          <v-btn
            :disabled="!isValue"
            :loading="loadingBtn2"
            color="primary"
            dark
            small
            width="100%"
            @click="reduceStock"
            >Retirer <v-icon small right>mdi-minus-circle</v-icon></v-btn
          >
        </v-col>
        <v-col cols="6">
          <v-btn
            :disabled="!isValue"
            :loading="loadingBtn3"
            color="red lighten-4"
            dark
            small
            width="100%"
            @click="adjusmentStock"
            >Ajuster <v-icon small right>mdi-tune</v-icon></v-btn
          >
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>
<script>
export default {
  mixins: [],
  middleware: 'auth',
  data: () => ({
    errMsg: false,
    message: '',
    isValue: false,
    loadingBtn1: false,
    loadingBtn2: false,
    loadingBtn3: false,
    formstock: {
      productid: '',
      category: '',
      qty: '',
      operator: '',
      remark: '',
    },
  }),
  computed: {
    dataProduct() {
      return this.$store.get('products/dataProduct')
    },
  },
  mounted() {
    this.$store.dispatch('products/getProducts')
  },
  methods: {
    async addStock() {
      this.formstock.category = '0'
      this.formstock.operator = localStorage.getItem('idUser')
      this.loadingBtn1 = true
      const res = await this.$store.dispatch('stocks/postStock', this.formstock)
      if (res) {
        this.loadingBtn1 = false
        this.$router.push('/stocks')
      } else {
        this.loadingBtn1 = false
      }
    },
    async reduceStock() {
      this.formstock.category = '1'
      this.formstock.operator = localStorage.getItem('idUser')
      this.loadingBtn2 = true
      const res = await this.$store.dispatch('stocks/postStock', this.formstock)
      if (res) {
        this.loadingBtn2 = false
        this.$router.push('/stocks')
      } else {
        this.loadingBtn2 = false
      }
    },
    async adjusmentStock() {
      this.formstock.category = '2'
      this.formstock.operator = localStorage.getItem('idUser')
      this.loadingBtn3 = true
      const res = await this.$store.dispatch('stocks/postStock', this.formstock)
      if (res) {
        this.loadingBtn3 = false
        this.$router.push('/stocks')
      } else {
        this.loadingBtn3 = false
      }
    },
  },
}
</script>

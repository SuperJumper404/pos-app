<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>
    <v-row v-else class="mt-5">
      <v-col md="4" sm="5" cols="12">
        <ImageCropper v-model="productImg" />
      </v-col>
      <v-col>
        <v-form v-model="isValue" @submit.prevent="submitProduct">
          <v-text-field
            v-model="formproduct.name"
            label="Nom du produit"
            type="text"
            :rules="[(v) => !!v || 'Le nom du produit est requis']"
            placeholder="Saisir le nom du produit"
            required
          ></v-text-field>
          <v-text-field
            v-model="formproduct.description"
            label="Description"
            type="text"
            :rules="[(v) => !!v || 'Description du produit requise']"
            placeholder="Saisir la description du produit"
            required
          ></v-text-field>
          <v-text-field
            v-model="formproduct.stock"
            label="Stock"
            type="number"
            :rules="[(v) => !!v || 'Quantité en stock requise']"
            placeholder="Saisir la quantité en stock"
            required
          ></v-text-field>

          <v-text-field
            v-model="formproduct.price"
            label="Prix HT"
            type="number"
            append-outer-icon="mdi-currency-eur"
            :rules="[(v) => !!v || 'Le prix du produit est requis']"
            placeholder="Saisir le prix du produit"
            required
          ></v-text-field>
          <v-select
            v-model="formproduct.categoryid"
            label="Catégorie"
            :items="allCategory"
            :rules="[(v) => !!v || 'La catégorie est requise']"
            item-value="id"
            item-text="name"
            placeholder=""
            required
          ></v-select>

          <v-btn
            color="success"
            class="text-none mr-3 mb-4"
            @click.stop="addCustomization"
            ><v-icon>mdi-plus</v-icon>Ajouter un choix </v-btn
          ><br />
          <div
            v-for="(custom, index) in formproduct.product_customization"
            :key="index"
          >
            <v-row>
              <!-- Row for Customization Name and Message -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formproduct.product_customization[index].name"
                  label="Nom du choix "
                  :rules="[(v) => !!v || 'Name required']"
                  placeholder="Enter name"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formproduct.product_customization[index].description"
                  label="Description du choix"
                  :rules="[(v) => !!v || 'Name required']"
                  placeholder="Enter description"
                  required
                ></v-text-field>
              </v-col>

              <!-- Row for Max Choices, Switch, and Combobox -->
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formproduct.product_customization[index].items"
                  label="Liste des choix possibles"
                  chips
                  multiple
                  :item-text="displayItem"
                  @change="processComboboxInput(index)"
                ></v-combobox> </v-col
              ><v-col cols="12" md="3">
                <v-text-field
                  v-model="
                    formproduct.product_customization[index].limit_choice
                  "
                  label="Nombre de choix maximum"
                  type="number"
                  :rules="[(v) => !!v || 'Nombre de choix maximum requis']"
                  placeholder="Saisir le nombre de choix maximum"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-switch
                  v-model="formproduct.product_customization[index].mandatory"
                  inset
                  label="Choix obligatoire ?"
                ></v-switch>
              </v-col>
            </v-row>
            <v-card
              v-if="formproduct.product_customization.length > 1"
              class="mx-auto"
              max-width="400"
            >
              <v-progress-linear
                color="success"
                rounded
                value="0"
              ></v-progress-linear>
            </v-card>
          </div>

          <v-btn
            :disabled="!isValue"
            :loading="loadingBtn"
            class="text-none"
            type="submit"
            color="primary"
            >Valider</v-btn
          >

          <v-btn
            class="text-none ml-4"
            color="warning"
            @click.stop="$router.push('/products')"
            >Annuler</v-btn
          >
        </v-form>
      </v-col>
    </v-row>

    <!-- <pre>{{ formproduct }}</pre> -->
  </v-container>
</template>
<script>
export default {
  components: {},
  mixins: [],
  middleware: 'auth',
  data: () => ({
    productImg: null,
    isValue: false,
    loadingBtn: false,
    errMsg: false,
    formproduct: {
      name: '',
      description: '',
      categoryid: '',
      price: '',
      stock: '',
      image: '',
      product_customization: [],
    },
  }),

  computed: {
    allCategory() {
      return this.$store.get('categories/dataCategories')
    },
    message() {
      return this.$store.get('products/message')
    },
  },
  watch: {
    productImg(newBlob) {
      const ext = newBlob.type === 'image/png' ? 'png' : 'jpg'
      const filename = `product_${Date.now()}.${ext}`
      const file = new File([newBlob], filename, { type: newBlob.type })
      this.formproduct.image = file
    },
  },
  mounted() {
    this.$store.dispatch('categories/getAllCategories')
  },
  methods: {
    processComboboxInput(index) {
      const lastItem =
        this.formproduct.product_customization[index].items.slice(-1)[0]

      if (typeof lastItem === 'string') {
        // Regex to match pattern 'Name (Price)'
        const match = lastItem.match(/^(.*)\s\(([\d,.]+)\)$/)

        if (match) {
          const name = match[1].trim()
          const price = parseFloat(match[2].replace(',', '.')) // Convert , to . if needed

          // Replace the last string item with an object
          this.formproduct.product_customization[index].items.splice(-1, 1, {
            name,
            price,
          })
        } else {
          // If no pattern match, consider the entire string as a name with a default price
          this.formproduct.product_customization[index].items.splice(-1, 1, {
            name: lastItem,
            price: 0,
          })
        }
      }
    },
    displayItem(item) {
      // Check if price is present and not zero to display it.
      return item.price && item.price !== 0
        ? `${item.name} (+${item.price}€)`
        : item.name
    },
    addCustomization() {
      this.formproduct.product_customization.push({
        name: '',
        message: '',
        limit_choice: null,
        items: [],
        mandatory: false,
      })
    },
    async submitProduct() {
      const fd = new FormData()
      fd.append('name', this.formproduct.name)
      fd.append('stock', this.formproduct.stock)
      fd.append('price', this.formproduct.price)
      fd.append('categoryid', this.formproduct.categoryid)
      fd.append('image', this.formproduct.image)
      fd.append('description', this.formproduct.description)
      fd.append(
        'product_customization',
        JSON.stringify(this.formproduct.product_customization)
      )

      this.loadingBtn = true
      const res = await this.$store.dispatch('products/postProducts', fd)
      if (res) {
        this.loadingBtn = false
        this.errMsg = false
        this.$router.push('/products')
      } else {
        this.errMsg = true
        this.loadingBtn = false
      }
    },
  },
}
</script>
<style>
hr.zig,
hr.zag {
  border: none;
  height: 30px;
  margin: 0 50px;
}

hr.zig {
  background: linear-gradient(-135deg, #fff 20px, rgba(0, 0, 0, 0) 0) 0 5px,
    linear-gradient(135deg, #fff 20px, rgba(0, 0, 0, 0) 0) 0 5px;
  background-color: rgba(0, 0, 0, 0);
  background-position: center bottom;
  background-repeat: repeat-x;
  background-size: 20px 40px;
  z-index: 100;
  position: relative;
}

hr.zag {
  background: linear-gradient(-135deg, #333 20px, rgba(0, 0, 0, 0) 0) 0 5px,
    linear-gradient(135deg, #333 20px, #fff 0) 0 5px;
  background-color: rgba(0, 0, 0, 0);
  background-position: center bottom;
  background-repeat: repeat-x;
  background-size: 20px 40px;
  z-index: 50;
  margin-top: -28px;
}
</style>

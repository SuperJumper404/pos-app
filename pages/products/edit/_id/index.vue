<template>
  <v-container>
    <div v-if="stsMsg">
      <p class="red--text">{{ message }}</p>
    </div>

    <Loading v-if="loadPage" />
    <v-row v-else class="mt-5">
      <v-col md="4" sm="5" cols="12">
        <v-card outlined>
          <!-- <v-img :src="`${staticURL}api/v1/imgproducts/${image}`" /> -->
          <ImageCropper
            v-model="productImg"
            :preview-url-prop="`${staticURL}api/v1/imgproducts/${formeditproduct.image}`"
          />
        </v-card>
      </v-col>
      <v-col md="8" sm="7" cols="12">
        <v-form v-model="isValue" @submit.prevent="submitEditProduct">
          <v-text-field
            v-model="formeditproduct.name"
            label="Nom du produit"
            type="text"
            :rules="[(v) => !!v || 'Nom du produit requis']"
            placeholder="Saisir le nom du produit"
            required
            autofocus
          />
          <v-text-field
            v-model="formeditproduct.description"
            label="Description"
            type="text"
            :rules="[(v) => !!v || 'Description du produit requise']"
            placeholder="Saisir la description du produit"
            required
            autofocus
          />
          <v-text-field
            v-model="formeditproduct.stock"
            label="Stock"
            class="d-inline-flex"
            type="number"
            :rules="[(v) => !!v || 'Stock required']"
            placeholder="Saisir le stock du produit"
            required
          />
          <br />
          <v-text-field
            v-model="formeditproduct.price"
            label="Prix HT"
            type="number"
            class="d-inline-flex"
            append-outer-icon="mdi-currency-eur"
            :rules="[(v) => !!v || 'Price required']"
            placeholder="Saisir le prix du produit"
            required
          />
          <br />
          <v-select
            v-model="formeditproduct.categoryid"
            :items="allCategory"
            :rules="[(v) => !!v || 'Catégorie requise']"
            item-value="id"
            class="d-inline-flex"
            item-text="name"
            label="Catégorie"
            required
          ></v-select>
          <br />
          <v-btn
            color="success"
            class="text-none mr-3 mb-4"
            @click.stop="addCustomization"
            ><v-icon>mdi-plus</v-icon>Ajouter un choix </v-btn
          ><br />
          <div
            v-for="(custom, index) in formeditproduct.product_customization"
            :key="index"
          >
            <v-row>
              <!-- Row for Customization Name and Message -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formeditproduct.product_customization[index].name"
                  label="Nom du choix "
                  :rules="[(v) => !!v || 'Nom du choix requis']"
                  placeholder="Saisir le nom du choix"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="
                    formeditproduct.product_customization[index].description
                  "
                  label="Description du choix"
                  :rules="[(v) => !!v || 'Description requise']"
                  placeholder="Saisir la description du choix"
                  required
                ></v-text-field>
              </v-col>

              <!-- Row for Max Choices, Switch, and Combobox -->
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formeditproduct.product_customization[index].items"
                  label="Options du choix"
                  chips
                  multiple
                  :item-text="displayItem"
                  @change="processComboboxInput(index)"
                ></v-combobox> </v-col
              ><v-col cols="12" md="3">
                <v-text-field
                  v-model="
                    formeditproduct.product_customization[index].limit_choice
                  "
                  label="Nombre maximum de choix"
                  type="number"
                  :rules="[(v) => !!v || 'Nombre de choix maximum requis']"
                  placeholder="Saisir le nombre de choix maximum"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-switch
                  v-model="
                    formeditproduct.product_customization[index].mandatory
                  "
                  inset
                  label="Choix obligatoire ?"
                ></v-switch>
              </v-col>
            </v-row>
            <v-card
              v-if="formeditproduct.product_customization.length > 1"
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
            color="warning"
            class="text-none"
            @click.stop="$router.push('/products')"
            >Annuler</v-btn
          >
          <v-btn
            :disabled="!isValue"
            :loading="loadingBtn"
            class="ml-4 text-none"
            type="submit"
            color="primary"
            >Valider</v-btn
          >
        </v-form>
      </v-col>
    </v-row>
    <!-- <pre type="json">{{ detailProduct }}</pre>
    <pre type="json">{{ formeditproduct }}</pre>
    <pre type="json">{{ allCategory }}</pre> -->
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
export default {
  components: {
    Loading,
  },

  middleware: 'auth',
  data() {
    return {
      id: this.$route.params.id,
      isValue: false,
      productImg: null,
      loadingBtn: false,
      loadingBtnImg: false,
      loadPage: false,
      stsMsg: false,
      image: '',
      formeditproduct: {
        name: '',
        description: '',
        categoryid: '',
        price: '',
        stock: '',
        image: '',
        product_customization: [],
      },
    }
  },

  computed: {
    staticURL() {
      return this.$store.get('staticURL')
    },
    allCategory() {
      return this.$store.get('categories/dataCategories')
    },
    detailProduct() {
      return this.$store.get('products/detailProduct')
    },
    message() {
      return this.$store.get('products/message')
    },
  },
  watch: {
    async productImg(newBlob) {
      const ext = newBlob.type === 'image/png' ? 'png' : 'jpg'
      const filename = `product_${Date.now()}.${ext}`
      const file = new File([newBlob], filename, { type: newBlob.type })
      this.formeditproduct.image = file

      this.imageRaw = file
      const fd = new FormData()
      fd.append('image', this.imageRaw)

      this.loadingBtnImg = true
      const res = await this.$store.dispatch('products/updateProduct', {
        id: this.id,
        data: fd,
      })
      if (res) {
        this.stsMsg = true
        this.loadingBtnImg = false
        this.$router.push('/products')
      } else {
        this.stsMsg = true
        this.loadingBtnImg = false
      }
    },
  },
  mounted() {
    this.loadPage = true

    const calls = [
      this.$store.dispatch('categories/getAllCategories'),
      this.$store.dispatch('products/getDetailProduct', this.id),
    ]

    Promise.all(calls)
      .then(() => {
        this.formeditproduct.name = this.detailProduct[0].name
        this.formeditproduct.categoryid = this.detailProduct[0].categoryid
        console.log('category id', this.formeditproduct)
        this.formeditproduct.price = this.detailProduct[0].price
        this.formeditproduct.stock = this.detailProduct[0].stock
        this.formeditproduct.description = this.detailProduct[0].description
        this.formeditproduct.product_customization = JSON.parse(
          JSON.stringify(this.detailProduct[0].product_customization)
        )
        this.formeditproduct.image = this.detailProduct[0].image
      })
      .finally(() => {
        this.loadPage = false
      })
  },

  methods: {
    processComboboxInput(index) {
      const lastItem =
        this.formeditproduct.product_customization[index].items.slice(-1)[0]

      if (typeof lastItem === 'string') {
        // Regex to match pattern 'Name (Price)'
        const match = lastItem.match(/^(.*)\s\(([\d,.]+)\)$/)

        if (match) {
          const name = match[1].trim()
          const price = parseFloat(match[2].replace(',', '.')) // Convert , to . if needed

          // Replace the last string item with an object
          this.formeditproduct.product_customization[index].items.splice(
            -1,
            1,
            {
              name,
              price,
            }
          )
        } else {
          // If no pattern match, consider the entire string as a name with a default price
          this.formeditproduct.product_customization[index].items.splice(
            -1,
            1,
            {
              name: lastItem,
              price: 0,
            }
          )
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
      this.formeditproduct.product_customization.push({
        name: '',
        description: '',
        limit_choice: null,
        items: [],
        mandatory: false,
      }) // Ajoute une nouvelle option vide
    },
    // changeImgProduct(e) {
    //   const image = e.target.files[0]
    //   if (image) {
    //     if (
    //       image.type !== 'image/jpeg' &&
    //       image.type !== 'image/png' &&
    //       image.type !== 'image/JPEG' &&
    //       image.type !== 'image/PNG'
    //     ) {
    //       alert('Please enter a jpg/jpeg/png')
    //     } else {
    //       this.imageUrl = ''
    //       this.imageRaw = ''
    //       this.imageUrl = URL.createObjectURL(image)
    //     }
    //   }
    // },
    async submitEditProduct() {
      this.loadingBtn = true
      const res = await this.$store.dispatch('products/updateProduct', {
        id: this.id,
        data: this.formeditproduct,
      })
      if (res) {
        this.stsMsg = true
        this.loadingBtn = false
        this.$router.push('/products')
      } else {
        this.stsMsg = true
        this.loadingBtn = false
      }
    },
  },
}
</script>

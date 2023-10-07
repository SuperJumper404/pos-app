<template>
  <v-container>
    <div v-if="stsMsg">
      <p class="red--text">{{ message }}</p>
    </div>
    <Breadcrumbs />
    <div class="mt-5">
      <h3>Form Edit Product</h3>
    </div>
    <Loading v-if="loadPage" />
    <v-row v-else class="mt-5">
      <v-col md="4" sm="5" cols="12">
        <v-card outlined style="height: 100%">
          <v-img :src="`${staticURL}/api/v1/imgproducts/${image}`" />
          <v-card-actions class="text-center">
            <input
              id="fileImageProfile"
              type="file"
              accept="image/png/jpg"
              class="d-none"
              @input="changeImgProduct"
            />
            <v-btn
              :loading="loadingBtnImg"
              outlined
              color="success"
              rounded
              onclick="document.getElementById('fileImageProfile').click()"
              class="text-capitalize mt-5 mb-5"
              width="100%"
            >
              Change
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col md="8" sm="7" cols="12">
        <v-form v-model="isValue" @submit.prevent="submitEditProduct">
          <v-text-field
            v-model="formeditproduct.name"
            label="Name"
            type="text"
            :rules="[(v) => !!v || 'Name products required']"
            placeholder="Insert product name"
            required
            autofocus
          />
          <v-text-field
            v-model="formeditproduct.description"
            label="Description"
            type="text"
            :rules="[(v) => !!v || 'Description products required']"
            placeholder="Insert product description"
            required
            autofocus
          />
          <v-text-field
            v-model="formeditproduct.stock"
            label="Stock"
            type="number"
            :rules="[(v) => !!v || 'Stock required']"
            placeholder="Insert product stock"
            required
          />
          <v-text-field
            v-model="formeditproduct.price"
            label="Price"
            type="number"
            prepend-inner-icon="mdi-cash"
            :rules="[(v) => !!v || 'Price required']"
            placeholder="Insert product price"
            required
          />
          <v-select
            v-model="formeditproduct.categoryid"
            :items="allCategory"
            :rules="[(v) => !!v || 'Categories riquired']"
            item-value="id"
            item-text="name"
            label="Categories"
            required
          ></v-select>
          <v-btn
            color="success"
            class="text-capitalize mr-3 mb-4"
            @click.stop="addCustomization"
            ><v-icon>mdi-plus</v-icon>Ajouter choix </v-btn
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
                  label="Customization Name"
                  :rules="[(v) => !!v || 'Name required']"
                  placeholder="Enter name"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="
                    formeditproduct.product_customization[index].description
                  "
                  label="Customization Message"
                  :rules="[(v) => !!v || 'Name required']"
                  placeholder="Enter description"
                  required
                ></v-text-field>
              </v-col>

              <!-- Row for Max Choices, Switch, and Combobox -->
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="formeditproduct.product_customization[index].items"
                  label="Select a favorite activity or create a new one"
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
                  label="Max Choices"
                  type="number"
                  :rules="[(v) => !!v || 'Max Choices required']"
                  placeholder="Enter max choices"
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
          <v-btn color="warning" @click.stop="$router.push('/products')"
            >Cancel</v-btn
          >
          <v-btn
            :disabled="!isValue"
            :loading="loadingBtn"
            class="ml-4"
            type="submit"
            color="primary"
            >Update</v-btn
          >
        </v-form>
      </v-col>
    </v-row>
    <pre type="json">{{ detailProduct }}</pre>
    <pre type="json">{{ formeditproduct }}</pre>
  </v-container>
</template>
<script>
import Breadcrumbs from '@/components/breadcrumbs'
import Loading from '@/components/loading'
export default {
  components: {
    Breadcrumbs,
    Loading,
  },
  mixins: [],
  middleware: 'auth',
  data() {
    return {
      id: this.$route.params.id,
      isValue: false,
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
        product_customization: [],
      },
    }
  },
  head() {
    return {
      title: 'Edit Products',
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
        this.formeditproduct.price = this.detailProduct[0].price
        this.formeditproduct.stock = this.detailProduct[0].stock
        this.formeditproduct.description = this.detailProduct[0].description
        this.formeditproduct.product_customization = JSON.parse(
          JSON.stringify(this.detailProduct[0].product_customization)
        )
        this.image = this.detailProduct[0].image
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
    async changeImgProduct(e) {
      const image = e.target.files[0]
      if (image) {
        if (
          image.type !== 'image/jpeg' &&
          image.type !== 'image/png' &&
          image.type !== 'image/JPEG' &&
          image.type !== 'image/PNG'
        ) {
          alert('Please enter a jpg/jpeg/png')
        } else {
          this.imageUrl = ''
          this.imageRaw = ''
          this.imageUrl = URL.createObjectURL(image)
          this.imageRaw = image
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
        }
      }
    },
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

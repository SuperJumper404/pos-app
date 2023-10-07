<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>
    <div class="mt-5">
      <h3>Form New Product</h3>
    </div>
    <v-form v-model="isValue" @submit.prevent="submitProduct">
      <v-text-field
        v-model="formproduct.name"
        label="Name"
        type="text"
        :rules="[(v) => !!v || 'Name products required']"
        placeholder="Insert product name"
        required
        autofocus
      ></v-text-field>
      <v-text-field
        v-model="formproduct.description"
        label="Description"
        type="text"
        :rules="[(v) => !!v || 'Description products required']"
        placeholder="Insert product description"
        required
        autofocus
      ></v-text-field>
      <v-text-field
        v-model="formproduct.stock"
        label="Stock"
        type="number"
        :rules="[(v) => !!v || 'Stock required']"
        placeholder="Insert product stock"
        required
      ></v-text-field>

      <v-text-field
        v-model="formproduct.price"
        label="Price"
        type="number"
        prepend-inner-icon="mdi-cash"
        :rules="[(v) => !!v || 'Price required']"
        placeholder="Insert product price"
        required
      ></v-text-field>
      <v-select
        v-model="formproduct.categoryid"
        :items="allCategory"
        :rules="[(v) => !!v || 'Categories riquired']"
        item-value="id"
        item-text="name"
        label="Categories"
        required
      ></v-select>
      <v-file-input
        accept="image/png/jpg"
        label="Image"
        :rules="[(v) => !!v || 'Image required']"
        placeholder="Insert product image"
        required
        @change="imgproduct"
      ></v-file-input>

      <v-btn
        color="success"
        class="text-capitalize mr-3 mb-4"
        @click.stop="addCustomization"
        ><v-icon>mdi-plus</v-icon>Ajouter choix </v-btn
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
              label="Customization Name"
              :rules="[(v) => !!v || 'Name required']"
              placeholder="Enter name"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formproduct.product_customization[index].description"
              label="Customization Message"
              :rules="[(v) => !!v || 'Name required']"
              placeholder="Enter description"
              required
            ></v-text-field>
          </v-col>

          <!-- Row for Max Choices, Switch, and Combobox -->
          <v-col cols="12" md="6">
            <v-combobox
              v-model="formproduct.product_customization[index].items"
              label="Select a favorite activity or create a new one"
              chips
              multiple
              :item-text="displayItem"
              @change="processComboboxInput(index)"
            ></v-combobox> </v-col
          ><v-col cols="12" md="3">
            <v-text-field
              v-model="formproduct.product_customization[index].limit_choice"
              label="Max Choices"
              type="number"
              :rules="[(v) => !!v || 'Max Choices required']"
              placeholder="Enter max choices"
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
      <v-btn color="warning" @click.stop="$router.push('/products')"
        >Cancel</v-btn
      >
      <v-btn
        :disabled="!isValue"
        :loading="loadingBtn"
        class="ml-4"
        type="submit"
        color="primary"
        >Submit</v-btn
      >
    </v-form>
    <pre>{{ formproduct }}</pre>
  </v-container>
</template>
<script>
export default {
  components: {},
  mixins: [],
  middleware: 'auth',
  data: () => ({
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
  head() {
    return {
      title: 'New Product',
    }
  },
  computed: {
    allCategory() {
      return this.$store.get('categories/dataCategories')
    },
    message() {
      return this.$store.get('products/message')
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
      }) // Ajoute une nouvelle option vide
    },
    imgproduct(files) {
      const image = files
      if (image) {
        if (
          image.type !== 'image/jpeg' &&
          image.type !== 'image/png' &&
          image.type !== 'image/JPEG' &&
          image.type !== 'image/PNG'
        ) {
          alert('Please enter a jpg/jpeg/png')
        } else {
          this.formproduct.image = image
        }
      }
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

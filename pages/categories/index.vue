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
      <v-app-bar flat color="grey lighten-4" light>
        <v-spacer></v-spacer>
        <v-btn
          color="success"
          class="mr-3 text-none"
          @click="$router.push('/categories/newcategory')"
          ><v-icon>mdi-plus</v-icon> Ajouter une catégorie</v-btn
        >
      </v-app-bar>
      <v-card-title
        v-if="dataCategories.length == 0"
        class="d-flex justify-center"
      >
        <v-icon large>mdi-emoticon-neutral-outline</v-icon>
        <h4>Aucune catégorie</h4>
      </v-card-title>
      <v-card
        v-for="(items, index) in dataCategories"
        :key="items.id"
        outlined
        class="pa-2 d-flex justify-space-between align-center ma-3"
      >
        <v-card-text class="category-list-main">
          <v-avatar size="56" class="category-list-avatar">
            <v-img v-if="items.image" :src="categoryImageSrc(items.image)"></v-img>
            <v-icon v-else>mdi-shape</v-icon>
          </v-avatar>
          <p class="font-weight-bold mb-0">{{ items.name }}</p>
        </v-card-text>
        <v-card-actions class="d-block">
          <div class="category-order-buttons mb-3">
            <v-btn
              icon
              small
              :disabled="index === 0 || orderLoading"
              @click="moveCategory(index, -1)"
            >
              <v-icon small>mdi-arrow-up</v-icon>
            </v-btn>
            <v-btn
              icon
              small
              :disabled="index === dataCategories.length - 1 || orderLoading"
              @click="moveCategory(index, 1)"
            >
              <v-icon small>mdi-arrow-down</v-icon>
            </v-btn>
          </div>
          <!-- md to sm -->
          <v-btn
            color="primary"
            class="text-none mb-3 d-sm-block d-none"
            width="100%"
            @click="$router.push(`/categories/edit/${items.id}`)"
            >Modifier <v-icon small right>mdi-pencil</v-icon></v-btn
          >
          <!-- xs -->
          <v-btn
            color="primary"
            class="text-none mb-3 d-sm-none d-block"
            width="100%"
            small
            @click="$router.push(`/categories/edit/${items.id}`)"
            >Modifier <v-icon small right>mdi-pencil</v-icon></v-btn
          >
          <v-spacer></v-spacer>
          <!-- md to sm -->
          <v-btn
            color="red darken-1"
            dark
            class="text-none d-sm-block d-none"
            width="100%"
            @click="$router.push(`/categories/delete/${items.id}?modals=true`)"
            >Supprimer <v-icon small right>mdi-trash-can</v-icon></v-btn
          >
          <!-- xs -->
          <v-btn
            color="red darken-1"
            dark
            class="text-none d-sm-none d-block"
            width="100%"
            small
            @click="$router.push(`/categories/delete/${items.id}?modals=true`)"
            >Supprimer <v-icon small right>mdi-trash-can</v-icon></v-btn
          >
        </v-card-actions>
      </v-card>
    </v-card>
    <NuxtChild />
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import formatdate from '@/helpers/formatdate'
export default {
  components: {
    Loading,
  },
  mixins: [formatdate],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      orderLoading: false,
    }
  },

  computed: {
    dataCategories() {
      return this.$store.get('categories/dataCategories')
    },
    staticurl() {
      return this.$store.get('staticURL').replace(/\/+$/, '')
    },
    showModal() {
      return this.$route.name === 'categorie-edit-id'
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('categories/getAllCategories').finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    searchData() {
      this.$store.dispatch('categories/getAllCategories')
    },
    categoryImageSrc(image) {
      return `${this.staticurl}/api/v1/imgcategories/${image}`
    },
    async moveCategory(index, direction) {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= this.dataCategories.length) return

      const ordered = [...this.dataCategories]
      const [moved] = ordered.splice(index, 1)
      ordered.splice(targetIndex, 0, moved)
      this.orderLoading = true
      await this.$store.dispatch(
        'categories/reorderCategories',
        ordered.map((category) => category.id)
      )
      this.orderLoading = false
    },
  },
}
</script>
<style scoped>
.category-order-buttons {
  display: flex;
  justify-content: flex-end;
}

.category-list-main {
  align-items: center;
  display: flex;
  gap: 16px;
}

.category-list-avatar {
  background: #eef2f7;
  flex: 0 0 auto;
}
</style>

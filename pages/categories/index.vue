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
        <h4>Categories Empty</h4>
      </v-card-title>
      <v-card
        v-for="items in dataCategories"
        :key="items.id"
        outlined
        class="pa-2 d-flex justify-space-between align-center ma-3"
      >
        <v-card-text class="d-block justify-space-between mt-5">
          <p class="font-weight-bold">{{ items.name }}</p>
        </v-card-text>
        <v-card-actions class="d-block">
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
    }
  },

  computed: {
    dataCategories() {
      return this.$store.get('categories/dataCategories')
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
  },
}
</script>

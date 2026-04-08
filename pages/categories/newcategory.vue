<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>

    <v-form v-model="isValue" @submit.prevent="submitCategory">
      <v-text-field
        v-model="formcategory.name"
        label="Nom de la catégorie"
        type="text"
        :rules="[(v) => !!v || 'Le nom de la catégorie est requis']"
        placeholder="Saisir le nom de la catégorie"
        required
        autofocus
      ></v-text-field>
      <v-btn
        :disabled="!isValue"
        :loading="loadingBtn"
        class="ml-4 text-none"
        type="submit"
        color="primary"
        >Valider <v-icon small right>mdi-check-circle</v-icon></v-btn
      >
      <v-btn
        color="warning"
        class="text-none"
        @click.stop="$router.push('/categories')"
        >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
      >
    </v-form>
  </v-container>
</template>
<script>
export default {
  components: {},
  middleware: 'auth',
  data() {
    return {
      errMsg: false,
      isValue: false,
      loadingBtn: false,
      message: '',
      formcategory: {
        name: '',
      },
    }
  },

  methods: {
    async submitCategory() {
      this.loadingBtn = true
      const res = await this.$store.dispatch(
        'categories/postCategory',
        this.formcategory
      )
      if (res) {
        this.loadingBtn = false
        this.$router.push('/categories')
      } else {
        this.errMsg = true
      }
    },
  },
}
</script>

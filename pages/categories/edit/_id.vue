<template>
  <v-container>
    <div v-if="stsMsg">
      <p class="red--text">{{ message }}</p>
    </div>

    <Loading v-if="loadPage" />
    <div v-else>
      <v-form v-model="isValue" @submit.prevent="submitEditCategory">
        <v-text-field
          v-model="formcategory.name"
          label="Name"
          type="text"
          :rules="[(v) => !!v || 'Name category required']"
          placeholder="Insert category name"
          required
          autofocus
        ></v-text-field>
        <v-btn color="warning" @click.stop="$router.push('/categories')"
          >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
        >
        <v-btn
          :disabled="!isValue"
          :loading="loadingBtn"
          class="ml-4"
          type="submit"
          color="primary"
          >Submit <v-icon small right>mdi-check-circle</v-icon></v-btn
        >
      </v-form>
    </div>
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
      isValue: false,
      loadingBtn: false,
      loadPage: false,
      stsMsg: false,
      formcategory: {
        name: '',
      },
    }
  },

  computed: {
    detailCategory() {
      return this.$store.get('categories/detailCategory')
    },
    message() {
      return this.$store.get('categories/message')
    },
  },
  mounted() {
    this.loadPage = true
    this.$store
      .dispatch('categories/getDetailCategory', this.$route.params.id)
      .finally(() => {
        this.loadPage = false
        this.formcategory.name = this.detailCategory[0].name
      })
  },
  methods: {
    async submitEditCategory() {
      this.loadingBtn = true
      const res = await this.$store.dispatch('categories/patchCategory', {
        id: this.$route.params.id,
        data: this.formcategory,
      })
      if (res) {
        this.loadingBtn = false
        this.stsMsg = true
        this.$router.push('/categories')
      }
    },
  },
}
</script>

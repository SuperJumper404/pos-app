<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>

    <v-form v-model="isValue" @submit.prevent="submitTable">
      <v-text-field
        v-model="formtable.name"
        label="Nom de la table"
        type="text"
        :rules="[(v) => !!v || 'Nom de la table requis']"
        placeholder="Inserer le nom de la table"
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
      <v-btn color="warning" class="text-none" @click.stop="$router.push('/tables')"
        >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
      >
    </v-form>
  </v-container>
</template>

<script>
export default {
  middleware: 'auth',
  data() {
    return {
      errMsg: false,
      isValue: false,
      loadingBtn: false,
      message: '',
      formtable: { name: '' },
    }
  },
  methods: {
    async submitTable() {
      this.loadingBtn = true
      const res = await this.$store.dispatch('tables/postTable', {
        name: this.formtable.name,
      })
      this.loadingBtn = false
      if (res) {
        this.$router.push('/tables')
      } else {
        this.errMsg = true
      }
    },
  },
}
</script>

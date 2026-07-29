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
        placeholder="Insérer le nom de la table"
        required
        autofocus
      ></v-text-field>

      <v-switch
        v-model="editableForm"
        label="Changer le mot de passe par défaut"
      ></v-switch>
      <v-text-field
        v-model="formtable.clearpass"
        label="Mot de passe"
        :disabled="!editableForm"
        type="text"
        :rules="[(v) => !!v || 'Mot de passe requis']"
        placeholder="Insérer le mot de passe"
        required
        autofocus
      ></v-text-field>
      <v-text-field
        :value="tableEmail"
        label="E-mail"
        type="text"
        disabled
        :rules="[(v) => !!v || 'E-mail de la table requis']"
        placeholder="Insérer l'e-mail de la table"
        required
        autofocus
      ></v-text-field>
      <!-- The holder should come form config file -->
      <v-text-field
        v-model="websiteUrl"
        label="URL du site web"
        type="text"
        disabled
        :rules="[(v) => !!v || 'L’URL du site est requise']"
        :placeholder="websiteUrl"
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
        @click.stop="$router.push('/tables')"
        >Annuler <v-icon small right>mdi-close-circle</v-icon></v-btn
      >
    </v-form>
    <!-- <pre type="json"> -->
    <!-- {{ formtable }} -->
    <!-- </pre> -->
  </v-container>
</template>
<script>
import { buildStableTableEmail } from '@/helpers/tableIdentity'
export default {
  middleware: 'auth',
  data() {
    return {
      errMsg: false,
      isValue: false,
      loadingBtn: false,
      editableForm: false,

      message: '',
      formtable: {
        name: '',
        clearpass: 'PassworD_1',
      },
    }
  },

  computed: {
    tableEmail() {
      return buildStableTableEmail({
        shopId: this.shopId,
        shopName: this.shopName,
        tableName: this.formtable.name,
      })
    },
    websiteUrl() {
      console.log('Router', this.$router)
      console.log('WindwHostname', window.location.hostname)

      return window.location.origin
    },
    shopId() {
      return localStorage.getItem('shopid')
    },
    shopName() {
      const shopName = this.$store.get('shop/shop_name')
      console.log('Shop Name Value', shopName)
      return shopName
    },
  },
  methods: {
    async submitTable() {
      this.loadingBtn = true
      const params = {
        username: this.formtable.name,
        password: this.formtable.clearpass,
        clearpass: this.formtable.clearpass,
        email: this.tableEmail,
        phone: '000000000000',
        status: 1,
        access: 2,
      }
      const res = await this.$store.dispatch('tables/postTable', params)
      if (res) {
        this.loadingBtn = false
        this.$router.push('/tables')
      } else {
        this.errMsg = true
      }
    },
  },
}
</script>

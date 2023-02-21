<template>
  <v-container>
    <div v-if="errMsg">
      <p class="red--text">{{ message }}</p>
    </div>
    <Breadcrumbs />
    <div class="mt-5">
      <h3>Form New Tables</h3>
    </div>
    <v-form v-model="isValue" @submit.prevent="submitTable">
      <v-text-field
        v-model="formtable.name"
        label="Name"
        type="text"
        :rules="[(v) => !!v || 'Name table required']"
        placeholder="Insert table name"
        required
        @keyup="
          formtable.email = formtable.name.replace(/[\s\/]/g, '') + '@gmail.com'
        "
        autofocus
      ></v-text-field>

      <v-switch
        v-model="editableForm"
        label="Changer mots de passe par defaut"
      ></v-switch>
      <v-text-field
        v-model="formtable.clearpass"
        label="Password"
        :disabled="!editableForm"
        type="text"
        :rules="[(v) => !!v || 'Table Password required']"
        placeholder="Insert table password"
        required
        autofocus
      ></v-text-field>
      <v-text-field
        v-model="formtable.email"
        label="Email"
        type="text"
        disabled
        :rules="[(v) => !!v || 'Table mail required']"
        placeholder="Insert table mail"
        required
        autofocus
      ></v-text-field>
      <!-- The holder should come form config file -->
      <v-text-field
        v-model="websiteUrl"
        label="Web Site Url"
        type="text"
        disabled
        :rules="[(v) => !!v || 'Table mail required']"
        :placeholder="websiteUrl"
        autofocus
      ></v-text-field>
      <v-btn color="warning" @click.stop="$router.push('/tables')"
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
    <pre type="json">
        {{ formtable }}
    </pre>
  </v-container>
</template>
<script>
import Breadcrumbs from '@/components/breadcrumbs'
export default {
  components: {
    Breadcrumbs,
  },
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
        email: '',
      },
    }
  },
  head() {
    return {
      title: 'New table',
    }
  },
  computed: {
    websiteUrl() {
      console.log('Router', this.$router)
      console.log('WindwHostname', window.location.hostname)

      return window.location.origin
    },
  },
  methods: {
    async submitTable() {
      this.loadingBtn = true
      const params = {
        username: this.formtable.name,
        password: this.formtable.clearpass,
        clearpass: this.formtable.clearpass,
        email: this.formtable.email,
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

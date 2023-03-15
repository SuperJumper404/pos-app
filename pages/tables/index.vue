<!-- Here we need to understand that user are table in a functionnal way-->
<template>
  <v-container>
    <Breadcrumbs />
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <v-card v-else outlined class="mt-5 overflow-y-auto" style="height: 350px">
      <v-app-bar flat color="grey lighten-4" light>
        <v-btn
          color="success"
          class="text-capitalize mr-3"
          @click="$router.push('/tables/newtable')"
          ><v-icon>mdi-plus</v-icon> Table</v-btn
        >
        <v-spacer></v-spacer>
        <div class="mt-6">
          <v-text-field
            placeholder="Search name tables"
            label="Seaching"
            outlined
            dense
            append-icon="mdi-card-search"
            @keyup="searchData()"
          ></v-text-field>
        </div>
      </v-app-bar>
      <v-card-title v-if="dataTables.length == 0" class="d-flex justify-center">
        <v-icon large>mdi-emoticon-neutral-outline</v-icon>
        <h4>Tables vide</h4>
      </v-card-title>
      <v-card
        v-for="items in dataTables"
        :key="items.id"
        outlined
        class="pa-2 d-flex justify-space-between align-center ma-3"
      >
        <v-card-text class="d-block justify-space-between mt-5">
          <p class="font-weight-bold">{{ items.username }}</p>
          <p>Identifiant: {{ items.email }}</p>
          <p>Password: {{ items.clearpass }}</p>
          <p>
            Url Connection:
            {{
              websiteUrl +
              '/login?username=' +
              items.email +
              '&password=' +
              items.clearpass
            }}
          </p>

          <p>
            <qr-code
              :text="
                websiteUrl +
                '/login?username=' +
                items.email +
                '&password=' +
                items.clearpass
              "
            />
            <!-- <qrcode-vue value="items.email" size="300" level="H" /> -->
          </p>
        </v-card-text>
        <v-card-actions class="d-block">
          <!-- md to sm -->
          <v-btn
            color="primary"
            class="text-capitalize mb-3 d-sm-block d-none"
            width="100%"
            @click="$router.push(`/tables/edit/${items.id}`)"
            >Edit</v-btn
          >
          <!-- xs -->
          <v-btn
            color="primary"
            class="text-capitalize mb-3 d-sm-none d-block"
            width="100%"
            small
            @click="$router.push(`/tables/edit/${items.id}`)"
            >Edit</v-btn
          >
          <v-spacer></v-spacer>
          <!-- md to sm -->
          <v-btn
            color="red darken-1"
            dark
            class="text-capitalize d-sm-block d-none"
            width="100%"
            @click="$router.push(`/tables/delete/${items.id}?modals=true`)"
            >Delete</v-btn
          >
          <!-- xs -->
          <v-btn
            color="red darken-1"
            dark
            class="text-capitalize d-sm-none d-block"
            width="100%"
            small
            @click="$router.push(`/tables/delete/${items.id}?modals=true`)"
            >Delete</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-card>
    <!-- <pre type="json">{{ dataTables }}</pre> -->
  </v-container>
</template>
<script>
import Breadcrumbs from '@/components/breadcrumbs'
import Loading from '@/components/loading'
import formatdate from '@/helpers/formatdate'
import Vue from 'vue'
import VueQRCodeComponent from 'vue-qrcode-component/src/QRCode.vue'

// Register the Vue component
// eslint-disable-next-line vue/component-definition-name-casing
Vue.component('qr-code', VueQRCodeComponent)
export default {
  components: {
    Breadcrumbs,
    Loading,

    // QrcodeVue,
  },
  mixins: [formatdate],
  middleware: 'auth',
  data() {
    return {
      loadPage: false,
      // http://localhost:3000/login?username=admin%40gmail.com&password=PassworD_1
      // This is an example to generate a Automatic connection Qr code
    }
  },
  head() {
    return {
      title: `${
        this.$route.name.charAt(0).toUpperCase() + this.$route.name.slice(1)
      }`,
    }
  },
  computed: {
    dataTables() {
      const result = this.$store.get('tables/dataTables')
      return result.filter((x) => x.access === 2)
    },
    websiteUrl() {
      return window.location.origin
    },
  },
  mounted() {
    this.loadPage = true
    this.$store.dispatch('tables/getAllTables').finally(() => {
      this.loadPage = false
    })
  },
  methods: {
    searchData() {},
  },
}
</script>

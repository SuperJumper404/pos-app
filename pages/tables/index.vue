<!-- Here we need to understand that user are table in a functionnal way-->
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
          class="text-none mr-3"
          @click="$router.push('/tables/newtable')"
          ><v-icon>mdi-plus</v-icon> Table</v-btn
        >
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
        <v-card-text class="d-block justify-space-between py-4">
          <div class="text-h6 font-weight-bold mb-4">
            {{ items.username }}
          </div>

          <div class="mb-3">
            <div class="caption text-uppercase grey--text text--darken-1">
              Identifiant
            </div>
            <div class="body-2">
              {{ items.email }}
            </div>
          </div>

          <div class="mb-4">
            <div class="caption text-uppercase grey--text text--darken-1">
              Mot de passe
            </div>
            <div class="body-2">
              {{ items.clearpass }}
            </div>
          </div>

          <div class="subtitle-2 font-weight-bold text--darken-1 mb-1">
            URL de connexion automatique:
          </div>
          <v-sheet
            color="grey lighten-4"
            rounded="lg"
            class="mt-3 mb-3 px-3 py-2 d-inline-block"
            max-width="100%"
          >
            <div class="d-flex align-center">
              <div class="body-2 break-all grey--text text--darken-3">
                {{
                  websiteUrl +
                  '/login?username=' +
                  items.email +
                  '&password=' +
                  items.clearpass
                }}
              </div>
              <v-btn icon small class="ml-1" @click="copyTableUrl(items)">
                <v-icon small>mdi-content-copy</v-icon>
              </v-btn>
            </div>
          </v-sheet>

          <div :ref="`qr-${items.id}`" class="qr-code-download-wrapper">
            <qr-code
              :text="
                websiteUrl +
                '/login?username=' +
                items.email +
                '&password=' +
                items.clearpass
              "
            />
          </div>
          <!-- <qrcode-vue value="items.email" size="300" level="H" /> -->
        </v-card-text>
        <v-card-actions class="d-block">
          <!-- Desktop / tablette -->
          <v-btn
            color="red darken-1"
            dark
            class="text-none d-sm-block d-none mb-2"
            width="100%"
            @click="$router.push(`/tables/delete/${items.id}?modals=true`)"
          >
            Supprimer <v-icon small right>mdi-trash-can</v-icon>
          </v-btn>

          <v-btn
            color="primary"
            dark
            class="text-none d-sm-block d-none mb-2 ml-0"
            width="100%"
            @click="downloadQrCode(items.id)"
          >
            Télécharger
            <v-icon right>mdi-download</v-icon>
          </v-btn>

          <!-- Mobile -->
          <v-btn
            color="red darken-1"
            dark
            class="text-none d-sm-none d-block mb-2"
            width="100%"
            small
            @click="$router.push(`/tables/delete/${items.id}?modals=true`)"
          >
            Supprimer <v-icon small right>mdi-trash-can</v-icon>
          </v-btn>

          <v-btn
            color="primary"
            dark
            class="text-none d-sm-none d-block ml-0 mb-2"
            width="100%"
            small
            @click="downloadQrCode(items.id)"
          >
            Télécharger
            <v-icon right small>mdi-download</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-card>
    <!-- <pre type="json">{{ dataTables }}</pre> -->
  </v-container>
</template>
<script>
import Loading from '@/components/loading'
import formatdate from '@/helpers/formatdate'
import Vue from 'vue'
import VueQRCodeComponent from 'vue-qrcode-component/src/QRCode.vue'

// Register the Vue component
// eslint-disable-next-line vue/component-definition-name-casing
Vue.component('qr-code', VueQRCodeComponent)
export default {
  components: {
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
      const result = this.$store.get('tables/dataTables') || []
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
    searchData() {
      this.$store.dispatch('tables/getAllTables')
    },
    async copyTableUrl(item) {
      const url =
        this.websiteUrl +
        '/login?username=' +
        item.email +
        '&password=' +
        item.clearpass

      try {
        await navigator.clipboard.writeText(url)
      } catch (error) {
        const input = document.createElement('textarea')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
    },
    downloadQrCode(id) {
      let wrapper = this.$refs[`qr-${id}`]
      if (!wrapper) return
      if (Array.isArray(wrapper)) {
        wrapper = wrapper[0]
      }
      if (wrapper && wrapper.$el) {
        wrapper = wrapper.$el
      }
      if (!wrapper || typeof wrapper.querySelector !== 'function') return

      const svg = wrapper.querySelector('svg')
      if (svg) {
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svg)
        const blob = new Blob([svgString], {
          type: 'image/svg+xml;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `qr-${id}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        return
      }

      const canvas = wrapper.querySelector('canvas')
      if (canvas) {
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = `qr-${id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      const img = wrapper.querySelector('img')
      if (img && img.src) {
        const link = document.createElement('a')
        link.href = img.src
        link.download = `qr-${id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    },
  },
}
</script>

import colors from 'vuetify/es5/util/colors'
const config = require('./config/config.json')
console.log(config)
console.log(process.env.ENV)
function getHost() {
  const env = process.env.ENV
  let currentEnvConfig = config.environments[env]
  console.log(currentEnvConfig)
  return currentEnvConfig
}

getHost()
// export NODE_OPTIONS=--openssl-legacy-provider
export default {
  server: {
    host: getHost().frontEndPoint, // default: localhost or IP_ADRESSE 192.168.1.139
    //  host: '192.168.1.139' // default: localhost or IP_ADRESSE 192.168.1.139
    //  host: '127.0.0.1' // default: localhost or IP_ADRESSE 192.168.1.139
  },
  ssr: false,
  head: {
    titleTemplate: '%s - pos-app',
    title: 'pos-app',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },
  css: ['~/assets/css/styles', '~/assets/scss/test.scss'],
  plugins: [
    { src: '~/plugins/persistedState.client.js', srr: false },
    { src: '~/plugins/axios.js' },
  ],
  components: true,
  buildModules: ['@nuxtjs/eslint-module', '@nuxtjs/vuetify'],
  modules: ['@nuxtjs/axios'],
  env: {
    privateURL: getHost().backEndPoint,
  },
  axios: {
    proxy: true,
    // baseURL: `${process.env.VUE_APP_BASEURL}`,
  },
  proxy: {
    '/baseurl': {
      target: `${getHost().backEndPoint}`,
      pathRewrite: { '^/baseurl': '' },
    },
  },
  vuetify: {
    // customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3,
        },
      },
    },
  },
  build: {},
}

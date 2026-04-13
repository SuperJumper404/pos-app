import colors from 'vuetify/es5/util/colors'
const config = require('./config/config.json')
console.log(config)
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
    host: getHost().frontEndPoint,
    port: 8083, // default: localhost or IP_ADRESSE 192.168.1.139
    //host: '192.168.1.139', // default: localhost or IP_ADRESSE 192.168.1.139
    //  host: '127.0.0.1' // default: localhost or IP_ADRESSE 192.168.1.139
  },
  ssr: false,
  target: 'static',
  generate: {
    //subFolders: false
  },
  head: {
    titleTemplate: 'Smart Eat',
    title: 'Smart Eat',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/logo.png' }],
  },
  css: [
    '~/assets/css/styles',
    '~/assets/scss/test.scss',
    'vue-advanced-cropper/dist/style.css',
  ],
  plugins: [
    { src: '~/plugins/persistedState.client.js', srr: false },
    { src: '~/plugins/axios.js' },
  ],
  components: true,
  buildModules: ['@nuxtjs/eslint-module', '@nuxtjs/vuetify'],
  modules: ['@nuxtjs/axios'],
  env: {
    ENV: process.env.ENV,
    privateURL: getHost().backEndPoint,
  },
  axios: {
    proxy: false,
    baseURL: `${getHost().backEndPoint}`,
  },
  /*proxy: {
    '/baseurl': {
      target: `${getHost().backEndPoint}`,
      pathRewrite: { '^/baseurl': '' },
    },
  },*/
  vuetify: {
    // customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      light: true,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3,
          mainpurple: '#7e22ce',
        },
        light: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3,
          primaryPurple: '#7e22ce',
          lightPurple: '#a564dd',
          primaryWhite: '#ffffff',
        },
      },
    },
  },
  build: {
    splitChunks: {
      layouts: false,
      pages: false,
      commons: false,
    },
  },
}

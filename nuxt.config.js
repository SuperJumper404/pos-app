import colors from 'vuetify/es5/util/colors'
import config from './config/config.json'

function getHost() {
  const env = process.env.ENV
  const currentEnvConfig = config.environments[env]
  return currentEnvConfig
}

getHost()
// export NODE_OPTIONS=--openssl-legacy-provider
export default {
  server: {
    host: getHost().frontEndPoint,
    port: 8083, // default: localhost or IP_ADRESSE 192.168.1.139
    // host: '192.168.1.139', // default: localhost or IP_ADRESSE 192.168.1.139
    // host: '127.0.0.1' // default: localhost or IP_ADRESSE 192.168.1.139
  },
  ssr: false,
  target: 'static',
  generate: {
    // subFolders: false
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
      {
        hid: 'description',
        name: 'description',
        content:
          'Commandez directement en ligne chez votre restaurant avec Smart Eat.',
      },
      { hid: 'og:type', property: 'og:type', content: 'website' },
      { hid: 'og:site_name', property: 'og:site_name', content: 'Smart Eat' },
      {
        hid: 'og:title',
        property: 'og:title',
        content: 'Smart Eat - Click & Collect',
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content:
          'Commandez directement en ligne chez votre restaurant avec Smart Eat.',
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: 'https://smarteat.fr/logo.png',
      },
      {
        hid: 'og:image:secure_url',
        property: 'og:image:secure_url',
        content: 'https://smarteat.fr/logo.png',
      },
      {
        hid: 'og:image:type',
        property: 'og:image:type',
        content: 'image/png',
      },
      {
        hid: 'og:image:width',
        property: 'og:image:width',
        content: '120',
      },
      {
        hid: 'og:image:height',
        property: 'og:image:height',
        content: '150',
      },
      {
        hid: 'twitter:card',
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        hid: 'twitter:title',
        name: 'twitter:title',
        content: 'Smart Eat - Click & Collect',
      },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content:
          'Commandez directement en ligne chez votre restaurant avec Smart Eat.',
      },
      {
        hid: 'twitter:image',
        name: 'twitter:image',
        content: 'https://smarteat.fr/logo.png',
      },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/logo.png' }],
  },
  css: [
    '~/assets/css/styles',
    '~/assets/scss/design-system.scss',
    '~/assets/scss/test.scss',
    'vue-advanced-cropper/dist/style.css',
  ],
  plugins: [
    { src: '~/plugins/consoleLogs.client.js', ssr: false },
    { src: '~/plugins/persistedState.client.js', srr: false },
    { src: '~/plugins/shopTheme.client.js', ssr: false },
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
  /* proxy: {
    '/baseurl': {
      target: `${getHost().backEndPoint}`,
      pathRewrite: { '^/baseurl': '' },
    },
  }, */
  vuetify: {
    // customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      light: true,
      themes: {
        dark: {
          primary: '#1976d2',
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: '#ffa014',
          error: '#d83b3b',
          success: '#00e676',
          mainpurple: '#7e22ce',
        },
        light: {
          primary: '#1976d2',
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: '#ffa014',
          error: '#d83b3b',
          success: '#00e676',
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

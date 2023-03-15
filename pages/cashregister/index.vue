<template>
  <v-container>
    <div>Cash register page</div>
  </v-container>
</template>
<script>
// import Loading from '@/components/loading'
import price from '@/helpers/price'
// import * as config from '@/nuxt.config'
export default {
  //   components: {
  //     Loading,
  //   },
  mixins: [price],
  layout() {
    return parseInt(localStorage.getItem('access')) === 0
      ? 'default'
      : 'clientside'
  },
  middleware: 'auth',
  data: () => ({}),
  head() {},
  computed: {
    // breakpoint() {
    //   console.log('eeee', this.$vuetify.breakpoint)
    //   return JSON.stringify(this.$vuetify.breakpoint, null, null)
    // },
  },
  mounted() {},
  methods: {},
}
</script>
<style scoped>
.box {
  border: 1px solid #eeeeee;
}
</style>

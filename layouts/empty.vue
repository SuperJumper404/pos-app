<template>
  <v-app dark>
    <v-main>
      <!-- <v-container fluid> -->
      <nuxt />
      <!-- </v-container> -->
    </v-main>
    <!-- <v-navigation-drawer
      v-if="idUser.access !== 0"
      v-model="rightDrawer"
      :right="right"
      temporary
      fixed
    >
      <v-list>
        <v-list-item @click.native="right = !right">
          <v-list-item-action>
            <v-icon light> mdi-repeat </v-icon>
          </v-list-item-action>
          <v-list-item-title>Switch drawer (click me)</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer> -->
    <!-- <v-footer :absolute="!fixed" app>
      <span>&copy; {{ new Date().getFullYear() }}</span>
    </v-footer> -->
  </v-app>
</template>
<script>
export default {
  data() {
    return {}
  },
  computed: {
    idUser() {
      return this.$store.get('users/user')
    },
  },
  mounted() {},
  methods: {},
}
</script>

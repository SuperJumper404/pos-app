<template>
  <v-dialog
    :value="value"
    fullscreen
    persistent
    transition="dialog-bottom-transition"
    @input="$emit('input', $event)"
  >
    <v-card>
      <v-toolbar dark color="primary">
        <v-btn icon aria-label="Fermer la modification" @click="requestClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>
          Modification de la commande #{{ orderNumber }}
        </v-toolbar-title>
      </v-toolbar>

      <MenusPage
        v-if="step === 'menu'"
        embedded-order-edit
        @show-cart="step = 'cart'"
        @request-close="requestClose"
      />
      <CartPage
        v-else-if="step === 'cart'"
        embedded-order-edit
        @show-menu="step = 'menu'"
        @request-close="requestClose"
        @edit-complete="completeEdit"
      />
    </v-card>
  </v-dialog>
</template>

<script>
import MenusPage from '@/pages/menus.vue'
import CartPage from '@/pages/cart.vue'

export default {
  components: {
    MenusPage,
    CartPage,
  },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    orderNumber: {
      type: String,
      default: '',
    },
  },
  data: () => ({
    step: 'menu',
  }),
  watch: {
    value(isOpen) {
      if (isOpen) this.step = 'menu'
    },
  },
  methods: {
    async requestClose() {
      const unsafe =
        this.$store.get('orderEdit/dirty') === true ||
        Boolean(this.$store.get('orderEdit/paymentRefresh'))
      if (
        unsafe &&
        !window.confirm('Quitter sans terminer la modification ?')
      ) {
        return
      }

      await this.$store.dispatch('orderEdit/cancel')
      this.$emit('input', false)
    },
    completeEdit(orderId) {
      this.$emit('input', false)
      this.$emit('completed', orderId)
    },
  },
}
</script>

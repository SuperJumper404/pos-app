<script>
import MenusPage from '@/pages/menus.vue'

export default {
  extends: MenusPage,
  layout: 'default',
  computed: {
    ...MenusPage.computed,
    isAdminView() {
      return true
    },
    expressSelectedServiceLabel() {
      return this.$store.state.delivery?.enabled
        ? 'Sur place / Emporter / Livraison'
        : MenusPage.computed.expressSelectedServiceLabel.call(this)
    },
  },
  mounted() {
    this.$store.dispatch('delivery/loadSettings', Number(localStorage.getItem('shopid')))
  },
  methods: {
    openExpressServiceDialog() {
      if (!this.$store.state.delivery?.enabled) return MenusPage.methods.openExpressServiceDialog.call(this)
      this.$store.commit('delivery/POS_DRAFT', {
        customer: this.expressCustomer, phone: this.expressPhone, remark: this.buildExpressRemark(),
        servicePointId: this.expressSelectedTable, isTakeaway: this.expressIsTakeaway,
      })
      this.$store.dispatch('delivery/setDiscount', { type: this.expressDiscountType, value: this.expressDiscountValue })
      return MenusPage.methods.btnOrder.call(this)
    },
  },
}
</script>

<style scoped>
.express-service-button { min-height: 44px; height: auto !important; white-space: normal; }
.express-service-button ::v-deep .v-btn__content { white-space: normal; overflow-wrap: anywhere; }
</style>

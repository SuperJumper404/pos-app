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
    canUseDeliveryService() {
      return true
    },
  },
}
</script>

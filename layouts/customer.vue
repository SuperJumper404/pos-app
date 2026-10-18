<template>
  <v-app light class="customer-layout">
    <header class="customer-header">
      <img :src="logo" :alt="shop ? shop.shop_name : 'Smart Eat'" width="52" height="52" @error="imageFailed = true">
      <div class="customer-wrap"><strong>{{ shop ? shop.shop_name : 'Smart Eat' }}</strong><p>Mon compte</p></div>
    </header>
    <v-main><div class="customer-container"><nuxt /></div></v-main>
  </v-app>
</template>

<script>
export default {
  data() { return { imageFailed: false } },
  computed: {
    shop() { return this.$store.state.customer.shop },
    logo() {
      return this.shop && this.shop.shop_profile_image && !this.imageFailed
        ? `${process.env.privateURL}/api/v1/imgprofile/${encodeURIComponent(this.shop.shop_profile_image)}` : '/logo.png'
    },
  },
  watch: { shop() { this.imageFailed = false } },
}
</script>

<style>
.customer-layout { background: var(--se-color-bg) !important; color: var(--se-color-text-body); font-family: Poppins, sans-serif; letter-spacing: 0; }
.customer-layout .customer-header { display: flex; align-items: center; gap: 16px; padding: 16px max(20px, calc((100% - 960px) / 2)); background: var(--se-color-surface); border-bottom: 1px solid var(--se-color-border); }
.customer-layout .customer-header img { flex: 0 0 52px; object-fit: contain; }
.customer-layout .customer-header strong { font-size: 1.125rem; }
.customer-layout .customer-header p { margin: 2px 0 0; color: var(--se-color-text-muted); font-size: .875rem; }
.customer-layout .customer-container { width: 100%; max-width: 1008px; margin: 0 auto; padding: 32px 24px 48px; }
.customer-layout h1 { font-size: 1.5rem; line-height: 1.3; margin-bottom: 24px; }
.customer-layout h2 { font-size: 1.125rem; line-height: 1.4; margin-bottom: 20px; }
.customer-layout h3 { font-size: 1rem; line-height: 1.5; }
.customer-layout .customer-wrap { overflow-wrap: anywhere; min-width: 0; }
.customer-layout .customer-muted { color: var(--se-color-text-muted); }
.customer-layout .customer-section { padding: 24px 0; border-top: 1px solid var(--se-color-border); }
.customer-layout .customer-section-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.customer-layout .customer-section-heading h2 { margin: 0; }
.customer-layout .customer-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.customer-layout .customer-login { max-width: 480px; }
.customer-layout .customer-channels { display: flex; width: fit-content; max-width: 100%; margin-bottom: 24px; border-radius: 6px; }
.customer-layout .v-btn { min-height: 44px; height: auto; padding-top: 10px; padding-bottom: 10px; text-transform: none; letter-spacing: 0; max-width: 100%; }
.customer-layout .v-btn__content { white-space: normal; overflow-wrap: anywhere; }
.customer-layout .customer-icon { flex: 0 0 44px; width: 44px; height: 44px; padding: 0; }
.customer-layout .customer-addresses { list-style: none; margin: 0; padding: 0; }
.customer-layout .customer-address-row { display: flex; flex-wrap: wrap; gap: 16px; padding: 20px 0; border-bottom: 1px solid var(--se-color-border); }
.customer-layout .customer-address-content { flex: 1 1 280px; min-width: 0; }
.customer-layout .customer-address-content p { margin: 8px 0 0; }
.customer-layout .customer-address-actions { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 4px; }
.customer-layout .customer-default { font-size: .8125rem; color: var(--se-color-text-muted); }
.customer-layout .customer-delete { flex: 1 0 100%; }
.customer-layout .v-alert { border-left-width: 0 !important; }
.customer-layout form { max-width: 640px; }
.customer-layout :focus-visible { outline: 2px solid var(--se-color-primary); outline-offset: 3px; }
@media (max-width: 600px) {
  .customer-layout .customer-container { padding: 24px 16px 40px; }
  .customer-layout .customer-header { padding: 12px 16px; }
  .customer-layout .customer-section-heading { align-items: flex-start; }
  .customer-layout .customer-address-content { flex-basis: 100%; }
}
</style>

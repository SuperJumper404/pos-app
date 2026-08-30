<template>
  <v-container fluid class="click-collect-page pa-0">
    <div class="click-collect-shell">
      <header class="click-collect-hero" aria-labelledby="restaurant-name">
        <v-img
          :src="shopProfileImageSrc(shopInfo.shop_profile_image)"
          height="100%"
          position="center center"
          class="hero-image-backdrop"
          aria-hidden="true"
        />
        <v-img
          :src="shopProfileImageSrc(shopInfo.shop_profile_image)"
          height="100%"
          position="center center"
          contain
          class="shop-profile-image"
          @error="shopProfileImageFailed = true"
        />
      </header>

      <main class="click-collect-content">
        <section
          class="restaurant-profile-summary"
          aria-labelledby="restaurant-name"
        >
          <v-chip
            small
            label
            class="restaurant-status"
            :class="{
              'restaurant-status--open': isRestaurantOpen && !isKitchenClosed,
              'restaurant-status--warning': isRestaurantOpen && isKitchenClosed,
              'restaurant-status--closed': !isRestaurantOpen,
            }"
          >
            <v-icon left small>
              {{
                isRestaurantOpen && !isKitchenClosed
                  ? 'mdi-door-open'
                  : 'mdi-door-closed'
              }}
            </v-icon>
            <span v-if="isKitchenClosed">Cuisine fermée</span>
            <span v-else-if="isRestaurantOpen">Ouvert</span>
            <span v-else>Fermé actuellement</span>
          </v-chip>

          <h1 id="restaurant-name" class="restaurant-title">
            {{ shopInfo.shop_name || 'Restaurant' }}
          </h1>

          <div class="restaurant-contact" aria-label="Coordonnees du restaurant">
            <a
              v-if="shopInfo.shop_adress"
              :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                shopInfo.shop_adress
              )}`"
              target="_blank"
              rel="noopener"
              class="restaurant-contact-link restaurant-address-link"
            >
              <v-icon small> mdi-map-marker </v-icon>
              <span>{{ shopInfo.shop_adress }}</span>
            </a>

            <a
              v-if="shopInfo.shop_phone"
              :href="`tel:${shopInfo.shop_phone}`"
              class="restaurant-contact-link restaurant-phone-link"
            >
              <v-icon small> mdi-phone </v-icon>
              <span>{{ shopInfo.shop_phone }}</span>
            </a>

            <aside v-if="shopStatus" class="restaurant-status-message">
              <v-icon color="primary"> mdi-bullhorn-outline </v-icon>
              <p>{{ shopStatus }}</p>
            </aside>
          </div>

          <v-btn
            color="primary"
            depressed
            large
            class="desktop-order-action text-none"
            :loading="loading"
            @click="goToClickAndCollect"
          >
            CLICK & COLLECT
            <v-icon right> mdi-arrow-right </v-icon>
          </v-btn>

        </section>

        <section
          v-if="shopInfo.shop_description"
          class="restaurant-story"
          aria-labelledby="restaurant-story-title"
        >
          <h2 id="restaurant-story-title">À propos</h2>

          <p v-if="shopInfo.shop_description" class="restaurant-description">
            {{ shopInfo.shop_description }}
          </p>
        </section>

        <section class="opening-hours-section" aria-labelledby="opening-hours-title">
          <div class="section-heading">
            <v-icon color="primary"> mdi-clock-outline </v-icon>
            <div>
              <h2 id="opening-hours-title">Horaires d'ouverture</h2>
              <p>Consultez les horaires avant de préparer votre commande.</p>
            </div>
          </div>

          <div v-if="shopHours.length" class="hours-list">
            <div
              v-for="(day, index) in shopHours"
              :key="index"
              class="hours-row"
              :class="{ 'hours-row--today': index === currentDayIndex }"
            >
              <span class="hours-day">
                {{ getDayName(day, index) }}
                <span v-if="index === currentDayIndex" class="today-label">
                  Aujourd'hui
                </span>
              </span>
              <span class="hours-time">{{ formatOpeningHours(day) }}</span>
            </div>
          </div>

          <p v-else class="empty-hours">Horaires non renseignés.</p>
        </section>

        <section
          v-if="socialLinks.length"
          class="community-section"
          aria-labelledby="community-title"
        >
          <h2 id="community-title">Nous rejoindre</h2>
          <p>Retrouvez les nouveautes et les coulisses du restaurant.</p>

          <div class="social-actions">
            <v-btn
              v-for="link in socialLinks"
              :key="link.name"
              :href="link.href"
              target="_blank"
              rel="noopener"
              icon
              :class="['social-action', link.brandClass]"
              :style="{
                color: link.color,
                backgroundColor: link.backgroundColor || undefined,
              }"
              :aria-label="`Ouvrir ${link.name}`"
            >
              <v-icon>{{ link.icon }}</v-icon>
            </v-btn>
          </div>
        </section>
      </main>

      <footer class="click-collect-footer">
        Propulsé par SmartEat.fr - {{ new Date().getFullYear() }}
      </footer>
    </div>

    <div class="mobile-order-bar">
      <v-btn
        color="primary"
        depressed
        block
        large
        class="text-none"
        :loading="loading"
        @click="goToClickAndCollect"
      >
        CLICK & COLLECT
        <v-icon right> mdi-arrow-right </v-icon>
      </v-btn>
    </div>

    <v-snackbar v-model="snackbar" color="red" text>
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script>
export default {
  layout: 'empty',
  data() {
    return {
      shopProfileImageFailed: false,
      loading: false,
      snackbar: false,
      snackbarMessage: 'Ce restaurant est actuellement fermé',
    }
  },
  computed: {
    staticURL() {
      const staticURL = this.$store.get('staticURL')
      return typeof staticURL === 'string' ? staticURL.replace(/\/+$/, '') : ''
    },
    fallbackHeroImage() {
      return require('@/assets/images/bg-login.jpg')
    },
    clickAndCollectServicePoint() {
      return (
        this.$store.get('shop/shop')?.shop?.click_and_collect_service_point ??
        this.$store.get('shop/clickAndCollectServicePoint')
      )
    },
    hasClickAndCollectServicePoint() {
      return (
        this.clickAndCollectServicePoint !== undefined &&
        this.clickAndCollectServicePoint !== null &&
        this.clickAndCollectServicePoint !== ''
      )
    },
    shopInfo() {
      const legacyShopInfo = this.$store.get('shop/shop')?.shop?.shop_info

      if (legacyShopInfo) {
        return legacyShopInfo
      }

      const shopInfo = {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_description: this.$store.get('shop/shop_description'),
        shop_hours: this.$store.get('shop/shop_hours'),
        shop_social_media: this.$store.get('shop/shop_social_media'),
        shop_profile_image: this.$store.get('shop/shop_profile_image'),
        shop_status: this.$store.get('shop/shop_status'),
        shop_theme: this.$store.get('shop/shop_theme'),
      }

      return Object.values(shopInfo).some((value) => Boolean(value)) ? shopInfo : {}
    },
    shopHours() {
      return Array.isArray(this.shopInfo.shop_hours) ? this.shopInfo.shop_hours : []
    },
    shopSocialMedia() {
      const socialMedia = this.shopInfo.shop_social_media
      return socialMedia && typeof socialMedia === 'object' ? socialMedia : {}
    },
    socialLinks() {
      const links = [
        {
          name: 'Instagram',
          href: this.shopSocialMedia.instagram,
          icon: 'mdi-instagram',
          brandClass: 'social-action--instagram',
          color: '#E1306C',
          backgroundColor: '',
        },
        {
          name: 'Facebook',
          href: this.shopSocialMedia.facebook,
          icon: 'mdi-facebook',
          brandClass: 'social-action--facebook',
          color: '#1877F2',
          backgroundColor: '',
        },
        {
          name: 'TikTok',
          href: this.shopSocialMedia.tiktok,
          icon: 'mdi-music-note',
          brandClass: 'social-action--tiktok',
          color: '#000000',
          backgroundColor: '',
        },
        {
          name: 'Snapchat',
          href: this.shopSocialMedia.snapchat,
          icon: 'mdi-snapchat',
          brandClass: 'social-action--snapchat',
          color: '#000000',
          backgroundColor: '#FFFC00',
        },
      ]

      return links
        .map((link) => ({
          ...link,
          href: typeof link.href === 'string' ? link.href.trim() : '',
        }))
        .filter((link) => link.href)
    },
    shopStatus() {
      const status = this.shopInfo.shop_status
      return typeof status === 'string' ? status.trim() : ''
    },
    isKitchenClosed() {
      return (
        this.$store.get('shop/shop')?.shop?.is_kitchen_close ??
        this.$store.get('shop/kitchen_closed')
      )
    },
    currentDayIndex() {
      const jsDay = new Date().getDay()
      return jsDay === 0 ? 6 : jsDay - 1
    },
    isRestaurantOpen() {
      const today = this.shopHours[this.currentDayIndex]

      if (!today || !today.isOpen) {
        return false
      }

      const openingHour = Number(today.from)
      const closingHour = Number(today.to)

      if (
        !Number.isFinite(openingHour) ||
        !Number.isFinite(closingHour) ||
        today.from == null ||
        today.to == null ||
        openingHour < 0 ||
        closingHour > 24 ||
        openingHour === closingHour
      ) {
        return false
      }

      const currentHour = new Date().getHours()
      return currentHour >= openingHour && currentHour < closingHour
    },
  },
  watch: {
    'shopInfo.shop_profile_image'() {
      this.shopProfileImageFailed = false
    },
  },
  mounted() {
    const { shopId, shopName } = this.$route.params

    if (!shopId || !shopName) {
      this.$router.push('/')
      return
    }

    this.$store.dispatch('shop/getShopInfoClickAndCollect', shopId)
  },
  methods: {
    formatOpeningHours(day) {
      if (!day || !day.isOpen) {
        return 'Fermé'
      }

      const openingHour = Number(day.from)
      const closingHour = Number(day.to)

      if (
        day.from == null ||
        day.to == null ||
        !Number.isFinite(openingHour) ||
        !Number.isFinite(closingHour)
      ) {
        return 'Horaires non renseign\u00E9s'
      }

      if (openingHour === closingHour) {
        return 'Fermé'
      }

      return `${String(openingHour).padStart(2, '0')}:00 - ${String(
        closingHour
      ).padStart(2, '0')}:00`
    },
    getDayName(day, index) {
      const weekDays = [
        'Lundi',
        'Mardi',
        'Mercredi',
        'Jeudi',
        'Vendredi',
        'Samedi',
        'Dimanche',
      ]

      return day?.day_name || day?.name || day?.day || weekDays[index] || ''
    },
    goToClickAndCollect() {
      if (this.isRestaurantOpen && !this.isKitchenClosed) {
        this.loading = true
        this.$store
          .dispatch('users/postClickAndCollectAccess', this.$route.params.shopId)
          .then((connected) => {
            if (connected) {
              this.$router.push('/menus')
            } else {
              this.snackbar = true
              this.snackbarMessage =
                this.$store.get('users/message') ||
                'Click & Collect indisponible.'
            }
          })
          .finally(() => {
            this.loading = false
          })
      } else {
        this.snackbar = true
        this.snackbarMessage = this.isKitchenClosed
          ? 'La cuisine est actuellement fermée'
          : 'Ce restaurant est actuellement fermé'
      }
    },
    shopProfileImageSrc(profileImage) {
      if (this.shopProfileImageFailed || !profileImage) {
        return this.fallbackHeroImage
      }

      return `${this.staticURL}/api/v1/imgprofile/${profileImage}`
    },
  },
}
</script>

<style scoped>
.click-collect-page {
  --cc-sticky-z: 90;
  min-height: 100vh;
  padding-bottom: 148px !important;
  background: var(--se-color-bg);
  color: var(--se-color-text-body);
}

.click-collect-shell {
  min-height: 100vh;
  background: var(--se-color-surface);
}

.click-collect-hero {
  position: relative;
  aspect-ratio: 16 / 5;
  height: auto;
  min-height: 180px;
  max-height: 380px;
  overflow: hidden;
  background: var(--se-color-surface-muted);
}

.hero-image-backdrop,
.shop-profile-image {
  position: absolute;
  inset: 0;
  height: 100%;
}

.hero-image-backdrop {
  transform: scale(1.08);
  opacity: 0.42;
  filter: blur(12px) saturate(1.08);
}

.shop-profile-image {
  z-index: 1;
}

.restaurant-profile-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 34px;
  text-align: center;
}

.restaurant-status {
  height: 34px;
  margin-bottom: 14px;
  border: 1px solid var(--se-color-border) !important;
  background: var(--se-color-surface) !important;
  color: var(--se-color-text-body) !important;
  font-weight: 700;
}

.restaurant-status--open {
  border-color: var(--se-color-success) !important;
  background: var(--se-color-success) !important;
  color: var(--se-color-surface) !important;
}

.restaurant-status--warning {
  color: var(--se-color-warning) !important;
}

.restaurant-status--closed {
  color: var(--se-color-danger) !important;
}

.restaurant-title {
  max-width: 16ch;
  margin: 0 0 12px;
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
  color: var(--se-color-text);
}

.restaurant-contact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.restaurant-contact-link {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 8px;
  color: var(--se-color-primary) !important;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}

.restaurant-contact-link:focus-visible,
.desktop-order-action:focus-visible,
.social-action:focus-visible,
.mobile-order-bar .v-btn:focus-visible {
  outline: 3px solid var(--se-color-primary);
  outline-offset: 3px;
}

.restaurant-contact-link .v-icon {
  flex: 0 0 auto;
  color: var(--se-color-primary);
}

.restaurant-address-link {
  max-width: min(320px, 100%);
  align-items: flex-start;
}

.restaurant-address-link .v-icon {
  margin-top: 2px;
}

.restaurant-address-link span {
  display: block;
  text-align: left;
}

.desktop-order-action {
  display: inline-flex;
  width: min(100%, 260px);
  min-height: 48px;
  padding: 0 22px !important;
  border-radius: var(--se-radius-md);
  font-weight: 800;
}

.order-unavailable {
  max-width: 340px;
  margin: 0;
  color: var(--se-color-text-muted);
  font-weight: 600;
}

.click-collect-content {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 20px 22px;
}

.opening-hours-section,
.restaurant-story,
.community-section {
  width: 100%;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.section-heading h2,
.restaurant-story h2,
.community-section h2 {
  margin: 0 0 4px;
  font-size: var(--se-font-title);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
  color: var(--se-color-text-body);
}

.section-heading p,
.community-section p {
  margin: 0;
  color: var(--se-color-text-muted);
  line-height: 1.5;
}

.hours-list {
  overflow: hidden;
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-lg);
  background: var(--se-color-surface);
}

.hours-row {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--se-color-border-soft);
}

.hours-row:last-child {
  border-bottom: 0;
}

.hours-row--today {
  background: var(--se-color-primary-soft);
}

.hours-day {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  color: var(--se-color-text-body);
}

.today-label {
  border-radius: 999px;
  padding: 3px 8px;
  background: var(--se-color-primary);
  color: var(--se-color-surface);
  font-size: var(--se-font-caption);
  font-weight: 800;
}

.hours-time {
  flex: 0 0 auto;
  color: var(--se-color-text-body);
  font-weight: 700;
  text-align: right;
}

.empty-hours {
  margin: 0;
  padding: 18px;
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-lg);
  color: var(--se-color-text-muted);
}

.restaurant-story,
.community-section {
  margin-top: 38px;
  padding-top: 34px;
  border-top: 1px solid var(--se-color-border-soft);
}

.restaurant-description {
  max-width: 68ch;
  margin: 0;
  color: var(--se-color-text-body);
  font-size: 1rem;
  line-height: 1.7;
}

.restaurant-status-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: min(360px, 100%);
  margin-top: 4px;
  padding: 12px 14px;
  border: 1px solid var(--se-color-border);
  border-radius: var(--se-radius-lg);
  background: var(--se-color-primary-soft);
  text-align: left;
}

.restaurant-status-message p {
  margin: 0;
  color: var(--se-color-text-body);
  font-weight: 600;
  line-height: 1.55;
}

.social-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
}

.social-action {
  width: 46px;
  min-width: 46px !important;
  height: 46px !important;
  border-radius: var(--se-radius-md);
  background: var(--se-color-surface);
  transition:
    transform 150ms ease,
    background-color 150ms ease;
}

.social-action .v-icon {
  color: currentColor;
}

.social-action:hover {
  transform: translateY(-2px);
  background: var(--se-color-surface-muted) !important;
}

.click-collect-footer {
  max-width: 780px;
  margin: 0 auto;
  padding: 18px 20px 28px;
  color: var(--se-color-text-muted);
  font-size: 0.86rem;
  text-align: center;
}

.mobile-order-bar {
  position: fixed;
  right: 14px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 14px;
  z-index: var(--cc-sticky-z);
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: none;
}

.mobile-order-bar .v-btn {
  min-height: 52px;
  border-radius: var(--se-radius-md);
  box-shadow: 0 14px 32px rgba(25, 118, 210, 0.26);
  font-weight: 800;
  pointer-events: auto;
}

@media (min-width: 960px) {
  .click-collect-page {
    padding: 24px !important;
  }

  .click-collect-shell {
    max-width: 1120px;
    margin: 0 auto;
    overflow: hidden;
    border: 1px solid var(--se-color-border);
    border-radius: var(--se-radius-lg);
  }

  .click-collect-hero {
    min-height: 300px;
  }

  .restaurant-profile-summary {
    margin-bottom: 42px;
  }

  .restaurant-title {
    max-width: 16ch;
  }

  .click-collect-content {
    padding: 44px 24px 28px;
  }

  .mobile-order-bar {
    display: none;
  }
}

@media (max-width: 520px) {
  .hours-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .hours-time {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .social-action {
    transition: none;
  }

  .social-action:hover {
    transform: none;
  }
}
</style>

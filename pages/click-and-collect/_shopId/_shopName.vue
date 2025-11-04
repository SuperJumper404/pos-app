<template>
  <v-container>
    <v-card
      v-if="loadPage"
      outlined
      class="mt-5 overflow-y-auto"
      style="height: 350px"
    >
      <Loading />
    </v-card>
    <template>
      <div>
        <v-col>
          <!-- <v-row>
            <div>
              <v-img
                height="100px"
                :src="`${staticURL}/api/v1/imgprofile/${shopInfo.shop_profile_image}`"
                alt="Image plein écran"
                style="width: 100%; height: 100%; object-fit: cover"
              />
            </div>
          </v-row> -->
          <v-img
            :src="`${staticURL}/api/v1/imgprofile/${shopInfo.shop_profile_image}`"
            height="50%"
            gradient="to bottom, rgba(36,36,41,0.5), rgba(36,36,41,0.5)"
            cover
          >
            <v-container fill-height class="d-flex align-center justify-center">
              <v-row>
                <v-col class="text-center">
                  <h2 class="text-white font-weight-bold">
                    {{ shopInfo.shop_name }}
                  </h2>
                </v-col>
              </v-row>
            </v-container>
          </v-img>

          <v-row>
            <v-btn
              color="primary"
              rounded
              href="/login?username=9dbdcaf6-1689-401f-8218-6edeb1ef4643@Restaurant Démo.com&password=PassworD_1"
              target="_blank"
            >
              Click & Collet <v-icon> mdi-arrow-top-right </v-icon>
            </v-btn>
          </v-row>
        </v-col>
      </div>
    </template>

    <pre type="json"> {{ shopInfo }}</pre>
    <pre type="json">
 {{ staticURL }}/api/v1/imgprofile/{{ shopInfo.shop_profile_image }}</pre
    >
  </v-container>
</template>
<script>
export default {
  layout: 'empty',
  data() {
    return {
      shop_identifier: '',
    }
  },

  computed: {
    staticURL() {
      return this.$store.get('staticURL')
    },
    shopInfo() {
      return {
        shop_name: this.$store.get('shop/shop_name'),
        shop_adress: this.$store.get('shop/shop_adress'),
        shop_phone: this.$store.get('shop/shop_phone'),
        shop_mail: this.$store.get('shop/shop_mail'),
        shop_description: this.$store.get('shop/shop_description'),
        shop_hours: this.$store.get('shop/shop_hours'),
        shop_payment_methods: this.$store.get('shop/shop_payment_methods'),
        shop_profile_image: this.$store.get('shop/shop_profile_image'),
        shop_status: this.$store.get('shop/shop_status'),
      }
    },
  },
  mounted() {
    console.log('params route', this.$route.params)
    console.log('params route', this.$route.params)
    if (!this.$route.params.shopId)
      this.$nuxt.error({ statusCode: 500, message: 'Shop Id Absent dans URL' })
    if (!this.$route.params.shopName)
      this.$nuxt.error({
        statusCode: 500,
        message: 'Shop Name Absent dans URL',
      })

    this.$store
      .dispatch('shop/getShopInfoClickAndCollect', this.$route.params.shopId)
      .finally(() => {
        console.log('ShopInfo', this.shopInfo)
      })
    // this.$store
    //   .dispatch('history/getOrderByToken', this.receipToken)
    //   .finally(() => {
    //     console.log('data order', this.$route)
    //     console.log('Query', this.$route)
    //     console.log('Current DAte', this.detailArchivedOrder[0].updated)
    //     const size = this.generateCleanTicketPDF(0)
    //     this.generateCleanTicketPDF(size)
    //   })
  },
  methods: {},
}
</script>

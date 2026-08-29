import EasyAccess, { defaultMutations } from 'vuex-easy-access'
import {
  DEFAULT_DISCOUNT_PERCENTAGES,
  normalizeDiscountPercentages,
} from '../helpers/discount'
const isEnabled = (value) => [true, 1, '1', 'true'].includes(value)

export const state = () => ({
  message: null,
  shop_name: '',
  shop_adress: '',
  shop_siret: '',
  shop_naf: '',
  shop_vat_number: '',
  receipt_review_qr_url: '',
  receipt_review_qr_label: '',
  cash_register_number: '',
  shop_phone: '',
  shop_mail: '',
  shop_description: '',
  shop_hours: '',
  shop_social_media: '',
  shop_payment_methods: '',
  shop_discount_percentages: DEFAULT_DISCOUNT_PERCENTAGES,
  shop_profile_image: '',
  shop_status: '',
  shop_printer_ip: '',
  smart_print_app: '',
  auto_print_order_tickets: false,
  activate_tva: false,
  kitchen_closed: false,
  clickAndCollectServicePoint: null,
  qr_payment_mode: 'stripe_before_order',
  stripe_connected: false,
  stripe_onboarding_complete: false,
  stripe_charges_enabled: false,
  stripe_payouts_enabled: false,
  stripe_account_id: '',
})
export const mutations = { ...defaultMutations(state()) }
export const plugins = [EasyAccess()]
export const actions = {
  getCurrentShopInfo({ dispatch }) {
    const access = parseInt(localStorage.getItem('access'))
    const shopId = localStorage.getItem('shopid')

    if (access === 0) {
      return dispatch('getShopInfo')
    }

    if (shopId) {
      return dispatch('getShopInfoClickAndCollect', shopId)
    }

    return dispatch('getShopInfo')
  },
  getShopInfo({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/shopInfo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        console.log('Shop Info received', response)
        // dispatch('set/insertId', response.data.data.insertId)
        dispatch('set/shop_name', response.data.data[0].shop_name)
        dispatch('set/shop_adress', response.data.data[0].shop_adress)
        dispatch('set/shop_siret', response.data.data[0].shop_siret)
        dispatch('set/shop_naf', response.data.data[0].shop_naf || '')
        dispatch(
          'set/shop_vat_number',
          response.data.data[0].shop_vat_number || ''
        )
        dispatch(
          'set/receipt_review_qr_url',
          response.data.data[0].receipt_review_qr_url || ''
        )
        dispatch(
          'set/receipt_review_qr_label',
          response.data.data[0].receipt_review_qr_label || ''
        )
        dispatch(
          'set/cash_register_number',
          response.data.data[0].cash_register_number || ''
        )
        dispatch('set/activate_tva', response.data.data[0].activate_tva)
        dispatch('set/shop_phone', response.data.data[0].shop_phone)
        dispatch('set/shop_status', response.data.data[0].shop_status)
        dispatch('set/kitchen_closed', response.data.data[0].kitchen_closed)
        dispatch('set/shop_mail', response.data.data[0].shop_mail)
        dispatch('set/shop_description', response.data.data[0].shop_description)
        console.log('Open Hours', JSON.parse(response.data.data[0].hours))
        dispatch('set/shop_hours', JSON.parse(response.data.data[0].hours))
        dispatch(
          'set/shop_social_media',
          JSON.parse(response.data.data[0].shop_social_media)
        )
        dispatch('set/shop_printer_ip', response.data.data[0].shop_printer_ip)
        dispatch('set/smart_print_app', response.data.data[0].smart_print_app)
        dispatch(
          'set/auto_print_order_tickets',
          isEnabled(response.data.data[0].auto_print_order_tickets)
        )
        dispatch(
          'set/shop_payment_methods',
          JSON.parse(response.data.data[0].shop_payment_methods)
        )
        dispatch(
          'set/shop_discount_percentages',
          normalizeDiscountPercentages(
            response.data.data[0].discount_percentages
              ? JSON.parse(response.data.data[0].discount_percentages)
              : DEFAULT_DISCOUNT_PERCENTAGES
          )
        )
        dispatch(
          'set/shop_profile_image',
          response.data.data[0].shop_profile_image
        )
        dispatch(
          'set/qr_payment_mode',
          response.data.data[0].qr_payment_mode || 'stripe_before_order'
        )
        dispatch(
          'set/clickAndCollectServicePoint',
          response.data.data[0].clickAndCollectServicePoint
        )
        dispatch(
          'set/stripe_account_id',
          response.data.data[0].stripe_account_id || ''
        )
        dispatch(
          'set/stripe_onboarding_complete',
          response.data.data[0].stripe_onboarding_complete || false
        )
        dispatch(
          'set/stripe_charges_enabled',
          response.data.data[0].stripe_charges_enabled || false
        )
        dispatch(
          'set/stripe_payouts_enabled',
          response.data.data[0].stripe_payouts_enabled || false
        )
        return true
      })
      .catch((error) => {
        console.log('Error', error)
        dispatch('set/message', error.response)
        return false
      })
  },
  getShopInfoClickAndCollect({ dispatch }, params) {
    return this.$axios
      .get(`/baseurl/api/v1/shopInfo/click-and-collect/${params}`)
      .then((response) => {
        console.log('Shop Info received CLick and Collect', response)
        // dispatch('set/insertId', response.data.data.insertId)
        dispatch('set/shop_name', response.data.data.shop_name)
        dispatch('set/shop_adress', response.data.data.shop_adress)
        dispatch('set/shop_siret', response.data.data.shop_siret)
        dispatch('set/shop_naf', response.data.data.shop_naf || '')
        dispatch(
          'set/shop_vat_number',
          response.data.data.shop_vat_number || ''
        )
        dispatch(
          'set/receipt_review_qr_url',
          response.data.data.receipt_review_qr_url || ''
        )
        dispatch(
          'set/receipt_review_qr_label',
          response.data.data.receipt_review_qr_label || ''
        )
        dispatch(
          'set/cash_register_number',
          response.data.data.cash_register_number || ''
        )
        dispatch('set/shop_phone', response.data.data.shop_phone)
        dispatch('set/shop_status', response.data.data.shop_status)
        dispatch('set/kitchen_closed', response.data.data.kitchen_closed)
        dispatch('set/shop_mail', response.data.data.shop_mail)
        dispatch('set/shop_description', response.data.data.shop_description)
        dispatch('set/shop_printer_ip', response.data.data.shop_printer_ip)
        dispatch('set/smart_print_app', response.data.data.smart_print_app)
        dispatch('set/activate_tva', response.data.data.activate_tva)
        console.log('Open Hours', JSON.parse(response.data.data.hours))
        dispatch('set/shop_hours', JSON.parse(response.data.data.hours))
        dispatch(
          'set/shop_payment_methods',
          JSON.parse(response.data.data.shop_payment_methods)
        )
        dispatch(
          'set/shop_discount_percentages',
          normalizeDiscountPercentages(
            response.data.data.discount_percentages
              ? JSON.parse(response.data.data.discount_percentages)
              : DEFAULT_DISCOUNT_PERCENTAGES
          )
        )
        dispatch(
          'set/shop_profile_image',
          response.data.data.shop_profile_image
        )
        dispatch(
          'set/qr_payment_mode',
          response.data.data.qr_payment_mode || 'stripe_before_order'
        )
        dispatch(
          'set/clickAndCollectServicePoint',
          response.data.data.clickAndCollectServicePoint
        )
        dispatch(
          'set/shop_social_media',
          JSON.parse(response.data.data.shop_social_media)
        )
        dispatch(
          'set/stripe_charges_enabled',
          response.data.data.stripe_charges_enabled || false
        )
        dispatch(
          'set/auto_print_order_tickets',
          isEnabled(response.data.data.auto_print_order_tickets)
        )
        return true
      })
      .catch((error) => {
        console.log('Error', error)
        dispatch('set/message', error.response)
        return false
      })
  },
  updateShopInfo({ dispatch }, params) {
    return this.$axios
      .patch('/baseurl/api/v1/updateShopInfo', params.data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then(async (response) => {
        dispatch('set/message', response.data.message)
        await dispatch('getShopInfo')
        dispatch(
          'notifications/success',
          'Paramètres de la boutique enregistrés.',
          {
            root: true,
          }
        )
        return true
      })
      .catch((error) => {
        dispatch('set/message', error.response.data.message)
        return false
      })
  },
  getStripeConnectStatus({ dispatch }) {
    return this.$axios
      .get('/baseurl/api/v1/stripe/connect/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => {
        const data = response.data.data
        dispatch('set/stripe_connected', data.connected)
        dispatch('set/stripe_onboarding_complete', data.onboarding_complete)
        dispatch('set/stripe_charges_enabled', data.charges_enabled)
        dispatch('set/stripe_payouts_enabled', data.payouts_enabled)
        dispatch('set/stripe_account_id', data.stripe_account_id || '')
        return data
      })
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        return null
      })
  },
  createStripeOnboardingLink({ dispatch }) {
    return this.$axios
      .post(
        '/baseurl/api/v1/stripe/connect/onboarding-link',
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )
      .then((response) => response.data.data)
      .catch((error) => {
        dispatch('set/message', error.response?.data?.message)
        return null
      })
  },
}

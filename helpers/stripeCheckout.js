const hasCartItems = (dataCart) =>
  Array.isArray(dataCart) && dataCart.length > 0

const shouldAutoPrepareStripeCheckout = ({
  isQrClient,
  isStripeCheckout,
  isValue,
  dataCart,
  isKitchenClosed,
  stripePaymentReady,
  stripePreparing,
  deliveryReady = true,
}) =>
  Boolean(
    isQrClient &&
      isStripeCheckout &&
      isValue &&
      hasCartItems(dataCart) &&
      !isKitchenClosed &&
      !stripePaymentReady &&
      !stripePreparing
      && deliveryReady
  )

const buildStripeCheckoutSignature = ({
  customer,
  phone,
  selectedTable,
  total,
  dataCart,
  fulfillmentType,
  deliveryQuoteToken,
  addressResolutionToken,
}) =>
  JSON.stringify({
    customer,
    phone,
    selectedTable,
    total,
    ...(fulfillmentType === 'delivery' ? { fulfillmentType, deliveryQuoteToken, addressResolutionToken } : {}),
    items: (Array.isArray(dataCart) ? dataCart : []).map((item) => ({
      id: item.id,
      price: item.price,
      qty: item.qty,
      customizationList: item.customizationList,
    })),
  })

module.exports = {
  buildStripeCheckoutSignature,
  shouldAutoPrepareStripeCheckout,
}

const assert = require("assert");
const {
  getPaymentStatusDisplay,
  getPaymentStatusText,
  getPaymentStatusColor,
} = require("../helpers/paymentStatus");

assert.deepStrictEqual(
  getPaymentStatusDisplay({ payment_status: "paid", payment: "Stripe" }),
  {
    text: "Stripe",
    color: "#635BFF",
  },
);

assert.deepStrictEqual(
  getPaymentStatusDisplay({
    payment_status: "paid",
    payment_provider: "stripe",
    payment: "Apple Pay",
  }),
  {
    text: "Apple Pay",
    color: "#635BFF",
  },
);

assert.deepStrictEqual(
  getPaymentStatusDisplay({
    payment_status: "paid",
    payment_provider: "stripe",
    payment: "Google Pay",
  }),
  {
    text: "Google Pay",
    color: "#635BFF",
  },
);

assert.deepStrictEqual(
  getPaymentStatusDisplay({
    payment_status: "paid",
    payment: "Stripe",
    used_payment_method: "Carte",
  }),
  {
    text: "Carte",
    color: "#635BFF",
  },
);

assert.deepStrictEqual(
  getPaymentStatusDisplay({ payment_status: "paid", payment: "Espèce" }),
  {
    text: "Espèce",
    color: "success",
  },
);

assert.deepStrictEqual(getPaymentStatusDisplay({ payment_status: "paid" }), {
  text: "Payé",
  color: "success",
});

assert.deepStrictEqual(
  getPaymentStatusDisplay({ payment_status: "requires_payment" }),
  {
    text: "Paiement en attente",
    color: "info",
  },
);

assert.deepStrictEqual(
  getPaymentStatusDisplay({ payment_status: "refunded" }),
  {
    text: "Remboursé",
    color: "warning",
  },
);

assert.deepStrictEqual(
  getPaymentStatusDisplay({
    payment_status: "unpaid",
    payment: "Paiement au comptoir",
  }),
  {
    text: "À payer au comptoir",
    color: "orange",
  },
);

assert.strictEqual(getPaymentStatusText({ payment_status: "failed" }), "Échoué");
assert.strictEqual(getPaymentStatusColor({ payment_status: "failed" }), "error");

console.log("paymentStatus tests passed");

const normalizeLoyaltySelection = (value) => {
  if (!value || typeof value.memberId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.memberId)) return null
  const confirmed = value.confirmed === true && typeof value.rewardId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.rewardId) &&
    Number.isSafeInteger(value.expectedDiscountCents) && value.expectedDiscountCents >= 0
  return { memberId: value.memberId, cardNumber: value.cardNumber, rewardId: confirmed ? value.rewardId : null,
    confirmed, expectedDiscountCents: confirmed ? value.expectedDiscountCents : 0, totalCents: value.totalCents }
}
const loyaltyCheckoutFields = (selection, terminal = false) => {
  const value = normalizeLoyaltySelection(selection)
  if (!value) return {}
  return terminal ? { loyalty_member_id: value.memberId, ...(value.confirmed ? { loyalty_reward_id: value.rewardId, loyalty_confirmed: true, loyalty_expected_discount_cents: value.expectedDiscountCents } : {}) }
    : { loyaltyMemberId: value.memberId, ...(value.confirmed ? { loyaltyRewardId: value.rewardId, loyaltyConfirmed: true, loyaltyExpectedDiscountCents: value.expectedDiscountCents } : {}) }
}
module.exports = { normalizeLoyaltySelection, loyaltyCheckoutFields }

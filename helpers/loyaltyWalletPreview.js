function buildWalletCardPreview(program, now = Date.now()) {
  const goals = (program.rewards || []).filter(reward => Number.isSafeInteger(reward.points) && reward.points > 0
    && (!reward.expiresAt || Date.parse(reward.expiresAt) > now)).sort((a, b) => a.points - b.points)
  const goal = goals[0]
  const balance = goal ? Math.floor(goal.points * (2 / 3)) : 0
  const progress = goal ? { value: balance, max: goal.points, ratio: balance / goal.points, rewardName: goal.name } : null
  return { balance, progress, rewardText: goal ? `${goal.name} — ${balance} / ${goal.points} points` : 'Découvrez vos récompenses dans SmartEat' }
}

module.exports = { buildWalletCardPreview }

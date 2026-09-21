const MAX_DAILY_PERIODS = 2

const normalizePeriod = (period = {}) => ({
  from: period.from == null ? '' : period.from,
  to: period.to == null ? '' : period.to,
})

const getDayPeriods = (day = {}) => {
  const periods = Array.isArray(day.periods)
    ? day.periods
    : [{ from: day.from, to: day.to }]
  return periods.slice(0, MAX_DAILY_PERIODS).map(normalizePeriod)
}

const normalizeShopHours = (hours) => (Array.isArray(hours) ? hours : []).map((day) => ({
  ...day,
  periods: getDayPeriods(day),
}))

const validPeriods = (day) => getDayPeriods(day).filter((period) => {
  const from = Number(period.from)
  const to = Number(period.to)
  return period.from !== ''
    && period.to !== ''
    && Number.isFinite(from)
    && Number.isFinite(to)
    && from >= 0
    && to <= 24
    && from < to
})

const isHourInPeriods = (day, hour) => validPeriods(day).some((period) => (
  hour >= Number(period.from) && hour < Number(period.to)
))

module.exports = {
  MAX_DAILY_PERIODS,
  getDayPeriods,
  isHourInPeriods,
  normalizeShopHours,
  validPeriods,
}

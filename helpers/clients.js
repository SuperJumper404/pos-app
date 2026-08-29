const normalizeClientPhone = (phone) =>
  String(phone == null ? '' : phone).replace(/[^\d+]/g, '').trim()

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100

const dayDiff = (from, to) => {
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  return Math.max(0, Math.floor((endDay - startDay) / 86400000))
}

const formatLastVisitLabel = (days) => {
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return `Il y a ${days} jours`
}

const formatCsvDate = (date) => {
  if (!date) return ''
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return value.toISOString().slice(0, 10)
}

const escapeCsvValue = (value) => {
  const text = String(value == null ? '' : value)
  if (!/[;"\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

const buildArchivedClientRows = (orders, now = new Date()) => {
  const groups = {}

  ;(Array.isArray(orders) ? orders : []).forEach((order) => {
    const phoneKey = normalizeClientPhone(order && order.phone)
    if (!phoneKey) return

    if (!groups[phoneKey]) {
      groups[phoneKey] = {
        phoneKey,
        phone: String(order.phone).trim(),
        names: {},
        orderCount: 0,
        totalSpent: 0,
        firstOrderAt: null,
        lastOrderAt: null,
      }
    }

    const group = groups[phoneKey]
    const name = String((order && order.customer) || '').trim()
    if (name) group.names[name] = (group.names[name] || 0) + 1

    group.orderCount += 1
    group.totalSpent = roundMoney(group.totalSpent + Number(order.subtotal || 0))

    const created = new Date(order.created)
    if (!Number.isNaN(created.getTime())) {
      const iso = created.toISOString()
      if (!group.firstOrderAt || iso < group.firstOrderAt) {
        group.firstOrderAt = iso
      }
      if (!group.lastOrderAt || iso > group.lastOrderAt) {
        group.lastOrderAt = iso
      }
    }
  })

  return Object.values(groups)
    .map((group) => {
      const topNames = Object.entries(group.names)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([name]) => name)
      const lastVisitDays =
        group.lastOrderAt == null ? null : dayDiff(group.lastOrderAt, now)

      return {
        ...group,
        topNames,
        averageSpent: roundMoney(group.totalSpent / group.orderCount),
        lastVisitDays,
        lastVisitLabel:
          lastVisitDays == null ? '-' : formatLastVisitLabel(lastVisitDays),
        searchText: [group.phone, group.phoneKey, ...topNames].join(' '),
      }
    })
    .sort((a, b) =>
      String(b.lastOrderAt || '').localeCompare(a.lastOrderAt || '')
    )
}

const buildArchivedClientsMetrics = (orders, clientRows) => {
  const safeOrders = Array.isArray(orders) ? orders : []
  const rows = Array.isArray(clientRows) ? clientRows : []
  const ordersWithPhone = safeOrders.filter((order) =>
    normalizeClientPhone(order && order.phone)
  ).length
  const ordersWithoutPhone = safeOrders.length - ordersWithPhone
  const returningClients = rows.filter((row) => row.orderCount > 1).length
  const returnRate = rows.length
    ? Math.round((returningClients / rows.length) * 100)
    : 0

  return {
    clientCount: rows.length,
    ordersWithPhone,
    ordersWithoutPhone,
    phoneCoverageRatio: `${ordersWithPhone} / ${ordersWithoutPhone}`,
    inactiveOver30Days: rows.filter((row) => row.lastVisitDays > 30).length,
    returnRate,
    returnRateLabel: `${returnRate}%`,
  }
}

const buildArchivedClientsCsv = (clientRows) => {
  const headers = [
    'Telephone',
    'Top 3 noms',
    'Commandes',
    'Total depense',
    'Panier moyen',
    'Premiere commande',
    'Derniere visite',
  ]
  const rows = (Array.isArray(clientRows) ? clientRows : []).map((row) => [
    row.phoneKey || row.phone,
    (row.topNames || []).join(', '),
    row.orderCount,
    roundMoney(row.totalSpent).toFixed(2),
    roundMoney(row.averageSpent).toFixed(2),
    formatCsvDate(row.firstOrderAt),
    row.lastVisitLabel,
  ])

  return [headers, ...rows]
    .map((line) => line.map(escapeCsvValue).join(';'))
    .join('\n')
}

module.exports = {
  buildArchivedClientRows,
  buildArchivedClientsCsv,
  buildArchivedClientsMetrics,
  normalizeClientPhone,
}

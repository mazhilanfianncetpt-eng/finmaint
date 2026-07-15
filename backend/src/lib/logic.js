const { addDays, todayISO } = require('./format')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPayments(b) {
  // Neon/Prisma returns Json[] — guard against null/undefined
  return Array.isArray(b.payments) ? b.payments : []
}

function isPaidOn(b, dueDate) {
  return getPayments(b).some(p => p.dueDate === dueDate)
}

function paidOnFor(b, dueDate) {
  return getPayments(b).find(p => p.dueDate === dueDate)?.paidOn ?? null
}

// ─── Core ─────────────────────────────────────────────────────────────────────

function dueDatesFor(b) {
  const dates = []
  for (let i = 0; i < b.dueCount; i++) {
    const offset = b.frequency === 'daily' ? i : i * 7
    dates.push(addDays(b.startDate, offset))
  }
  return dates
}

function nextDueDate(b) {
  const today = todayISO()
  const dates = dueDatesFor(b)
  return dates.find(d => d >= today && !isPaidOn(b, d)) ?? null
}

function overdueCount(b) {
  const today = todayISO()
  const dates = dueDatesFor(b)
  return dates.filter(d => d < today && !isPaidOn(b, d)).length
}

function borrowersDueOn(borrowers, date, zoneId) {
  return borrowers.filter(b => {
    if (zoneId && b.zoneId !== zoneId) return false
    return dueDatesFor(b).includes(date)
  })
}

// Walks day by day from initialOpeningDate to `date`, accumulating received amounts.
function ledgerFor(settings, borrowers, date, zoneId = null) {
  const { initialOpeningBalance, initialOpeningDate } = settings
  let opening = initialOpeningBalance

  if (date > initialOpeningDate) {
    let cursor = initialOpeningDate
    while (cursor < date) {
      const due = borrowersDueOn(borrowers, cursor, zoneId)
      const dayRec = due.reduce((s, b) => s + (isPaidOn(b, cursor) ? b.installmentAmount : 0), 0)
      opening += dayRec
      cursor = addDays(cursor, 1)
    }
  }

  const dueBorrowers = borrowersDueOn(borrowers, date, zoneId)
  const totalCollection = dueBorrowers.reduce((s, b) => s + b.installmentAmount, 0)
  const paidBorrowers = dueBorrowers.filter(b => isPaidOn(b, date))
  const unpaidBorrowers = dueBorrowers.filter(b => !isPaidOn(b, date))
  const totalReceived = paidBorrowers.reduce((s, b) => s + b.installmentAmount, 0)
  const closing = opening + totalReceived

  return { date, zoneId, opening, totalCollection, totalReceived, closing, paidBorrowers, unpaidBorrowers }
}

function paymentHistory(b) {
  const dates = dueDatesFor(b)
  let balance = b.amount
  return dates.map(date => {
    const paid = isPaidOn(b, date)
    const paidOn = paidOnFor(b, date)
    const amountPaid = paid ? b.installmentAmount : 0
    if (paid) balance = Math.max(0, balance - b.installmentAmount)
    return { date, due: true, paid, paidOn, amountPaid, balance }
  })
}

function calcEndDate(startDate, dueCount, frequency) {
  const offset = frequency === 'daily' ? dueCount - 1 : (dueCount - 1) * 7
  return addDays(startDate, offset)
}

module.exports = {
  dueDatesFor,
  nextDueDate,
  overdueCount,
  ledgerFor,
  paymentHistory,
  calcEndDate,
  borrowersDueOn,
}
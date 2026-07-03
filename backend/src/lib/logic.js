const { addDays, todayISO } = require('./format')

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
  return dates.find(d => d >= today && !b.paidInstallments.includes(d)) ?? null
}

function overdueCount(b) {
  const today = todayISO()
  const dates = dueDatesFor(b)
  return dates.filter(d => d < today && !b.paidInstallments.includes(d)).length
}

function borrowersDueOn(borrowers, date, zoneId) {
  return borrowers.filter(b => {
    if (zoneId && b.zoneId !== zoneId) return false
    return dueDatesFor(b).includes(date)
  })
}

// Walks day by day from initialOpeningDate to `date`, accumulating (due - received).
function ledgerFor(settings, borrowers, date, zoneId = null) {
  const { initialOpeningBalance, initialOpeningDate } = settings
  let opening = initialOpeningBalance

  if (date > initialOpeningDate) {
    let cursor = initialOpeningDate
    while (cursor < date) {
      const due = borrowersDueOn(borrowers, cursor, zoneId)
      const dayDue = due.reduce((s, b) => s + b.installmentAmount, 0)
      const dayRec = due.reduce((s, b) => s + (b.paidInstallments.includes(cursor) ? b.installmentAmount : 0), 0)
      opening += dayDue - dayRec
      cursor = addDays(cursor, 1)
    }
  }

  const dueBorrowers = borrowersDueOn(borrowers, date, zoneId)
  const totalCollection = dueBorrowers.reduce((s, b) => s + b.installmentAmount, 0)
  const paidBorrowers = dueBorrowers.filter(b => b.paidInstallments.includes(date))
  const unpaidBorrowers = dueBorrowers.filter(b => !b.paidInstallments.includes(date))
  const totalReceived = paidBorrowers.reduce((s, b) => s + b.installmentAmount, 0)
  const closing = opening + (totalCollection - totalReceived)

  return { date, zoneId, opening, totalCollection, totalReceived, closing, paidBorrowers, unpaidBorrowers }
}

function paymentHistory(b) {
  const dates = dueDatesFor(b)
  let balance = b.amount
  return dates.map(date => {
    const paid = b.paidInstallments.includes(date)
    const amountPaid = paid ? b.installmentAmount : 0
    if (paid) balance = Math.max(0, balance - b.installmentAmount)
    return { date, due: true, paid, amountPaid, balance }
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

import type { Borrower, DB } from './store'
import { addDays, todayISO } from './format'

export function dueDatesFor(b: Borrower): string[] {
  const dates: string[] = []
  for (let i = 0; i < b.dueCount; i++) {
    const offset = b.frequency === 'daily' ? i : i * 7
    dates.push(addDays(b.startDate, offset))
  }
  return dates
}

export function nextDueDate(b: Borrower): string | null {
  const today = todayISO()
  const dates = dueDatesFor(b)
  return dates.find(d => d >= today && !b.paidInstallments.includes(d)) ?? null
}

export function overdueCount(b: Borrower): number {
  const today = todayISO()
  const dates = dueDatesFor(b)
  return dates.filter(d => d < today && !b.paidInstallments.includes(d)).length
}

export interface LedgerResult {
  date: string
  zoneId: string | null
  opening: number
  totalCollection: number
  totalReceived: number
  closing: number
  paidBorrowers: Borrower[]
  unpaidBorrowers: Borrower[]
}

export function ledgerFor(db: DB, date: string, zoneId: string | null = null): LedgerResult {
  const { settings, borrowers } = db
  const { initialOpeningBalance, initialOpeningDate } = settings

  // Walk from initialOpeningDate to date-1, accumulating only received each day
  let opening = initialOpeningBalance

  if (date > initialOpeningDate) {
    let cursor = initialOpeningDate
    while (cursor < date) {
      const due = borrowersDueOn(borrowers, cursor, zoneId)
      const dayRec = due.reduce((s, b) => s + (b.paidInstallments.includes(cursor) ? b.installmentAmount : 0), 0)
      opening += dayRec
      cursor = addDays(cursor, 1)
    }
  } else {
    opening = initialOpeningBalance
  }

  const dueBorrowers = borrowersDueOn(borrowers, date, zoneId)
  const totalCollection = dueBorrowers.reduce((s, b) => s + b.installmentAmount, 0)
  const paidBorrowers = dueBorrowers.filter(b => b.paidInstallments.includes(date))
  const unpaidBorrowers = dueBorrowers.filter(b => !b.paidInstallments.includes(date))
  const totalReceived = paidBorrowers.reduce((s, b) => s + b.installmentAmount, 0)
  const closing = opening + totalReceived

  return { date, zoneId, opening, totalCollection, totalReceived, closing, paidBorrowers, unpaidBorrowers }
}

function borrowersDueOn(borrowers: Borrower[], date: string, zoneId: string | null): Borrower[] {
  return borrowers.filter(b => {
    if (zoneId && b.zoneId !== zoneId) return false
    return dueDatesFor(b).includes(date)
  })
}

export interface PreviewDay {
  date: string
  opening: number
  totalCollection: number
  totalReceived: number
  closing: number
}

export function previewLedger(
  db: DB,
  fromDate: string,
  days: number,
  override?: { initialOpeningBalance: number; initialOpeningDate: string }
): PreviewDay[] {
  const fakeDB = override
    ? { ...db, settings: { ...db.settings, ...override } }
    : db

  const result: PreviewDay[] = []
  for (let i = 0; i < days; i++) {
    const d = addDays(fromDate, i)
    const l = ledgerFor(fakeDB, d, null)
    result.push({ date: d, opening: l.opening, totalCollection: l.totalCollection, totalReceived: l.totalReceived, closing: l.closing })
  }
  return result
}

export interface PaymentHistoryRow {
  date: string
  due: boolean
  paid: boolean
  amountPaid: number
  balance: number
}

export function paymentHistory(b: Borrower): PaymentHistoryRow[] {
  const dates = dueDatesFor(b)
  let balance = b.amount
  return dates.map(date => {
    const paid = b.paidInstallments.includes(date)
    const amountPaid = paid ? b.installmentAmount : 0
    if (paid) balance = Math.max(0, balance - b.installmentAmount)
    return { date, due: true, paid, amountPaid, balance }
  })
}

export function calcEndDate(startDate: string, dueCount: number, frequency: Frequency): string {
  const offset = frequency === 'daily' ? dueCount - 1 : (dueCount - 1) * 7
  return addDays(startDate, offset)
}

import type { Frequency } from './store'
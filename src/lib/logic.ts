import type { Borrower, DB } from './store'
import { addDays, todayISO } from './format'

// Helper — check if a due date has been paid
function isPaidOn(b: Borrower, dueDate: string): boolean {
  return b.payments.some(p => p.dueDate === dueDate)
}

// Helper — check if any payment was actually collected on a given calendar date
function wasCollectedOn(b: Borrower, collectionDate: string): boolean {
  return b.payments.some(p => p.paidOn === collectionDate)
}

// Helper — sum of installmentAmount for every payment whose paidOn === collectionDate
function amountCollectedOn(b: Borrower, collectionDate: string): number {
  const count = b.payments.filter(p => p.paidOn === collectionDate).length
  return count * b.installmentAmount
}

// Helper — get paidOn date for a dueDate
function paidOnFor(b: Borrower, dueDate: string): string | null {
  return b.payments.find(p => p.dueDate === dueDate)?.paidOn ?? null
}

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
  return dates.find(d => d >= today && !isPaidOn(b, d)) ?? null
}

export function overdueCount(b: Borrower): number {
  const today = todayISO()
  const dates = dueDatesFor(b)
  return dates.filter(d => d < today && !isPaidOn(b, d)).length
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

  const scoped = zoneId ? borrowers.filter(b => b.zoneId === zoneId) : borrowers

  // Opening = initialOpeningBalance + all payments whose paidOn < date
  let opening = initialOpeningBalance
  if (date > initialOpeningDate) {
    for (const b of scoped) {
      const collected = b.payments.filter(p => p.paidOn < date && p.paidOn >= initialOpeningDate).length
      opening += collected * b.installmentAmount
    }
  }

  // Due borrowers = those who have a scheduled due date on `date`
  const dueBorrowers = borrowersDueOn(borrowers, date, zoneId)
  const totalCollection = dueBorrowers.reduce((s, b) => s + b.installmentAmount, 0)

  // Paid today = due on `date` AND their paidOn === date (collected today, on time)
  //            + due on any earlier date AND their paidOn === date (collected today, late)
  // i.e. anyone whose payment was physically collected on `date`
  const allPaidToday = scoped.filter(b => wasCollectedOn(b, date))

  // For the "paid/unpaid" split we still show against due date borrowers:
  const paidBorrowers   = dueBorrowers.filter(b => isPaidOn(b, date))
  const unpaidBorrowers = dueBorrowers.filter(b => !isPaidOn(b, date))

  // Received = money physically collected on `date` (paidOn === date), across all borrowers
  const totalReceived = scoped.reduce((s, b) => s + amountCollectedOn(b, date), 0)

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
  paidOn: string | null
  amountPaid: number
  balance: number
}

export function paymentHistory(b: Borrower): PaymentHistoryRow[] {
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

export function calcEndDate(startDate: string, dueCount: number, frequency: Frequency): string {
  const offset = frequency === 'daily' ? dueCount - 1 : (dueCount - 1) * 7
  return addDays(startDate, offset)
}

import type { Frequency } from './store'
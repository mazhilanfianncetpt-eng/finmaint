import { createFileRoute, Link } from '@tanstack/react-router'
import { useDBSnap, write } from '../lib/store'
import { AppHeader } from '../components/ui'
import { paymentHistory, nextDueDate, overdueCount } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/lender/borrower/$id')({
  component: BorrowerHistoryPage,
})

function BorrowerHistoryPage() {
  const { id } = Route.useParams()
  const db = useDBSnap()
  const b = db.borrowers.find(b => b.id === id)
  const today = todayISO()

  if (!b) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[var(--color-muted)]">Borrower not found.</p>
        <Link to="/lender/borrowers" className="text-[var(--color-primary-400)] text-sm mt-2 inline-block">← Back</Link>
      </div>
    )
  }

  const history = paymentHistory(b)
  const paidTotal = b.paidInstallments.length * b.installmentAmount
  const remaining = Math.max(0, b.amount - paidTotal)
  const overdue = overdueCount(b)
  const next = nextDueDate(b)
  const zone = db.settings.zones.find(z => z.id === b.zoneId)

  function togglePaid(date: string, wasPaid: boolean) {
    write(d => ({
      ...d,
      borrowers: d.borrowers.map(bw => {
        if (bw.id !== id) return bw
        const paidInstallments = wasPaid
          ? bw.paidInstallments.filter(x => x !== date)
          : [...bw.paidInstallments, date]
        return { ...bw, paidInstallments }
      }),
    }))
  }

  return (
    <div className="flex flex-col">
      <AppHeader title={b.name} subtitle={b.shopName} />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Back link */}
        <Link to="/lender/borrowers" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-400)] hover:text-[var(--color-primary-300)]">
          <ChevronLeft size={12} /> All Borrowers
        </Link>

        {/* Info strip */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-[var(--color-text)]">{b.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{b.shopName} · {b.phone}</p>
              {zone && <span className="text-[10px] bg-[var(--color-primary-900)] text-[var(--color-primary-300)] px-2 py-0.5 rounded-full mt-1 inline-block">{zone.name}</span>}
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-muted)]">Pay mode</p>
              <p className="text-xs font-medium text-[var(--color-text)] capitalize">{b.payMode}</p>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-[10px] text-[var(--color-muted)]">Total Payable</p>
              <p className="text-sm font-bold num text-[var(--color-text)]">{inr(b.totalPayable)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[var(--color-muted)]">Paid So Far</p>
              <p className="text-sm font-bold num text-[var(--color-primary-400)]">{inr(paidTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[var(--color-muted)]">Remaining</p>
              <p className="text-sm font-bold num text-[var(--color-gold-400)]">{inr(remaining)}</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
              <span>{b.paidInstallments.length}/{b.dueCount} installments</span>
              <span>{Math.round((b.paidInstallments.length / b.dueCount) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-[var(--color-surface-700)] rounded-full">
              <div className="h-1.5 bg-[var(--color-primary-500)] rounded-full" style={{ width: `${Math.round((b.paidInstallments.length / b.dueCount) * 100)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mt-3">
            <div><span className="text-[var(--color-muted)]">Next due: </span><span className="text-[var(--color-text)]">{fmtDate(next)}</span></div>
            <div><span className="text-[var(--color-muted)]">Frequency: </span><span className="text-[var(--color-text)] capitalize">{b.frequency}</span></div>
            <div><span className="text-[var(--color-muted)]">Start: </span><span className="text-[var(--color-text)]">{fmtDate(b.startDate)}</span></div>
            <div><span className="text-[var(--color-muted)]">End: </span><span className="text-[var(--color-text)]">{fmtDate(b.endDate)}</span></div>
            {overdue > 0 && <div className="col-span-2"><span className="text-[var(--color-danger-400)] font-medium">{overdue} overdue installment{overdue > 1 ? 's' : ''}</span></div>}
          </div>
        </div>

        {/* Payment history table */}
        <section>
          <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-2">Payment Schedule</p>
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left px-3 py-2 text-[var(--color-muted)] font-medium">Date</th>
                  <th className="text-center px-2 py-2 text-[var(--color-muted)] font-medium">Status</th>
                  <th className="text-right px-3 py-2 text-[var(--color-muted)] font-medium">Amount</th>
                  <th className="text-right px-3 py-2 text-[var(--color-muted)] font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => {
                  const isToday = row.date === today
                  const isPast = row.date < today
                  const isFuture = row.date > today
                  const isOverdue = isPast && !row.paid

                  return (
                    <tr
                      key={row.date}
                      className={`border-b border-[var(--color-surface-800)] last:border-0 ${isToday ? 'bg-amber-950/20' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <span className="text-[var(--color-text-soft)]">{fmtDate(row.date)}</span>
                        {isToday && <span className="ml-1 text-[10px] bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded-full">Today</span>}
                        {isOverdue && <span className="ml-1 text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full">Overdue</span>}
                      </td>
                      <td className="text-center px-2 py-2">
                        <input
                          type="checkbox"
                          checked={row.paid}
                          disabled={!isToday}
                          onChange={() => togglePaid(row.date, row.paid)}
                        />
                      </td>
                      <td className="text-right px-3 py-2 num">
                        <span className={row.paid ? 'text-[var(--color-primary-400)]' : isFuture ? 'text-[var(--color-muted)]' : 'text-[var(--color-danger-400)]'}>
                          {inr(b.installmentAmount)}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2 num">
                        <span className={row.balance === 0 ? 'text-[var(--color-primary-400)]' : 'text-[var(--color-text-soft)]'}>
                          {inr(row.balance)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

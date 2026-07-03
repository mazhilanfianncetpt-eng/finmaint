import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, togglePayment, deleteBorrower } from '../lib/store'
import { AppHeader, ConfirmDialog } from '../components/ui'
import { paymentHistory, nextDueDate, overdueCount } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { ChevronLeft, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/lender/borrower/$id')({
  component: BorrowerHistoryPage,
})

function BorrowerHistoryPage() {
  const { id } = Route.useParams()
  const db = useDBSnap()
  const navigate = useNavigate()
  const b = db.borrowers.find(b => b.id === id)
  const today = todayISO()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!b) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-base font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
          Borrower not found.
        </p>
        <Link
          to="/lender/borrowers"
          className="text-sm inline-block"
          style={{ color: 'var(--color-primary-500)' }}
        >
          ← Back to Borrowers
        </Link>
      </div>
    )
  }

  const history   = paymentHistory(b)
  const paidTotal = b.paidInstallments.length * b.installmentAmount
  const remaining = Math.max(0, b.amount - paidTotal)
  const overdue   = overdueCount(b)
  const next      = nextDueDate(b)
  const zone      = db.settings.zones.find(z => z.id === b.zoneId)
  const progress  = Math.round((b.paidInstallments.length / b.dueCount) * 100)

  function togglePaid(date: string, _wasPaid: boolean) {
    togglePayment(id, date).catch(() => {})
  }

  async function handleDelete() {
    await deleteBorrower(id)
    navigate({ to: '/lender/borrowers' })
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Mobile header */}
      <div className="md:hidden">
        <AppHeader
          title={b.name}
          subtitle={`${b.shopName}${zone ? ' · ' + zone.name : ''}`}
        />
      </div>

      <div className="page-pad flex flex-col gap-4">
        {/* Back + Delete row */}
        <div className="flex items-center justify-between">
          <Link
            to="/lender/borrowers"
            className="inline-flex items-center gap-1 text-sm transition-fast"
            style={{ color: 'var(--color-primary-500)' }}
            aria-label="Back to all borrowers"
          >
            <ChevronLeft size={14} aria-hidden="true" /> All Borrowers
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-fast"
            style={{ color: '#ef4444', border: '1px solid #ef444440', backgroundColor: '#ef444412' }}
            aria-label={`Delete ${b.name}`}
          >
            <Trash2 size={13} aria-hidden="true" /> Delete
          </button>
        </div>

        {/* Desktop title */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'var(--color-surface-700)', color: 'var(--color-primary-500)', fontFamily: 'monospace', border: '1px solid var(--color-border)' }}
            >
              #{b.borrowerCode}
            </span>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{b.name}</h1>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {b.shopName}{zone ? ` · ${zone.name}` : ''}
          </p>
        </div>

        {/* Stat strip */}
        <div
          className="rounded-2xl p-1 grid grid-cols-3 gap-0"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          role="group"
          aria-label="Payment summary"
        >
          <div className="text-center p-3">
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-muted)' }}>
              Total Payable
            </p>
            <p className="text-base font-bold num mt-1" style={{ color: 'var(--color-text)' }}>
              {inr(b.totalPayable)}
            </p>
          </div>
          <div
            className="text-center p-3 rounded-xl"
            style={{ backgroundColor: 'var(--color-gold-500)', color: '#1a0a00' }}
          >
            <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">Paid So Far</p>
            <p className="text-base font-bold num mt-1">{inr(paidTotal)}</p>
          </div>
          <div
            className="text-center p-3 rounded-xl"
            style={{ backgroundColor: 'var(--color-primary-800)', color: '#fff' }}
          >
            <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">Remaining</p>
            <p className="text-base font-bold num mt-1">{inr(remaining)}</p>
          </div>
        </div>

        {/* Info table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          {(
            [
              ['Borrower ID',  `#${b.borrowerCode}`],
              ['Phone',        b.phone],
              ['Address',      b.address || zone?.name || '—'],
              ['Frequency',    b.frequency],
              ['Start',        fmtDate(b.startDate)],
              ['End',          fmtDate(b.endDate)],
              ['Installment',  inr(b.installmentAmount)],
              ['Pay mode',     b.payMode.toUpperCase()],
              ['Issued cash',  inr(b.amountPaidToBorrower)],
            ] as [string, string][]
          ).map(([label, value], i, arr) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}
            >
              <span className="text-sm" style={{ color: 'var(--color-primary-500)' }}>{label}</span>
              <span className="text-sm font-medium num" style={{ color: 'var(--color-text)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>
            <span>{b.paidInstallments.length}/{b.dueCount} installments</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary-500)' }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progress}% of installments paid`}
            />
          </div>
          {overdue > 0 && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-danger-400)' }}>
              {overdue} overdue installment{overdue > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Next due info */}
        {next && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Next due:{' '}
            <span style={{ color: 'var(--color-text)' }}>{fmtDate(next)}</span>
          </p>
        )}

        {/* Payment schedule table */}
        <section aria-label="Payment schedule">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
            Payment Schedule
          </p>
          <div
            className="rounded-2xl overflow-hidden table-scroll"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <table className="w-full text-xs" style={{ minWidth: '340px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-800)',
                  }}
                >
                  <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--color-muted)' }}>#</th>
                  <th className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--color-muted)' }}>Date</th>
                  <th className="text-center px-2 py-2.5 font-medium" style={{ color: 'var(--color-muted)' }}>Paid</th>
                  <th className="text-right px-3 py-2.5 font-medium" style={{ color: 'var(--color-muted)' }}>Amount</th>
                  <th className="text-right px-3 py-2.5 font-medium" style={{ color: 'var(--color-muted)' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => {
                  const isToday   = row.date === today
                  const isPast    = row.date < today
                  const isFuture  = row.date > today
                  const isOverdue = isPast && !row.paid

                  return (
                    <tr
                      key={row.date}
                      style={{
                        borderBottom: i < history.length - 1 ? '1px solid var(--color-border)' : 'none',
                        backgroundColor: isToday ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                      }}
                    >
                      <td className="px-3 py-2.5" style={{ color: 'var(--color-muted)' }}>{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <span style={{ color: 'var(--color-text-soft)' }}>{fmtDate(row.date)}</span>
                        {isToday && (
                          <span
                            className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                          >
                            Today
                          </span>
                        )}
                        {isOverdue && (
                          <span
                            className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                          >
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="text-center px-2 py-2.5">
                        <input
                          type="checkbox"
                          checked={row.paid}
                          onChange={() => togglePaid(row.date, row.paid)}
                          aria-label={`Mark installment ${i + 1} as ${row.paid ? 'unpaid' : 'paid'}`}
                        />
                      </td>
                      <td className="text-right px-3 py-2.5 num">
                        <span
                          style={{
                            color: row.paid
                              ? 'var(--color-primary-500)'
                              : isFuture
                                ? 'var(--color-muted)'
                                : 'var(--color-danger-400)',
                          }}
                        >
                          {row.paid ? inr(row.amountPaid) : '—'}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2.5 num">
                        <span
                          style={{
                            color: row.balance === 0
                              ? 'var(--color-primary-500)'
                              : 'var(--color-text-soft)',
                          }}
                        >
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

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Borrower"
        message={`Are you sure you want to delete "${b.name}"? This will permanently remove all their payment history.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
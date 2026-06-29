import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, currentUser } from '../lib/store'
import { AppHeader, StatCard, ZoneLink } from '../components/ui'
import { ledgerFor, overdueCount, nextDueDate, paymentHistory } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { Search, X, ChevronRight, MapPin } from 'lucide-react'

export const Route = createFileRoute('/lender/')({
  component: Dashboard,
})

function Dashboard() {
  const db = useDBSnap()
  const user = currentUser(db)
  const [date, setDate] = useState(todayISO())
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedBId, setSelectedBId] = useState<string | null>(null)

  const zones = db.settings.zones

  // All-time stats
  const totalInvested = db.investors
    .filter(i => !i.withdrawnOn)
    .reduce((s, i) => s + i.amount, 0)
  const totalReceived = db.borrowers.reduce(
    (s, b) => s + b.paidInstallments.length * b.installmentAmount, 0
  )
  const totalIssued = db.borrowers.reduce((s, b) => s + b.amountPaidToBorrower, 0)
  const activeBorrowers = db.borrowers.length

  const ledger = ledgerFor(db, date, zoneId)

  // Search
  const searchResults = search.trim()
    ? db.borrowers.filter(b => {
        const q = search.toLowerCase()
        return b.name.toLowerCase().includes(q) || b.shopName.toLowerCase().includes(q) || b.phone.includes(q)
      })
    : []

  const selectedB = selectedBId ? db.borrowers.find(b => b.id === selectedBId) : null

  return (
    <div className="flex flex-col">
      <AppHeader title="FinMaint" subtitle={`${user?.role === 'admin' ? 'Admin' : 'Collector'}`} />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* All-time stats */}
        <section>
          <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-2">All-time summary</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total Invested" value={inr(totalInvested)} accent="gold" />
            <StatCard label="Received to Date" value={inr(totalReceived)} />
            <StatCard label="Amount Issued" value={inr(totalIssued)} accent="muted" />
            <StatCard label="Active Borrowers" value={String(activeBorrowers)} sub="accounts" />
          </div>
        </section>

        {/* Date + Zone */}
        <section className="flex gap-2 items-center">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-600)]"
          />
          <select
            value={zoneId ?? ''}
            onChange={e => setZoneId(e.target.value || null)}
            className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-600)]"
          >
            <option value="">All zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </section>

        {/* Day ledger tiles */}
        <section>
          <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-2">{fmtDate(date)}</p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Opening" value={inr(ledger.opening)} accent="muted" />
            <StatCard label="Due" value={inr(ledger.totalCollection)} />
            <StatCard label="Received" value={inr(ledger.totalReceived)} />
            <StatCard label="Closing" value={inr(ledger.closing)} accent={ledger.closing < 0 ? 'danger' : 'gold'} />
          </div>
        </section>

        {/* Paid / Unpaid mini lists */}
        {ledger.paidBorrowers.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider text-[var(--color-primary-600)] mb-2">✓ Paid ({ledger.paidBorrowers.length})</p>
            <div className="flex flex-col gap-1">
              {ledger.paidBorrowers.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-[var(--color-card)] rounded-xl px-3 py-2 border border-[var(--color-surface-700)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{b.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{b.shopName} · {b.phone}</p>
                  </div>
                  <span className="text-sm num text-[var(--color-primary-400)]">{inr(b.installmentAmount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {ledger.unpaidBorrowers.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider text-[var(--color-danger-400)] mb-2">✗ Unpaid ({ledger.unpaidBorrowers.length})</p>
            <div className="flex flex-col gap-1">
              {ledger.unpaidBorrowers.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-[var(--color-card)] rounded-xl px-3 py-2 border border-[var(--color-surface-700)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{b.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{b.shopName} · {b.phone}</p>
                  </div>
                  <span className="text-sm num text-[var(--color-danger-400)]">{inr(b.installmentAmount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search */}
        <section>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedBId(null) }}
              placeholder="Search borrowers by name, shop, phone…"
              className="w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl pl-9 pr-8 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary-600)]"
            />
            {search && (
              <button onClick={() => { setSearch(''); setSelectedBId(null) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
                <X size={14} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && !selectedB && (
            <div className="mt-2 flex flex-col gap-1">
              {searchResults.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBId(b.id)}
                  className="flex items-center justify-between bg-[var(--color-card)] rounded-xl px-3 py-2.5 border border-[var(--color-border)] hover:border-[var(--color-primary-700)] transition-fast text-left w-full"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{b.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{b.shopName}</p>
                  </div>
                  <ChevronRight size={14} className="text-[var(--color-muted)]" />
                </button>
              ))}
            </div>
          )}

          {selectedB && <BorrowerStatusPanel b={selectedB} zones={zones} onClose={() => setSelectedBId(null)} />}
        </section>

        {/* Zone management link */}
        <div className="flex justify-end pb-4">
          <ZoneLink />
        </div>
      </div>
    </div>
  )
}

function BorrowerStatusPanel({ b, zones, onClose }: { b: ReturnType<typeof useDBSnap>['borrowers'][0], zones: ReturnType<typeof useDBSnap>['settings']['zones'], onClose: () => void }) {
  const history = paymentHistory(b)
  const paid = b.paidInstallments.length
  const remaining = b.amount - paid * b.installmentAmount
  const zone = zones.find(z => z.id === b.zoneId)
  const overdue = overdueCount(b)
  const next = nextDueDate(b)
  const progress = Math.round((paid / b.dueCount) * 100)

  return (
    <div className="mt-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-[var(--color-text)]">{b.name}</p>
          <p className="text-xs text-[var(--color-muted)]">{b.shopName}{zone ? ` · ${zone.name}` : ''}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-muted)] text-xl">×</button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-xs text-[var(--color-muted)]">Principal</p>
          <p className="text-sm font-bold num text-[var(--color-text)]">{inr(b.amount)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--color-muted)]">Repaid</p>
          <p className="text-sm font-bold num text-[var(--color-primary-400)]">{inr(paid * b.installmentAmount)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--color-muted)]">Balance</p>
          <p className="text-sm font-bold num text-[var(--color-gold-400)]">{inr(Math.max(0, remaining))}</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
          <span>{paid}/{b.dueCount} installments</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-[var(--color-surface-700)] rounded-full">
          <div className="h-1.5 bg-[var(--color-primary-500)] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div><span className="text-[var(--color-muted)]">Next due: </span><span className="text-[var(--color-text)]">{fmtDate(next)}</span></div>
        {overdue > 0 && <div><span className="text-[var(--color-danger-400)]">{overdue} overdue</span></div>}
      </div>
      {/* Mini schedule */}
      <div className="max-h-28 overflow-y-auto flex flex-col gap-0.5 mb-3">
        {history.slice(0, 10).map(row => (
          <div key={row.date} className="flex justify-between text-xs py-0.5">
            <span className="text-[var(--color-muted)]">{fmtDate(row.date)}</span>
            <span className={row.paid ? 'text-[var(--color-primary-400)]' : 'text-[var(--color-danger-400)]'}>
              {row.paid ? `Paid ${inr(row.amountPaid)}` : 'Unpaid'}
            </span>
          </div>
        ))}
      </div>
      <Link to="/lender/borrower/$id" params={{ id: b.id }} className="flex items-center gap-1 text-xs text-[var(--color-primary-400)] hover:text-[var(--color-primary-300)]">
        Full payment history <ChevronRight size={12} />
      </Link>
    </div>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, memo } from 'react'
import { useDBSnap, currentUser } from '../lib/store'
import { ZoneLink, MetricTile } from '../components/ui'
import { ledgerFor, overdueCount, nextDueDate, paymentHistory } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { Search, X, ChevronRight } from 'lucide-react'
import type { Borrower, DB } from '../lib/store'

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

  const totalInvested  = db.investors.filter(i => !i.withdrawnOn).reduce((s, i) => s + i.amount, 0)
  const totalReceived  = db.borrowers.reduce((s, b) => s + b.paidInstallments.length * b.installmentAmount, 0)
  const totalIssued    = db.borrowers.reduce((s, b) => s + b.amountPaidToBorrower, 0)
  const activeBorrowers = db.borrowers.length

  const ledger = ledgerFor(db, date, zoneId)

  const searchResults = search.trim()
    ? db.borrowers.filter(b => {
        const q = search.toLowerCase()
        return b.name.toLowerCase().includes(q) || b.shopName.toLowerCase().includes(q) || b.phone.includes(q)
      })
    : []
  const selectedB = selectedBId ? db.borrowers.find(b => b.id === selectedBId) : null
  const paidToday   = ledger.paidBorrowers.length
  const unpaidToday = ledger.unpaidBorrowers.length

  return (
    <div className="flex flex-col min-h-full">
      {/* Gradient hero header
          NOTE: intentionally NOT position:relative. A positioned element
          always paints above static-positioned siblings regardless of DOM
          order, which is what was hiding the All-time report card's top
          edge (label + white background) behind this header wherever the
          -mt-10 overlap happened. */}
      <div
        className="px-4 md:px-6 pt-5 pb-16 shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-950) 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              Hi, {user?.name}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {user?.role === 'admin' ? 'Administrator' : 'Collector'} · {fmtDate(todayISO())}
            </p>
          </div>
        </div>
      </div>

      {/* relative z-10 guarantees this content stack sits above the header
          in the overlap zone created by -mt-10, no matter how either
          element's own positioning changes in the future. */}
      <div className="px-4 md:px-6 flex flex-col gap-4 -mt-10 pb-6 relative z-10">
        {/* ALL-TIME REPORT */}
        <section
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          aria-label="All-time report"
        >
          <p
            className="text-[10px] uppercase tracking-wider font-semibold mb-3"
            style={{ color: 'var(--color-muted)' }}
          >
            All-time report
          </p>
          <div className="metric-grid">
            <MetricTile label="Active Investment" value={inr(totalInvested)}    variant="green" />
            <MetricTile label="Total Received"    value={inr(totalReceived)}    variant="gold" />
            <MetricTile label="Amount Issued"     value={inr(totalIssued)}      variant="default" />
            <MetricTile label="Active Borrowers"  value={String(activeBorrowers)} sub="accounts" variant="default" />
          </div>
        </section>

        {/* Search borrower + Manage Zones */}
        <section aria-label="Search borrowers">
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--color-muted)' }}
            >
              Search Borrower
            </p>
            <ZoneLink />
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-muted)' }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedBId(null) }}
              placeholder="Name, shop, or phone"
              aria-label="Search borrowers by name, shop, or phone"
              className="w-full rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none transition-fast"
              style={{
                backgroundColor: 'var(--color-surface-800)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setSelectedBId(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-muted)' }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && !selectedB && (
            <div className="mt-2 flex flex-col gap-1" role="listbox" aria-label="Search results">
              {searchResults.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBId(b.id)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-fast text-left w-full borrower-row"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                  role="option"
                  aria-selected={selectedBId === b.id}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.shopName}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {selectedB && (
            <BorrowerStatusPanel
              b={selectedB}
              zones={zones}
              onClose={() => setSelectedBId(null)}
            />
          )}
        </section>

        {/* Date/Zone selector + Day ledger */}
        <section
          className="rounded-2xl p-3 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          aria-label="Daily ledger"
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }} aria-hidden="true">📅</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              aria-label="Select date"
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--color-surface-800)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {zones.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Zone filter">
              <button
                onClick={() => setZoneId(null)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
                style={{
                  backgroundColor: !zoneId ? 'var(--color-primary-700)' : 'var(--color-surface-700)',
                  color: !zoneId ? '#fff' : 'var(--color-text-soft)',
                }}
                aria-pressed={!zoneId}
              >
                All zones
              </button>
              {zones.map(z => (
                <button
                  key={z.id}
                  onClick={() => setZoneId(z.id === zoneId ? null : z.id)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
                  style={{
                    backgroundColor: zoneId === z.id ? 'var(--color-primary-700)' : 'var(--color-surface-700)',
                    color: zoneId === z.id ? '#fff' : 'var(--color-text-soft)',
                  }}
                  aria-pressed={zoneId === z.id}
                >
                  {z.name}
                </button>
              ))}
            </div>
          )}

          {/* Day ledger tiles */}
          <div className="metric-grid">
            <MetricTile label="Opening"  value={inr(ledger.opening)}         sub={fmtDate(date)} variant="surface" />
            <MetricTile label="Due"      value={inr(ledger.totalCollection)} variant="surface" />
            <MetricTile label="Received" value={inr(ledger.totalReceived)}   variant="gold" />
            <MetricTile
              label="Closing"
              value={inr(ledger.closing)}
              variant={ledger.closing < 0 ? 'closing-bad' : 'closing-good'}
            />
          </div>

          {/* Paid / Unpaid summary */}
          <div className="flex gap-2" role="status" aria-live="polite">
            <div
              className="flex-1 text-center py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--color-primary-500)' }}
            >
              ✓ Paid <span className="font-bold">{paidToday}</span>
            </div>
            <div
              className="flex-1 text-center py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--color-danger-400)' }}
            >
              ✗ Unpaid <span className="font-bold">{unpaidToday}</span>
            </div>
          </div>
        </section>

        {/* Paid list */}
        {paidToday > 0 && (
          <section aria-label={`Paid borrowers: ${paidToday}`}>
            <p
              className="text-[10px] uppercase tracking-wider mb-2 font-semibold"
              style={{ color: 'var(--color-primary-600)' }}
            >
              ✓ Paid ({paidToday})
            </p>
            <div className="flex flex-col gap-1.5">
              {ledger.paidBorrowers.map(b => (
                <Link
                  key={b.id}
                  to="/lender/borrower/$id"
                  params={{ id: b.id }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-fast borrower-row"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {b.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                      {b.shopName} · {b.phone}
                    </p>
                  </div>
                  <span
                    className="text-sm num font-bold shrink-0 ml-2"
                    style={{ color: 'var(--color-primary-500)' }}
                  >
                    {inr(b.installmentAmount)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Unpaid list */}
        {unpaidToday > 0 && (
          <section className="pb-2" aria-label={`Unpaid borrowers: ${unpaidToday}`}>
            <p
              className="text-[10px] uppercase tracking-wider mb-2 font-semibold"
              style={{ color: 'var(--color-danger-400)' }}
            >
              ✗ Unpaid ({unpaidToday})
            </p>
            <div className="flex flex-col gap-1.5">
              {ledger.unpaidBorrowers.map(b => (
                <Link
                  key={b.id}
                  to="/lender/borrower/$id"
                  params={{ id: b.id }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-fast borrower-row"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {b.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                      {b.shopName} · {b.phone}
                    </p>
                  </div>
                  <span
                    className="text-sm num font-bold shrink-0 ml-2"
                    style={{ color: 'var(--color-danger-400)' }}
                  >
                    {inr(b.installmentAmount)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ─── BorrowerStatusPanel ───────────────────────────────────────────────────────
const BorrowerStatusPanel = memo(function BorrowerStatusPanel({
  b, zones, onClose,
}: {
  b: Borrower
  zones: DB['settings']['zones']
  onClose: () => void
}) {
  const history = paymentHistory(b)
  const paid      = b.paidInstallments.length
  const remaining = Math.max(0, b.amount - paid * b.installmentAmount)
  const zone      = zones.find(z => z.id === b.zoneId)
  const overdue   = overdueCount(b)
  const next      = nextDueDate(b)
  const progress  = Math.round((paid / b.dueCount) * 100)

  return (
    <div
      className="mt-3 rounded-2xl p-4"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      role="region"
      aria-label={`${b.name} status`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{b.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {b.shopName}{zone ? ` · ${zone.name}` : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl transition-fast"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--color-surface-800)' }}>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Principal</p>
          <p className="text-xs font-bold num mt-0.5" style={{ color: 'var(--color-text)' }}>{inr(b.amount)}</p>
        </div>
        <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--color-primary-800)' }}>
          <p className="text-[9px] uppercase tracking-wider text-white/60">Repaid</p>
          <p className="text-xs font-bold num mt-0.5 text-white">{inr(paid * b.installmentAmount)}</p>
        </div>
        <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'var(--color-gold-500)' }}>
          <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.55)' }}>Balance</p>
          <p className="text-xs font-bold num mt-0.5" style={{ color: '#1a0800' }}>{inr(remaining)}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
          <span>{paid}/{b.dueCount} installments</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary-500)' }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs mb-3">
        <div>
          <span style={{ color: 'var(--color-muted)' }}>Next due: </span>
          <span style={{ color: 'var(--color-text)' }}>{fmtDate(next)}</span>
        </div>
        {overdue > 0 && (
          <div>
            <span style={{ color: 'var(--color-danger-400)' }}>{overdue} overdue</span>
          </div>
        )}
      </div>

      <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5 mb-3" aria-label="Recent payments">
        {history.slice(0, 8).map(row => (
          <div key={row.date} className="flex justify-between text-xs py-0.5">
            <span style={{ color: 'var(--color-muted)' }}>{fmtDate(row.date)}</span>
            <span style={{ color: row.paid ? 'var(--color-primary-500)' : 'var(--color-danger-400)' }}>
              {row.paid ? `Paid ${inr(row.amountPaid)}` : 'Unpaid'}
            </span>
          </div>
        ))}
      </div>

      <Link
        to="/lender/borrower/$id"
        params={{ id: b.id }}
        className="inline-flex items-center gap-1 text-xs font-medium"
        style={{ color: 'var(--color-primary-500)' }}
      >
        Full payment history <ChevronRight size={12} aria-hidden="true" />
      </Link>
    </div>
  )
})
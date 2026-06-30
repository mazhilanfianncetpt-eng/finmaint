import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, currentUser } from '../lib/store'
import { AppHeader, ZoneLink } from '../components/ui'
import { ledgerFor, overdueCount, nextDueDate, paymentHistory } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { Search, X, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/lender/')({
  component: Dashboard,
})

// Coloured metric tile — matches the screenshot style
function MetricTile({
  label, value, sub, variant = 'default',
}: {
  label: string
  value: string
  sub?: string
  variant?: 'green' | 'gold' | 'default' | 'surface' | 'closing-good' | 'closing-bad'
}) {
  const styles: Record<string, React.CSSProperties> = {
    green:        { backgroundColor: 'var(--color-primary-800)', color: '#fff' },
    gold:         { backgroundColor: 'var(--color-gold-500)', color: '#1a0800' },
    default:      { backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' },
    surface:      { backgroundColor: 'var(--color-surface-800)', color: 'var(--color-text)' },
    'closing-good': { backgroundColor: 'var(--color-primary-800)', color: '#fff' },
    'closing-bad':  { backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' },
  }
  const labelColor: Record<string, string> = {
    green: 'rgba(255,255,255,0.7)', gold: 'rgba(0,0,0,0.55)', default: 'var(--color-muted)', surface: 'var(--color-muted)',
    'closing-good': 'rgba(255,255,255,0.7)', 'closing-bad': 'rgba(248,113,113,0.7)',
  }
  const subColor: Record<string, string> = {
    green: 'rgba(255,255,255,0.55)', gold: 'rgba(0,0,0,0.4)', default: 'var(--color-muted)', surface: 'var(--color-muted)',
    'closing-good': 'rgba(255,255,255,0.55)', 'closing-bad': 'rgba(248,113,113,0.55)',
  }

  return (
    <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={styles[variant]}>
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: labelColor[variant] }}>{label}</p>
      <p className="text-lg font-bold num leading-tight">{value}</p>
      {sub && <p className="text-[10px]" style={{ color: subColor[variant] }}>{sub}</p>}
    </div>
  )
}

function Dashboard() {
  const db = useDBSnap()
  const user = currentUser(db)
  const [date, setDate] = useState(todayISO())
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedBId, setSelectedBId] = useState<string | null>(null)

  const zones = db.settings.zones

  const totalInvested = db.investors.filter(i => !i.withdrawnOn).reduce((s, i) => s + i.amount, 0)
  const totalReceived = db.borrowers.reduce((s, b) => s + b.paidInstallments.length * b.installmentAmount, 0)
  const totalIssued = db.borrowers.reduce((s, b) => s + b.amountPaidToBorrower, 0)
  const activeBorrowers = db.borrowers.length

  const ledger = ledgerFor(db, date, zoneId)

  const searchResults = search.trim()
    ? db.borrowers.filter(b => {
        const q = search.toLowerCase()
        return b.name.toLowerCase().includes(q) || b.shopName.toLowerCase().includes(q) || b.phone.includes(q)
      })
    : []
  const selectedB = selectedBId ? db.borrowers.find(b => b.id === selectedBId) : null
  const paidToday = ledger.paidBorrowers.length
  const unpaidToday = ledger.unpaidBorrowers.length

  return (
    <div className="flex flex-col">
      {/* Green gradient header */}
      <div
        className="px-4 pt-5 pb-16 shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-950) 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Hi, {user?.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {user?.role === 'admin' ? 'Administrator' : 'Collector'}
            </p>
          </div>
        </div>
      </div>

      {/* AppHeader holds theme toggle + logout */}
      <div className="absolute top-0 right-0 z-10">
        <AppHeader title="" />
      </div>

      <div className="px-4 flex flex-col gap-4 -mt-10">
        {/* ALL-TIME REPORT */}
        <div className="rounded-2xl p-4 shadow-lg" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--color-muted)' }}>All-time report</p>
          <div className="grid grid-cols-2 gap-2">
            <MetricTile label="Active Investment" value={inr(totalInvested)} variant="green" />
            <MetricTile label="Total Received"    value={inr(totalReceived)} variant="gold" />
            <MetricTile label="Amount Issued"     value={inr(totalIssued)}   variant="default" />
            <MetricTile label="Active Borrowers"  value={String(activeBorrowers)} sub="accounts" variant="default" />
          </div>
        </div>

        {/* Search borrower + Manage Zones */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-muted)' }}>
              Search Borrower
            </p>
            <ZoneLink />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setSelectedBId(null) }}
              placeholder="Name, shop, or phone"
              className="w-full rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none transition-fast"
              style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSelectedBId(null) }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && !selectedB && (
            <div className="mt-2 flex flex-col gap-1">
              {searchResults.map(b => (
                <button key={b.id} onClick={() => setSelectedBId(b.id)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-fast text-left w-full"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.shopName}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />
                </button>
              ))}
            </div>
          )}

          {selectedB && (
            <BorrowerStatusPanel b={selectedB} zones={zones} onClose={() => setSelectedBId(null)} />
          )}
        </section>

        {/* Date/Zone selector + Day ledger + Paid/Unpaid — single container */}
        <div className="rounded-2xl p-3 flex flex-col gap-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>📅</span>
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
          {zones.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              <button onClick={() => setZoneId(null)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
                style={{ backgroundColor: !zoneId ? 'var(--color-primary-700)' : 'var(--color-surface-700)', color: !zoneId ? '#fff' : 'var(--color-text-soft)' }}
              >All zones</button>
              {zones.map(z => (
                <button key={z.id} onClick={() => setZoneId(z.id === zoneId ? null : z.id)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
                  style={{ backgroundColor: zoneId === z.id ? 'var(--color-primary-700)' : 'var(--color-surface-700)', color: zoneId === z.id ? '#fff' : 'var(--color-text-soft)' }}
                >{z.name}</button>
              ))}
            </div>
          )}

          {/* Day ledger tiles */}
          <div className="grid grid-cols-2 gap-2">
            <MetricTile label="Opening"  value={inr(ledger.opening)} sub={fmtDate(date)} variant="surface" />
            <MetricTile label="Due"      value={inr(ledger.totalCollection)} variant="surface" />
            <MetricTile label="Received" value={inr(ledger.totalReceived)}   variant="gold" />
            <MetricTile label="Closing"  value={inr(ledger.closing)} variant={ledger.closing < 0 ? 'closing-bad' : 'closing-good'} />
          </div>

          {/* Paid / Unpaid summary chips */}
          <div className="flex gap-2">
            <div className="flex-1 text-center py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--color-primary-500)' }}>
              ✓ Paid <span className="font-bold">{paidToday}</span>
            </div>
            <div className="flex-1 text-center py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--color-danger-400)' }}>
              ✗ Unpaid <span className="font-bold">{unpaidToday}</span>
            </div>
          </div>
        </div>

        {/* ── PAID list ── */}
        {paidToday > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'var(--color-primary-600)' }}>
              ✓ Paid ({paidToday})
            </p>
            <div className="flex flex-col gap-1.5">
              {ledger.paidBorrowers.map(b => (
                <Link key={b.id} to="/lender/borrower/$id" params={{ id: b.id }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-fast"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.shopName} · {b.phone}</p>
                  </div>
                  <span className="text-sm num font-bold" style={{ color: 'var(--color-primary-500)' }}>{inr(b.installmentAmount)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── UNPAID list (due on selected date, not paid) ── */}
        {unpaidToday > 0 && (
          <section className="pb-6">
            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'var(--color-danger-400)' }}>
              ✗ Unpaid ({unpaidToday})
            </p>
            <div className="flex flex-col gap-1.5">
              {ledger.unpaidBorrowers.map(b => (
                <Link key={b.id} to="/lender/borrower/$id" params={{ id: b.id }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-fast"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.shopName} · {b.phone}</p>
                  </div>
                  <span className="text-sm num font-bold" style={{ color: 'var(--color-danger-400)' }}>{inr(b.installmentAmount)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

function BorrowerStatusPanel({ b, zones, onClose }: {
  b: ReturnType<typeof useDBSnap>['borrowers'][0]
  zones: ReturnType<typeof useDBSnap>['settings']['zones']
  onClose: () => void
}) {
  const history = paymentHistory(b)
  const paid = b.paidInstallments.length
  const remaining = Math.max(0, b.amount - paid * b.installmentAmount)
  const zone = zones.find(z => z.id === b.zoneId)
  const overdue = overdueCount(b)
  const next = nextDueDate(b)
  const progress = Math.round((paid / b.dueCount) * 100)

  return (
    <div className="mt-3 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{b.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{b.shopName}{zone ? ` · ${zone.name}` : ''}</p>
        </div>
        <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--color-muted)' }}>×</button>
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
          <span>{paid}/{b.dueCount} installments</span><span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary-500)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs mb-3">
        <div><span style={{ color: 'var(--color-muted)' }}>Next due: </span><span style={{ color: 'var(--color-text)' }}>{fmtDate(next)}</span></div>
        {overdue > 0 && <div><span style={{ color: 'var(--color-danger-400)' }}>{overdue} overdue</span></div>}
      </div>

      <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5 mb-3">
        {history.slice(0, 8).map(row => (
          <div key={row.date} className="flex justify-between text-xs py-0.5">
            <span style={{ color: 'var(--color-muted)' }}>{fmtDate(row.date)}</span>
            <span style={{ color: row.paid ? 'var(--color-primary-500)' : 'var(--color-danger-400)' }}>
              {row.paid ? `Paid ${inr(row.amountPaid)}` : 'Unpaid'}
            </span>
          </div>
        ))}
      </div>

      <Link to="/lender/borrower/$id" params={{ id: b.id }}
        className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-primary-500)' }}>
        Full payment history <ChevronRight size={12} />
      </Link>
    </div>
  )
}
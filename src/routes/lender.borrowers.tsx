import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, addBorrower } from '../lib/store'
import type { PayMode, Frequency } from '../lib/store'
import { AppHeader, Sheet, Label, Select, Btn, ZoneLink, Empty, PageHeader } from '../components/ui'
import { nextDueDate, overdueCount, calcEndDate } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { Plus, Search, ChevronRight, X } from 'lucide-react'

export const Route = createFileRoute('/lender/borrowers')({
  component: BorrowersPage,
})

function BorrowersPage() {
  const db = useDBSnap()
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const zones = db.settings.zones
  const filtered = db.borrowers
  .filter(b => {
    if (zoneFilter && b.zoneId !== zoneFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        b.name.toLowerCase().includes(q) ||
        b.shopName.toLowerCase().includes(q) ||
        b.phone.includes(q)
      )
    }
    return true
  })
  .sort((a, b) => {
    const aCode = parseInt(a.borrowerCode ?? '0')
    const bCode = parseInt(b.borrowerCode ?? '0')
    return aCode - bCode
  })

  return (
    <div className="flex flex-col min-h-full">
      <div className="md:hidden">
        <AppHeader title="Borrowers" />
      </div>

      <div className="page-pad flex flex-col gap-4">
        <div className="hidden md:block">
          <PageHeader
            title="Borrowers"
            subtitle={`${db.borrowers.length} total accounts`}
            action={
              <Btn onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add Borrower
              </Btn>
            }
          />
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, shop, phone…"
            aria-label="Search borrowers"
            className="w-full rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none transition-fast"
            style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        {zones.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by zone">
            <button
              onClick={() => setZoneFilter(null)}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
              style={{ backgroundColor: !zoneFilter ? 'var(--color-primary-700)' : 'var(--color-surface-700)', color: !zoneFilter ? '#fff' : 'var(--color-text-soft)' }}
              aria-pressed={!zoneFilter}
            >
              All
            </button>
            {zones.map(z => (
              <button
                key={z.id}
                onClick={() => setZoneFilter(z.id === zoneFilter ? null : z.id)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
                style={{ backgroundColor: zoneFilter === z.id ? 'var(--color-primary-700)' : 'var(--color-surface-700)', color: zoneFilter === z.id ? '#fff' : 'var(--color-text-soft)' }}
                aria-pressed={zoneFilter === z.id}
              >
                {z.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between md:hidden">
          <ZoneLink />
          <Btn size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Borrower
          </Btn>
        </div>

        {search && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
          </p>
        )}

        {filtered.length === 0 ? (
          <Empty text="No borrowers found. Add one to get started." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map(b => {
              const next     = nextDueDate(b)
              const overdue  = overdueCount(b)
              const zone     = zones.find(z => z.id === b.zoneId)
              const paidCount = (b.payments ?? []).length
              const progress = Math.round((paidCount / b.dueCount) * 100)
              return (
                <Link
                  key={b.id}
                  to="/lender/borrower/$id"
                  params={{ id: b.id }}
                  className="rounded-2xl p-3 block transition-fast borrower-row"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ backgroundColor: 'var(--color-surface-700)', color: 'var(--color-primary-500)', fontFamily: 'monospace', border: '1px solid var(--color-border)' }}
                        >
                          #{b.borrowerCode}
                        </span>
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>{b.shopName} · {b.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {zone && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--color-primary-500)' }}>
                          {zone.name}
                        </span>
                      )}
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                        style={{ backgroundColor: b.frequency === 'daily' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)', color: b.frequency === 'daily' ? 'var(--color-primary-500)' : 'var(--color-gold-500)' }}
                      >
                        {b.frequency}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <span className="num" style={{ color: 'var(--color-text-soft)' }}>{inr(b.installmentAmount)}/inst</span>
                    <span style={{ color: 'var(--color-muted)' }}>Next: {fmtDate(next)}</span>
                    {overdue > 0 && <span style={{ color: 'var(--color-danger-400)' }}>{overdue} overdue</span>}
                  </div>
                  <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary-600)' }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${progress}% paid`}
                    />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {paidCount}/{b.dueCount} paid
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Borrower">
        <AddBorrowerForm onClose={() => setShowAdd(false)} />
      </Sheet>
    </div>
  )
}

// ─── AddBorrowerForm ──────────────────────────────────────────────────────────
function AddBorrowerForm({ onClose }: { onClose: () => void }) {
  const db    = useDBSnap()
  const zones = db.settings.zones

  const [name, setName]         = useState('')
  const [shopName, setShopName] = useState('')
  const [address, setAddress]   = useState('')
  const [zoneId, setZoneId]     = useState<string>('')
  const [phone, setPhone]       = useState('')
  const [amount, setAmount]     = useState('')
  const [amountPaidToBorrower, setAmountPaidToBorrower] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [startDate, setStartDate] = useState(todayISO())
  const [dueCount, setDueCount]   = useState('30')
  const [payMode, setPayMode]     = useState<PayMode>('cash')
  const [error, setError]         = useState('')

  const amountNum   = parseFloat(amount) || 0
  const dueCountNum = parseInt(dueCount) || 1
  const installmentAmount = amountNum > 0 ? Math.ceil(amountNum / dueCountNum) : 0
  const endDate = calcEndDate(startDate, dueCountNum, frequency)

  async function handleSubmit() {
    if (!name.trim() || !amount || !dueCount) {
      setError('Name, amount, and number of installments are required.')
      return
    }
    const paidNum = parseFloat(amountPaidToBorrower) || 0
    try {
      await addBorrower({
        name: name.trim(),
        shopName: shopName.trim(),
        address: address.trim(),
        zoneId: zoneId || null,
        phone: phone.trim(),
        amount: amountNum,
        amountPaidToBorrower: paidNum,
        totalPayable: amountNum,
        frequency,
        startDate,
        dueCount: dueCountNum,
        endDate,
        payMode,
        installmentAmount,
        payments: [],
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add borrower.')
    }
  }

  const fieldStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface-800)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    width: '100%',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="flex flex-col gap-3 pb-2">
      {error && (
        <p className="text-xs px-3 py-2 rounded-xl" role="alert" style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </p>
      )}

      <div><Label>Full Name *</Label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ramesh Kumar" style={fieldStyle} autoComplete="name" />
      </div>
      <div><Label>Shop Name</Label>
        <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Ramesh General Store" style={fieldStyle} />
      </div>
      <div><Label>Address</Label>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 MG Road, Bangalore" style={fieldStyle} />
      </div>
      <div>
        <Label>Zone</Label>
        <Select value={zoneId} onChange={e => setZoneId(e.target.value)}>
          <option value="">No zone</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </Select>
      </div>
      <div><Label>Phone</Label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" style={fieldStyle} autoComplete="tel" />
      </div>

      <div><Label>Principal Amount (₹) *</Label>
        <input
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="10000"
          style={fieldStyle}
        />
      </div>

      <div><Label>Amount Paid to Borrower (₹)</Label>
        <input
          inputMode="numeric"
          value={amountPaidToBorrower}
          onChange={e => setAmountPaidToBorrower(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          style={fieldStyle}
        />
      </div>

      <div>
        <Label>Frequency *</Label>
        <Select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </Select>
      </div>

      <div><Label>Start Date *</Label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldStyle} />
      </div>

      <div><Label>Number of Installments *</Label>
        <input
          inputMode="numeric"
          value={dueCount}
          onChange={e => setDueCount(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="20"
          style={fieldStyle}
        />
      </div>

      <div>
        <Label>Pay Mode</Label>
        <Select value={payMode} onChange={e => setPayMode(e.target.value as PayMode)}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="online">Online</option>
        </Select>
      </div>

      {amountNum > 0 && dueCountNum > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-2"
          style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}
          aria-label="Loan summary"
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>Installment</span>
            <span className="num font-semibold" style={{ color: 'var(--color-primary-500)' }}>{inr(installmentAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>End date</span>
            <span style={{ color: 'var(--color-text-soft)' }}>{fmtDate(endDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>Total payable</span>
            <span className="num" style={{ color: 'var(--color-text-soft)' }}>{inr(installmentAmount * dueCountNum)}</span>
          </div>
        </div>
      )}

      <Btn onClick={handleSubmit} className="w-full mt-1">Add Borrower</Btn>
    </div>
  )
}
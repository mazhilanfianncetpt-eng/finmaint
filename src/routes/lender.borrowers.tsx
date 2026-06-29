import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, write } from '../lib/store'
import type { PayMode, Frequency } from '../lib/store'
import { AppHeader, Sheet, Label, Input, Select, Btn, ZoneLink, Empty } from '../components/ui'
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

  const filtered = db.borrowers.filter(b => {
    if (zoneFilter && b.zoneId !== zoneFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return b.name.toLowerCase().includes(q) || b.shopName.toLowerCase().includes(q) || b.phone.includes(q)
    }
    return true
  })

  return (
    <div className="flex flex-col">
      <AppHeader title="Borrowers" />

      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, shop, phone…"
            className="w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl pl-9 pr-8 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary-600)]"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"><X size={14} /></button>}
        </div>

        {/* Zone chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setZoneFilter(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast ${!zoneFilter ? 'bg-[var(--color-primary-700)] text-white' : 'bg-[var(--color-surface-700)] text-[var(--color-text-soft)]'}`}
          >All</button>
          {zones.map(z => (
            <button
              key={z.id}
              onClick={() => setZoneFilter(z.id === zoneFilter ? null : z.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast ${zoneFilter === z.id ? 'bg-[var(--color-primary-700)] text-white' : 'bg-[var(--color-surface-700)] text-[var(--color-text-soft)]'}`}
            >{z.name}</button>
          ))}
        </div>

        {/* Add + Zone link row */}
        <div className="flex items-center justify-between">
          <ZoneLink />
          <Btn size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Borrower
          </Btn>
        </div>

        {/* Borrower cards */}
        {filtered.length === 0 ? (
          <Empty text="No borrowers found. Add one to get started." />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(b => {
              const next = nextDueDate(b)
              const overdue = overdueCount(b)
              const zone = zones.find(z => z.id === b.zoneId)
              const progress = Math.round((b.paidInstallments.length / b.dueCount) * 100)
              return (
                <Link
                  key={b.id}
                  to="/lender/borrower/$id"
                  params={{ id: b.id }}
                  className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3 hover:border-[var(--color-primary-700)] transition-fast block"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)] text-sm truncate">{b.name}</p>
                      <p className="text-xs text-[var(--color-muted)] truncate">{b.shopName} · {b.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {zone && <span className="text-[10px] bg-[var(--color-primary-900)] text-[var(--color-primary-300)] px-2 py-0.5 rounded-full">{zone.name}</span>}
                      <ChevronRight size={14} className="text-[var(--color-muted)]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[var(--color-text-soft)] num">{inr(b.installmentAmount)}/inst</span>
                    <span className="text-[var(--color-muted)]">Next: {fmtDate(next)}</span>
                    {overdue > 0 && <span className="text-[var(--color-danger-400)]">{overdue} overdue</span>}
                  </div>
                  <div className="mt-2 h-1 bg-[var(--color-surface-700)] rounded-full">
                    <div className="h-1 bg-[var(--color-primary-600)] rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{b.paidInstallments.length}/{b.dueCount} paid</p>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Borrower Sheet */}
      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Borrower">
        <AddBorrowerForm onClose={() => setShowAdd(false)} />
      </Sheet>
    </div>
  )
}

function AddBorrowerForm({ onClose }: { onClose: () => void }) {
  const db = useDBSnap()
  const zones = db.settings.zones

  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [address, setAddress] = useState('')
  const [zoneId, setZoneId] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [amountPaidToBorrower, setAmountPaidToBorrower] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [startDate, setStartDate] = useState(todayISO())
  const [dueCount, setDueCount] = useState('30')
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [error, setError] = useState('')

  const amountNum = parseFloat(amount) || 0
  const dueCountNum = parseInt(dueCount) || 1
  const installmentAmount = amountNum > 0 ? Math.ceil(amountNum / dueCountNum) : 0
  const endDate = calcEndDate(startDate, dueCountNum, frequency)

  function handleSubmit() {
    if (!name.trim() || !amount || !dueCount) {
      setError('Name, amount, and due count are required.')
      return
    }
    const id = `b_${Date.now()}`
    write(d => ({
      ...d,
      borrowers: [...d.borrowers, {
        id,
        name: name.trim(),
        shopName: shopName.trim(),
        address: address.trim(),
        zoneId: zoneId || null,
        phone: phone.trim(),
        amount: amountNum,
        amountPaidToBorrower: parseFloat(amountPaidToBorrower) || amountNum,
        totalPayable: amountNum,
        frequency,
        startDate,
        dueCount: dueCountNum,
        endDate,
        payMode,
        installmentAmount,
        paidInstallments: [],
      }],
    }))
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[var(--color-danger-400)] text-xs bg-red-950/40 border border-red-800 rounded-xl px-3 py-2">{error}</p>}

      <div><Label>Full Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ramesh Kumar" /></div>
      <div><Label>Shop Name</Label><Input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Ramesh General Store" /></div>
      <div><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 MG Road, Bangalore" /></div>
      <div>
        <Label>Zone</Label>
        <Select value={zoneId} onChange={e => setZoneId(e.target.value)}>
          <option value="">No zone</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </Select>
      </div>
      <div><Label>Phone</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" /></div>
      <div><Label>Principal Amount (₹) *</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="30000" /></div>
      <div><Label>Amount Paid to Borrower (₹)</Label><Input type="number" value={amountPaidToBorrower} onChange={e => setAmountPaidToBorrower(e.target.value)} placeholder="Same as principal" /></div>
      <div>
        <Label>Frequency *</Label>
        <Select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </Select>
      </div>
      <div><Label>Start Date *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
      <div><Label>Number of Installments *</Label><Input type="number" value={dueCount} onChange={e => setDueCount(e.target.value)} placeholder="30" min="1" /></div>
      <div>
        <Label>Pay Mode</Label>
        <Select value={payMode} onChange={e => setPayMode(e.target.value as PayMode)}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="online">Online</option>
        </Select>
      </div>

      {/* Derived preview */}
      {amountNum > 0 && dueCountNum > 0 && (
        <div className="bg-[var(--color-surface-800)] rounded-xl p-3 text-xs text-[var(--color-text-soft)] flex flex-col gap-1">
          <div className="flex justify-between"><span>Installment</span><span className="num text-[var(--color-primary-400)]">{inr(installmentAmount)}</span></div>
          <div className="flex justify-between"><span>End date</span><span>{fmtDate(endDate)}</span></div>
          <div className="flex justify-between"><span>Total payable</span><span className="num">{inr(installmentAmount * dueCountNum)}</span></div>
        </div>
      )}

      <Btn onClick={handleSubmit}>Add Borrower</Btn>
    </div>
  )
}

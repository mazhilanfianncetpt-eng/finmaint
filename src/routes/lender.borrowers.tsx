import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, shop, phone…"
            className="w-full rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none transition-fast"
            style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Zone chips */}
        {zones.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setZoneFilter(null)}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
              style={{ backgroundColor: !zoneFilter ? 'var(--color-primary-700)' : 'var(--color-surface-700)', color: !zoneFilter ? '#fff' : 'var(--color-text-soft)' }}
            >All</button>
            {zones.map(z => (
              <button key={z.id} onClick={() => setZoneFilter(z.id === zoneFilter ? null : z.id)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-fast"
                style={{ backgroundColor: zoneFilter === z.id ? 'var(--color-primary-700)' : 'var(--color-surface-700)', color: zoneFilter === z.id ? '#fff' : 'var(--color-text-soft)' }}
              >{z.name}</button>
            ))}
          </div>
        )}

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
                <Link key={b.id} to="/lender/borrower/$id" params={{ id: b.id }}
                  className="rounded-2xl p-3 block transition-fast"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{b.shopName} · {b.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {zone && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--color-primary-500)' }}>
                          {zone.name}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{
                        backgroundColor: b.frequency === 'daily' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
                        color: b.frequency === 'daily' ? 'var(--color-primary-500)' : 'var(--color-gold-500)',
                      }}>
                        {b.frequency}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="num" style={{ color: 'var(--color-text-soft)' }}>{inr(b.installmentAmount)}/inst</span>
                    <span style={{ color: 'var(--color-muted)' }}>Next: {fmtDate(next)}</span>
                    {overdue > 0 && <span style={{ color: 'var(--color-danger-400)' }}>{overdue} overdue</span>}
                  </div>
                  <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div className="h-1 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary-600)' }} />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{b.paidInstallments.length}/{b.dueCount} paid</p>
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

function AddBorrowerForm({ onClose }: { onClose: () => void }) {
  const db = useDBSnap()
  const zones = db.settings.zones

  // Basic info
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [address, setAddress] = useState('')
  const [zoneId, setZoneId] = useState<string>('')
  const [phone, setPhone] = useState('')

  // Financial fields
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [startDate, setStartDate] = useState(todayISO())
  const [dueCount, setDueCount] = useState('30')
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [error, setError] = useState('')

  // Auto-calculated amount paid to borrower (principal − installment), user-editable
  const [amountPaidToBorrower, setAmountPaidToBorrower] = useState('')
  const [userEditedPaid, setUserEditedPaid] = useState(false)

  const amountNum = parseFloat(amount) || 0
  const dueCountNum = parseInt(dueCount) || 1
  const installmentAmount = amountNum > 0 ? Math.ceil(amountNum / dueCountNum) : 0
  const endDate = calcEndDate(startDate, dueCountNum, frequency)
  const autoIssuedCash = Math.max(0, amountNum - installmentAmount)

  useEffect(() => {
    if (!userEditedPaid && amountNum > 0 && installmentAmount > 0) {
      setAmountPaidToBorrower(String(autoIssuedCash))
    }
  }, [amountNum, installmentAmount, userEditedPaid, autoIssuedCash])

  function handlePaidChange(val: string) {
    setAmountPaidToBorrower(val)
    setUserEditedPaid(true)
  }

  function handleSubmit() {
    if (!name.trim() || !amount || !dueCount) {
      setError('Name, amount, and number of installments are required.')
      return
    }
    const paidNum = parseFloat(amountPaidToBorrower) || autoIssuedCash
    write(d => ({
      ...d,
      borrowers: [...d.borrowers, {
        id: `b_${Date.now()}`,
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
        paidInstallments: [],
      }],
    }))
    onClose()
  }

  // Text input style (no spinner for number fields)
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
        <p className="text-xs px-3 py-2 rounded-xl" style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </p>
      )}

      {/* ── Section: Personal details ── */}
      <div><Label>Full Name *</Label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ramesh Kumar" style={fieldStyle} />
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
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" style={fieldStyle} />
      </div>

      {/* ── Section: Financial details (matches Image 4) ── */}
      <div>
        <Label>Principal Amount (₹) *</Label>
        {/* inputmode="numeric" + no type="number" to kill spinners completely */}
        <input
          inputMode="numeric"
          value={amount}
          onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g, '')); setUserEditedPaid(false) }}
          placeholder="10000"
          style={fieldStyle}
        />
      </div>

      {/* Amount Paid to Borrower — auto-calculated, editable */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Amount Paid to Borrower (₹)</Label>
          {!userEditedPaid && amountNum > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--color-primary-500)' }}>Auto</span>
          ) : userEditedPaid ? (
            <button onClick={() => setUserEditedPaid(false)} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: 'var(--color-gold-500)' }}>
              Reset to auto
            </button>
          ) : null}
        </div>
        <input
          inputMode="numeric"
          value={amountPaidToBorrower}
          onChange={e => handlePaidChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={amountNum > 0 ? String(autoIssuedCash) : 'Same as principal'}
          style={fieldStyle}
        />
        {amountNum > 0 && installmentAmount > 0 && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted)' }}>
            Auto = {inr(amountNum)} − {inr(installmentAmount)} (1st inst) = {inr(autoIssuedCash)}
          </p>
        )}
      </div>

      <div>
        <Label>Frequency *</Label>
        <Select value={frequency} onChange={e => { setFrequency(e.target.value as Frequency); setUserEditedPaid(false) }}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </Select>
      </div>

      <div><Label>Start Date *</Label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldStyle} />
      </div>

      <div>
        <Label>Number of Installments *</Label>
        <input
          inputMode="numeric"
          value={dueCount}
          onChange={e => { setDueCount(e.target.value.replace(/[^0-9]/g, '')); setUserEditedPaid(false) }}
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

      {/* Preview summary box — matches Image 4 bottom strip */}
      {amountNum > 0 && dueCountNum > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-2"
          style={{ backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}
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
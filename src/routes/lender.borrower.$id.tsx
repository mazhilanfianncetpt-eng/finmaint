import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, togglePayment, deleteBorrower, updateBorrower } from '../lib/store'
import type { PayMode, Frequency } from '../lib/store'
import { AppHeader, ConfirmDialog, Sheet, Label, Select, Btn } from '../components/ui'
import { paymentHistory, nextDueDate, overdueCount, calcEndDate } from '../lib/logic'
import { inr, fmtDate, todayISO } from '../lib/format'
import { ChevronLeft, Trash2, Pencil } from 'lucide-react'

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
  const [showEdit, setShowEdit] = useState(false)

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
        {/* Back + Edit + Delete row */}
        <div className="flex items-center justify-between">
          <Link
            to="/lender/borrowers"
            className="inline-flex items-center gap-1 text-sm transition-fast"
            style={{ color: 'var(--color-primary-500)' }}
            aria-label="Back to all borrowers"
          >
            <ChevronLeft size={14} aria-hidden="true" /> All Borrowers
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-fast"
              style={{ color: 'var(--color-primary-500)', border: '1px solid var(--color-primary-700)', backgroundColor: 'rgba(16,185,129,0.08)' }}
              aria-label={`Edit ${b.name}`}
            >
              <Pencil size={13} aria-hidden="true" /> Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-fast"
              style={{ color: '#ef4444', border: '1px solid #ef444440', backgroundColor: '#ef444412' }}
              aria-label={`Delete ${b.name}`}
            >
              <Trash2 size={13} aria-hidden="true" /> Delete
            </button>
          </div>
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

      {/* Edit sheet */}
      <Sheet open={showEdit} onClose={() => setShowEdit(false)} title="Edit Borrower">
        <EditBorrowerForm b={b} onClose={() => setShowEdit(false)} />
      </Sheet>

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

// ─── EditBorrowerForm ─────────────────────────────────────────────────────────
function EditBorrowerForm({ b, onClose }: { b: ReturnType<typeof useDBSnap>['borrowers'][0]; onClose: () => void }) {
  const db    = useDBSnap()
  const zones = db.settings.zones

  const [name, setName]         = useState(b.name)
  const [shopName, setShopName] = useState(b.shopName)
  const [address, setAddress]   = useState(b.address)
  const [zoneId, setZoneId]     = useState<string>(b.zoneId ?? '')
  const [phone, setPhone]       = useState(b.phone)
  const [amount, setAmount]     = useState(String(b.amount))
  const [amountPaidToBorrower, setAmountPaidToBorrower] = useState(String(b.amountPaidToBorrower))
  const [frequency, setFrequency] = useState<Frequency>(b.frequency)
  const [startDate, setStartDate] = useState(b.startDate)
  const [dueCount, setDueCount]   = useState(String(b.dueCount))
  const [payMode, setPayMode]     = useState<PayMode>(b.payMode)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  const amountNum       = parseFloat(amount) || 0
  const dueCountNum     = parseInt(dueCount) || 1
  const installmentAmount = amountNum > 0 ? Math.ceil(amountNum / dueCountNum) : 0
  const endDate         = calcEndDate(startDate, dueCountNum, frequency)

  async function handleSave() {
    if (!name.trim() || !amount || !dueCount) {
      setError('Name, amount, and number of installments are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateBorrower(b.id, {
        name: name.trim(),
        shopName: shopName.trim(),
        address: address.trim(),
        zoneId: zoneId || null,
        phone: phone.trim(),
        amount: amountNum,
        amountPaidToBorrower: parseFloat(amountPaidToBorrower) || 0,
        totalPayable: installmentAmount * dueCountNum,
        frequency,
        startDate,
        dueCount: dueCountNum,
        endDate,
        payMode,
        installmentAmount,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
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

      <Btn onClick={handleSave} className="w-full mt-1" disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </Btn>
    </div>
  )
}
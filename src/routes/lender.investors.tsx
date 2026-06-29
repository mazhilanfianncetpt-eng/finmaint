import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, write } from '../lib/store'
import type { PayMode } from '../lib/store'
import { AppHeader, Sheet, Label, Input, Select, Btn, Empty } from '../components/ui'
import { inr, fmtDate, todayISO } from '../lib/format'
import { Plus, TrendingDown } from 'lucide-react'

export const Route = createFileRoute('/lender/investors')({
  component: InvestorsPage,
})

function InvestorsPage() {
  const db = useDBSnap()
  const [showAdd, setShowAdd] = useState(false)

  const active = db.investors.filter(i => !i.withdrawnOn)
  const withdrawn = db.investors.filter(i => i.withdrawnOn)

  const totalActive = active.reduce((s, i) => s + i.amount, 0)
  const totalWithdrawn = withdrawn.reduce((s, i) => s + i.amount, 0)

  function handleWithdraw(id: string) {
    write(d => ({
      ...d,
      investors: d.investors.map(i => i.id === id ? { ...i, withdrawnOn: todayISO() } : i),
    }))
  }

  function handleUnwithdraw(id: string) {
    write(d => ({
      ...d,
      investors: d.investors.map(i => i.id === id ? { ...i, withdrawnOn: null } : i),
    }))
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Investors" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Active Investment</p>
            <p className="text-lg font-bold num text-[var(--color-gold-400)] mt-1">{inr(totalActive)}</p>
            <p className="text-[10px] text-[var(--color-muted)]">{active.length} investors</p>
          </div>
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Withdrawn</p>
            <p className="text-lg font-bold num text-[var(--color-muted)] mt-1">{inr(totalWithdrawn)}</p>
            <p className="text-[10px] text-[var(--color-muted)]">{withdrawn.length} investors</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Btn size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Investor
          </Btn>
        </div>

        {/* Active investors */}
        {active.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider text-[var(--color-primary-600)] mb-2">Active ({active.length})</p>
            <div className="flex flex-col gap-2">
              {active.map(inv => (
                <div key={inv.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text)] text-sm">{inv.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{inv.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold num text-[var(--color-gold-400)]">{inr(inv.amount)}</p>
                      <p className="text-[10px] text-[var(--color-muted)] capitalize">{inv.payMode}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[var(--color-muted)]">Since {fmtDate(inv.investedOn)}</p>
                    <button
                      onClick={() => handleWithdraw(inv.id)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-warning-400)] hover:text-amber-300 transition-fast"
                    >
                      <TrendingDown size={12} /> Mark Withdrawn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Withdrawn */}
        {withdrawn.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-2">Withdrawn ({withdrawn.length})</p>
            <div className="flex flex-col gap-2">
              {withdrawn.map(inv => (
                <div key={inv.id} className="bg-[var(--color-card)] border border-[var(--color-surface-700)] rounded-2xl p-3 opacity-60">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text-soft)] text-sm">{inv.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{inv.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold num text-[var(--color-muted)]">{inr(inv.amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[var(--color-muted)]">Withdrawn {fmtDate(inv.withdrawnOn)}</p>
                    <button
                      onClick={() => handleUnwithdraw(inv.id)}
                      className="text-xs text-[var(--color-primary-400)] hover:text-[var(--color-primary-300)] transition-fast"
                    >
                      Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {db.investors.length === 0 && <Empty text="No investors yet. Add your first investor." />}
      </div>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Investor">
        <AddInvestorForm onClose={() => setShowAdd(false)} />
      </Sheet>
    </div>
  )
}

function AddInvestorForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [payMode, setPayMode] = useState<PayMode>('cash')
  const [investedOn, setInvestedOn] = useState(todayISO())
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!name.trim() || !amount) {
      setError('Name and amount are required.')
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.')
      return
    }
    write(d => ({
      ...d,
      investors: [...d.investors, {
        id: `inv_${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        amount: amountNum,
        payMode,
        investedOn,
        withdrawnOn: null,
      }],
    }))
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[var(--color-danger-400)] text-xs bg-red-950/40 border border-red-800 rounded-xl px-3 py-2">{error}</p>}
      <div><Label>Investor Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Suresh Nair" /></div>
      <div><Label>Phone</Label><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" /></div>
      <div><Label>Amount (₹) *</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100000" /></div>
      <div>
        <Label>Pay Mode</Label>
        <Select value={payMode} onChange={e => setPayMode(e.target.value as PayMode)}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="online">Online</option>
        </Select>
      </div>
      <div><Label>Invested On</Label><Input type="date" value={investedOn} onChange={e => setInvestedOn(e.target.value)} /></div>
      <Btn onClick={handleSubmit}>Add Investor</Btn>
    </div>
  )
}

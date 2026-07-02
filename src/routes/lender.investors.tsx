import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, write } from '../lib/store'
import type { PayMode } from '../lib/store'
import { AppHeader, Sheet, Label, Input, Select, Btn, Empty, PageHeader } from '../components/ui'
import { inr, fmtDate, todayISO } from '../lib/format'
import { Plus, TrendingDown, RefreshCw } from 'lucide-react'

export const Route = createFileRoute('/lender/investors')({
  component: InvestorsPage,
})

function InvestorsPage() {
  const db = useDBSnap()
  const [showAdd, setShowAdd] = useState(false)

  const active    = db.investors.filter(i => !i.withdrawnOn)
  const withdrawn = db.investors.filter(i => i.withdrawnOn)
  const totalActive    = active.reduce((s, i) => s + i.amount, 0)
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
    <div className="flex flex-col min-h-full">
      {/* Mobile header */}
      <div className="md:hidden">
        <AppHeader title="Investors" />
      </div>

      <div className="page-pad flex flex-col gap-4">
        {/* Desktop heading */}
        <div className="hidden md:block">
          <PageHeader
            title="Investors"
            subtitle={`${active.length} active investors`}
            action={
              <Btn onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add Investor
              </Btn>
            }
          />
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--color-gold-500)' }}
            aria-label="Active investment total"
          >
            <p
              className="text-[10px] uppercase tracking-wider font-medium"
              style={{ color: 'rgba(0,0,0,0.6)' }}
            >
              Active Investment
            </p>
            <p className="text-lg font-bold num mt-1" style={{ color: '#1a0a00' }}>
              {inr(totalActive)}
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(0,0,0,0.5)' }}>
              {active.length} investor{active.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            aria-label="Withdrawn investment total"
          >
            <p
              className="text-[10px] uppercase tracking-wider font-medium"
              style={{ color: 'var(--color-muted)' }}
            >
              Withdrawn
            </p>
            <p className="text-lg font-bold num mt-1" style={{ color: 'var(--color-muted)' }}>
              {inr(totalWithdrawn)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
              {withdrawn.length} investor{withdrawn.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Mobile: Add button */}
        <div className="flex justify-end md:hidden">
          <Btn size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Investor
          </Btn>
        </div>

        {/* Active investors */}
        {active.length > 0 && (
          <section aria-label="Active investors">
            <p
              className="text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-primary-600)' }}
            >
              Active ({active.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {active.map(inv => (
                <div
                  key={inv.id}
                  className="rounded-2xl p-3"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                        {inv.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{inv.phone}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold num" style={{ color: 'var(--color-gold-400)' }}>
                        {inr(inv.amount)}
                      </p>
                      <p className="text-[10px] capitalize" style={{ color: 'var(--color-muted)' }}>
                        {inv.payMode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Since {fmtDate(inv.investedOn)}
                    </p>
                    <button
                      onClick={() => handleWithdraw(inv.id)}
                      className="inline-flex items-center gap-1 text-xs transition-fast"
                      style={{ color: 'var(--color-warning-400)' }}
                      aria-label={`Mark ${inv.name} as withdrawn`}
                    >
                      <TrendingDown size={12} aria-hidden="true" /> Mark Withdrawn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Withdrawn investors */}
        {withdrawn.length > 0 && (
          <section aria-label="Withdrawn investors">
            <p
              className="text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-muted)' }}
            >
              Withdrawn ({withdrawn.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {withdrawn.map(inv => (
                <div
                  key={inv.id}
                  className="rounded-2xl p-3 opacity-60"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-soft)' }}>
                        {inv.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{inv.phone}</p>
                    </div>
                    <p className="text-sm font-bold num shrink-0 ml-2" style={{ color: 'var(--color-muted)' }}>
                      {inr(inv.amount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      Withdrawn {fmtDate(inv.withdrawnOn)}
                    </p>
                    <button
                      onClick={() => handleUnwithdraw(inv.id)}
                      className="inline-flex items-center gap-1 text-xs transition-fast"
                      style={{ color: 'var(--color-primary-500)' }}
                      aria-label={`Reactivate ${inv.name}`}
                    >
                      <RefreshCw size={11} aria-hidden="true" /> Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {db.investors.length === 0 && (
          <Empty text="No investors yet. Add your first investor." />
        )}
      </div>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Investor">
        <AddInvestorForm onClose={() => setShowAdd(false)} />
      </Sheet>
    </div>
  )
}

function AddInvestorForm({ onClose }: { onClose: () => void }) {
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [amount, setAmount]       = useState('')
  const [payMode, setPayMode]     = useState<PayMode>('cash')
  const [investedOn, setInvestedOn] = useState(todayISO())
  const [error, setError]         = useState('')

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
      investors: [
        ...d.investors,
        {
          id: `inv_${Date.now()}`,
          name: name.trim(),
          phone: phone.trim(),
          amount: amountNum,
          payMode,
          investedOn,
          withdrawnOn: null,
        },
      ],
    }))
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p
          className="text-xs px-3 py-2 rounded-xl"
          role="alert"
          style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {error}
        </p>
      )}
      <div>
        <Label>Investor Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Suresh Nair" autoComplete="name" />
      </div>
      <div>
        <Label>Phone</Label>
        <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" autoComplete="tel" />
      </div>
      <div>
        <Label>Amount (₹) *</Label>
        <Input
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="100000"
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
      <div>
        <Label>Invested On</Label>
        <Input type="date" value={investedOn} onChange={e => setInvestedOn(e.target.value)} />
      </div>
      <Btn onClick={handleSubmit}>Add Investor</Btn>
    </div>
  )
}
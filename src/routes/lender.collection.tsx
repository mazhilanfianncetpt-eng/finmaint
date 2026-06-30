import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, currentUser, write } from '../lib/store'
import { AppHeader, Sheet, Label, Input, Btn } from '../components/ui'
import { ledgerFor, previewLedger, dueDatesFor } from '../lib/logic'
import { inr, fmtDate, todayISO, addDays } from '../lib/format'
import { exportLedgerCSV, exportLedgerPDF, exportMonthlyCSV, exportMonthlyPDF } from '../lib/export'
import { Download, FileText, Settings2, CalendarDays } from 'lucide-react'
import type { Borrower } from '../lib/store'

export const Route = createFileRoute('/lender/collection')({
  component: CollectionPage,
})

/** Returns "3rd" / "14th" etc. for installment number labels */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** Which installment number (1-based) is due on `date` for borrower `b` */
function installmentNumberFor(b: Borrower, date: string): number {
  const dates = dueDatesFor(b)
  const idx = dates.indexOf(date)
  return idx === -1 ? 0 : idx + 1
}

// Coloured metric tile (same as dashboard)
function MetricTile({ label, value, variant = 'default' }: {
  label: string; value: string; variant?: 'green' | 'gold' | 'default' | 'closing-good' | 'closing-bad'
}) {
  const bg: Record<string, string> = {
    green: 'var(--color-primary-800)',
    gold: 'var(--color-gold-500)',
    default: 'var(--color-card)',
    'closing-good': 'var(--color-primary-800)',
    'closing-bad': 'rgba(239,68,68,0.15)',
  }
  const fg: Record<string, string> = {
    green: '#fff', gold: '#1a0800', default: 'var(--color-text)',
    'closing-good': '#fff', 'closing-bad': '#f87171',
  }
  const lbl: Record<string, string> = {
    green: 'rgba(255,255,255,0.7)', gold: 'rgba(0,0,0,0.55)',
    default: 'var(--color-muted)', 'closing-good': 'rgba(255,255,255,0.7)',
    'closing-bad': 'rgba(248,113,113,0.7)',
  }
  const border = variant === 'default' ? '1px solid var(--color-border)' :
    variant === 'closing-bad' ? '1px solid rgba(239,68,68,0.3)' : 'none'

  return (
    <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ backgroundColor: bg[variant], border, color: fg[variant] }}>
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: lbl[variant] }}>{label}</p>
      <p className="text-lg font-bold num leading-tight">{value}</p>
    </div>
  )
}

function CollectionPage() {
  const db = useDBSnap()
  const user = currentUser(db)
  const isAdmin = user?.role === 'admin'

  const [date, setDate] = useState(todayISO())
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(false)

  const [obAmount, setObAmount] = useState(String(db.settings.initialOpeningBalance))
  const [obDate, setObDate] = useState(db.settings.initialOpeningDate)
  const [obPreview, setObPreview] = useState<ReturnType<typeof previewLedger> | null>(null)
  const [obConfirm, setObConfirm] = useState(false)

  const zones = db.settings.zones
  const ledger = ledgerFor(db, date, zoneId)
  const today = todayISO()
  const zoneName = zoneId ? zones.find(z => z.id === zoneId)?.name ?? null : null

  // ── Previous pending: borrowers with overdue unpaid installments (any date filter) ──
  const overdueBorrowers = db.borrowers
    .filter(b => {
      if (zoneId && b.zoneId !== zoneId) return false
      const dates = dueDatesFor(b)
      return dates.some(d => d < today && !b.paidInstallments.includes(d))
    })
    .map(b => {
      const dates = dueDatesFor(b)
      const overdueDates = dates.filter(d => d < today && !b.paidInstallments.includes(d))
      const overdueAmt = overdueDates.length * b.installmentAmount
      return { b, overdueDates, overdueAmt }
    })

  // Toggle paid for any borrower/date combo — no date restriction (multi check-in enabled)
  function togglePaid(borrowerId: string, d: string, wasPaid: boolean) {
    write(db => ({
      ...db,
      borrowers: db.borrowers.map(b => {
        if (b.id !== borrowerId) return b
        const paidInstallments = wasPaid
          ? b.paidInstallments.filter(x => x !== d)
          : [...b.paidInstallments, d]
        return { ...b, paidInstallments }
      }),
    }))
  }

  // Check-in for one specific overdue date on a borrower (marks that installment as paid)
  function checkInOverdue(borrowerId: string, overdueDate: string) {
    write(db => ({
      ...db,
      borrowers: db.borrowers.map(b => {
        if (b.id !== borrowerId) return b
        if (b.paidInstallments.includes(overdueDate)) return b
        return { ...b, paidInstallments: [...b.paidInstallments, overdueDate] }
      }),
    }))
  }

  function handlePreview() {
    const amount = parseFloat(obAmount)
    if (isNaN(amount)) return
    setObPreview(previewLedger(db, addDays(obDate, -3), 10, { initialOpeningBalance: amount, initialOpeningDate: obDate }))
    setObConfirm(false)
  }

  function handleSaveOB() {
    const amount = parseFloat(obAmount)
    if (isNaN(amount)) return
    write(d => ({ ...d, settings: { ...d.settings, initialOpeningBalance: amount, initialOpeningDate: obDate } }))
    setShowBalance(false); setObPreview(null); setObConfirm(false)
  }

  function handleResetOB() {
    setObAmount('0'); setObDate(todayISO()); setObPreview(null); setObConfirm(false)
  }

  // Borrower row with installment # and frequency tags — always editable, no date lock
  function BorrowerRow({ b, paid }: { b: Borrower; paid: boolean }) {
    const instNo = installmentNumberFor(b, date)
    return (
      <div
        className="flex items-center gap-3 rounded-2xl px-3 py-3"
        style={{
          backgroundColor: 'var(--color-card)',
          border: paid ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-border)',
        }}
      >
        <input
          type="checkbox"
          checked={paid}
          onChange={() => togglePaid(b.id, date, paid)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{b.name}</p>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: b.frequency === 'daily' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
                color: b.frequency === 'daily' ? 'var(--color-primary-500)' : 'var(--color-gold-500)',
              }}
            >
              {b.frequency === 'daily' ? 'Daily' : 'Weekly'}
            </span>
            {instNo > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                {ordinal(instNo)} installment
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{b.shopName} · {b.phone}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm num font-bold" style={{ color: paid ? 'var(--color-primary-500)' : 'var(--color-danger-400)' }}>
            {inr(b.installmentAmount)}
          </p>
          <p className="text-[10px] font-medium uppercase" style={{ color: paid ? 'var(--color-primary-600)' : 'var(--color-danger-400)' }}>
            {paid ? 'Received' : 'Pending'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Collection" subtitle={fmtDate(date)} />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Date + Zone filter */}
        <div className="rounded-2xl p-3 flex flex-col gap-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>📅</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none transition-fast"
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
        </div>

        {/* Ledger tiles — coloured */}
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Opening" value={inr(ledger.opening)} variant="default" />
          <MetricTile label="Due"     value={inr(ledger.totalCollection)} variant="default" />
          <MetricTile label="Received" value={inr(ledger.totalReceived)} variant="gold" />
          <MetricTile label="Closing"  value={inr(ledger.closing)} variant={ledger.closing < 0 ? 'closing-bad' : 'closing-good'} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" variant="secondary" onClick={() => exportLedgerCSV(ledger, zoneName)}>
            <Download size={13} /> CSV
          </Btn>
          <Btn size="sm" variant="secondary" onClick={() => exportLedgerPDF(ledger, zoneName)}>
            <FileText size={13} /> PDF
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => {
            exportMonthlyCSV(db, date, zoneId, zoneName)
          }}>
            <CalendarDays size={13} /> Monthly Report (CSV)
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => {
            exportMonthlyPDF(db, date, zoneId, zoneName)
          }}>
            <CalendarDays size={13} /> Monthly Report (PDF)
          </Btn>
          {isAdmin && (
            <Btn size="sm" variant="ghost" onClick={() => setShowBalance(true)}>
              <Settings2 size={13} /> Opening
            </Btn>
          )}
        </div>

        {/* ── PREVIOUS PENDING — independent of date, with check-in ── */}
        {overdueBorrowers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-danger-400)' }}>
                ⚠ Pending
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: 'var(--color-danger-400)' }}>
                {overdueBorrowers.length} borrower{overdueBorrowers.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {overdueBorrowers.map(({ b, overdueDates, overdueAmt }) => (
                <div key={b.id} className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{b.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{b.shopName} · {b.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm num font-bold" style={{ color: 'var(--color-danger-400)' }}>{inr(overdueAmt)}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-danger-400)' }}>{overdueDates.length} missed</p>
                    </div>
                  </div>

                  {/* Individual overdue dates with checkbox + installment tag */}
                  <div className="flex flex-col gap-1.5">
                    {overdueDates.map(d => {
                      const instNo = installmentNumberFor(b, d)
                      return (
                        <div key={d} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                          style={{ backgroundColor: 'var(--color-surface-800)' }}>
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => checkInOverdue(b.id, d)}
                          />
                          <span className="text-xs flex-1" style={{ color: 'var(--color-text-soft)' }}>{fmtDate(d)}</span>
                          {instNo > 0 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                              {ordinal(instNo)} installment
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Due borrowers on selected date — fully editable, multi check-in */}
        {(ledger.paidBorrowers.length > 0 || ledger.unpaidBorrowers.length > 0) && (
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>
              Due on {fmtDate(date)}
            </p>
            <div className="flex flex-col gap-2">
              {ledger.paidBorrowers.map(b => <BorrowerRow key={b.id} b={b} paid={true} />)}
              {ledger.unpaidBorrowers.map(b => <BorrowerRow key={b.id} b={b} paid={false} />)}
            </div>
          </div>
        )}

        {ledger.paidBorrowers.length === 0 && ledger.unpaidBorrowers.length === 0 && overdueBorrowers.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--color-muted)' }}>
            No borrowers due on this date.
          </p>
        )}
      </div>

      {/* Opening Balance Sheet */}
      <Sheet open={showBalance} onClose={() => { setShowBalance(false); setObPreview(null); setObConfirm(false) }} title="Set Opening Balance">
        <div className="flex flex-col gap-4">
          <div><Label>Opening Balance (₹)</Label><Input type="number" value={obAmount} onChange={e => setObAmount(e.target.value)} placeholder="0" /></div>
          <div><Label>Effective From Date</Label><Input type="date" value={obDate} onChange={e => setObDate(e.target.value)} /></div>
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={handlePreview}>Preview 10 Days</Btn>
            <Btn variant="ghost" size="sm" onClick={handleResetOB}>Reset to ₹0 today</Btn>
          </div>
          {obPreview && (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>Preview (effective date highlighted)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                      <th className="text-left py-1">Date</th>
                      <th className="text-right py-1">Open</th>
                      <th className="text-right py-1">Due</th>
                      <th className="text-right py-1">Rec.</th>
                      <th className="text-right py-1">Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obPreview.map(row => (
                      <tr key={row.date} style={{ borderBottom: '1px solid var(--color-border)', color: row.date === obDate ? 'var(--color-gold-400)' : 'var(--color-text-soft)', fontWeight: row.date === obDate ? '600' : 'normal' }}>
                        <td className="py-1">{fmtDate(row.date)}</td>
                        <td className="text-right num">{inr(row.opening)}</td>
                        <td className="text-right num">{inr(row.totalCollection)}</td>
                        <td className="text-right num">{inr(row.totalReceived)}</td>
                        <td className="text-right num">{inr(row.closing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!obConfirm ? (
            <Btn variant="primary" onClick={() => setObConfirm(true)}>Save Opening Balance</Btn>
          ) : (
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--color-gold-400)' }}>⚠ This recomputes all subsequent openings. Continue?</p>
              <div className="flex gap-2">
                <Btn variant="primary" onClick={handleSaveOB}>Confirm Save</Btn>
                <Btn variant="secondary" onClick={() => setObConfirm(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  )
}
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, currentUser, write } from '../lib/store'
import { AppHeader, StatCard, Sheet, Label, Input, Btn } from '../components/ui'
import { ledgerFor, previewLedger } from '../lib/logic'
import { inr, fmtDate, todayISO, addDays } from '../lib/format'
import { exportLedgerCSV, exportLedgerPDF } from '../lib/export'
import { Download, FileText, Settings2 } from 'lucide-react'

export const Route = createFileRoute('/lender/collection')({
  component: CollectionPage,
})

function CollectionPage() {
  const db = useDBSnap()
  const user = currentUser(db)
  const isAdmin = user?.role === 'admin'

  const [date, setDate] = useState(todayISO())
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(false)

  // Opening balance form
  const [obAmount, setObAmount] = useState(String(db.settings.initialOpeningBalance))
  const [obDate, setObDate] = useState(db.settings.initialOpeningDate)
  const [obPreview, setObPreview] = useState<ReturnType<typeof previewLedger> | null>(null)
  const [obConfirm, setObConfirm] = useState(false)

  const zones = db.settings.zones
  const ledger = ledgerFor(db, date, zoneId)
  const today = todayISO()
  const zoneName = zoneId ? zones.find(z => z.id === zoneId)?.name ?? null : null

  function togglePaid(borrowerId: string, date: string, paid: boolean) {
    write(d => ({
      ...d,
      borrowers: d.borrowers.map(b => {
        if (b.id !== borrowerId) return b
        const paidInstallments = paid
          ? b.paidInstallments.filter(x => x !== date)
          : [...b.paidInstallments, date]
        return { ...b, paidInstallments }
      }),
    }))
  }

  function handlePreview() {
    const amount = parseFloat(obAmount)
    if (isNaN(amount)) return
    const preview = previewLedger(db, addDays(obDate, -3), 10, {
      initialOpeningBalance: amount,
      initialOpeningDate: obDate,
    })
    setObPreview(preview)
    setObConfirm(false)
  }

  function handleSaveOB() {
    const amount = parseFloat(obAmount)
    if (isNaN(amount)) return
    write(d => ({ ...d, settings: { ...d.settings, initialOpeningBalance: amount, initialOpeningDate: obDate } }))
    setShowBalance(false)
    setObPreview(null)
    setObConfirm(false)
  }

  function handleResetOB() {
    setObAmount('0')
    setObDate(todayISO())
    setObPreview(null)
    setObConfirm(false)
  }

  return (
    <div className="flex flex-col">
      <AppHeader title="Collection" subtitle={fmtDate(date)} />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Date + Zone filter */}
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-600)]"
          />
          <select
            value={zoneId ?? ''}
            onChange={e => setZoneId(e.target.value || null)}
            className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none"
          >
            <option value="">All zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>

        {/* Ledger tiles */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Opening" value={inr(ledger.opening)} accent="muted" />
          <StatCard label="Due" value={inr(ledger.totalCollection)} />
          <StatCard label="Received" value={inr(ledger.totalReceived)} />
          <StatCard label="Closing" value={inr(ledger.closing)} accent={ledger.closing < 0 ? 'danger' : 'gold'} />
        </div>

        {/* Export + Admin */}
        <div className="flex gap-2 flex-wrap">
          <Btn size="sm" variant="secondary" onClick={() => exportLedgerCSV(ledger, zoneName)}>
            <Download size={13} /> CSV
          </Btn>
          <Btn size="sm" variant="secondary" onClick={() => exportLedgerPDF(ledger, zoneName)}>
            <FileText size={13} /> PDF
          </Btn>
          {isAdmin && (
            <Btn size="sm" variant="ghost" onClick={() => setShowBalance(true)}>
              <Settings2 size={13} /> Opening Balance
            </Btn>
          )}
        </div>

        {/* Paid borrowers */}
        {ledger.paidBorrowers.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider text-[var(--color-primary-600)] mb-2">✓ Paid ({ledger.paidBorrowers.length})</p>
            <div className="flex flex-col gap-1.5">
              {ledger.paidBorrowers.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-[var(--color-card)] rounded-xl px-3 py-2.5 border border-[var(--color-surface-700)]">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={date !== today}
                    onChange={() => togglePaid(b.id, date, true)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{b.name}</p>
                    <p className="text-xs text-[var(--color-muted)] truncate">{b.shopName} · {b.phone}</p>
                  </div>
                  <span className="text-sm num text-[var(--color-primary-400)] shrink-0">{inr(b.installmentAmount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Unpaid borrowers */}
        {ledger.unpaidBorrowers.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider text-[var(--color-danger-400)] mb-2">✗ Unpaid ({ledger.unpaidBorrowers.length})</p>
            <div className="flex flex-col gap-1.5">
              {ledger.unpaidBorrowers.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-[var(--color-card)] rounded-xl px-3 py-2.5 border border-[var(--color-surface-700)]">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={date !== today}
                    onChange={() => togglePaid(b.id, date, false)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{b.name}</p>
                    <p className="text-xs text-[var(--color-muted)] truncate">{b.shopName} · {b.phone}</p>
                  </div>
                  <span className="text-sm num text-[var(--color-danger-400)] shrink-0">{inr(b.installmentAmount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {ledger.paidBorrowers.length === 0 && ledger.unpaidBorrowers.length === 0 && (
          <p className="text-center text-[var(--color-muted)] text-sm py-8">No borrowers due on this date.</p>
        )}
      </div>

      {/* Opening Balance Sheet (Admin only) */}
      <Sheet open={showBalance} onClose={() => { setShowBalance(false); setObPreview(null); setObConfirm(false) }} title="Set Opening Balance">
        <div className="flex flex-col gap-4">
          <div>
            <Label>Opening Balance (₹)</Label>
            <Input type="number" value={obAmount} onChange={e => setObAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Effective From Date</Label>
            <Input type="date" value={obDate} onChange={e => setObDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={handlePreview}>Preview 10 Days</Btn>
            <Btn variant="ghost" size="sm" onClick={handleResetOB}>Reset to ₹0 today</Btn>
          </div>

          {obPreview && (
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-2">7-day preview (new values)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <th className="text-left py-1">Date</th>
                      <th className="text-right py-1">Opening</th>
                      <th className="text-right py-1">Due</th>
                      <th className="text-right py-1">Rec.</th>
                      <th className="text-right py-1">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obPreview.map(row => (
                      <tr key={row.date} className={`border-b border-[var(--color-surface-800)] ${row.date === obDate ? 'text-[var(--color-gold-400)]' : 'text-[var(--color-text-soft)]'}`}>
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
            <div className="bg-yellow-950/40 border border-yellow-700 rounded-xl p-3">
              <p className="text-yellow-400 text-xs mb-3">⚠ This will recompute all subsequent day openings. Continue?</p>
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

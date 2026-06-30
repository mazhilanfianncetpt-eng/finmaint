import type { LedgerResult } from './logic'
import { ledgerFor } from './logic'
import type { DB } from './store'
import { fmtDate, inr, addDays } from './format'

export function exportLedgerCSV(ledger: LedgerResult, zoneName: string | null) {
  const { date, opening, totalCollection, totalReceived, closing, paidBorrowers, unpaidBorrowers } = ledger
  const rows: string[][] = []

  rows.push(['FinMaint Daily Collection Report'])
  rows.push(['Date', fmtDate(date)])
  if (zoneName) rows.push(['Zone', zoneName])
  rows.push([])
  rows.push(['Opening Balance', String(opening)])
  rows.push(['Collection Due', String(totalCollection)])
  rows.push(['Received', String(totalReceived)])
  rows.push(['Closing Balance', String(closing)])
  rows.push([])
  rows.push(['PAID BORROWERS'])
  rows.push(['Name', 'Shop', 'Phone', 'Amount'])
  for (const b of paidBorrowers) {
    rows.push([b.name, b.shopName, b.phone, String(b.installmentAmount)])
  }
  rows.push([])
  rows.push(['UNPAID BORROWERS'])
  rows.push(['Name', 'Shop', 'Phone', 'Amount Due'])
  for (const b of unpaidBorrowers) {
    rows.push([b.name, b.shopName, b.phone, String(b.installmentAmount)])
  }

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  downloadBlob(csv, 'text/csv', `collection-${date}${zoneName ? `-${zoneName}` : ''}.csv`)
}

export function exportLedgerPDF(ledger: LedgerResult, zoneName: string | null) {
  const { date, opening, totalCollection, totalReceived, closing, paidBorrowers, unpaidBorrowers } = ledger

  const paidRows = paidBorrowers.map(b =>
    `<tr><td>${b.name}</td><td>${b.shopName}</td><td>${b.phone}</td><td>${inr(b.installmentAmount)}</td></tr>`
  ).join('')

  const unpaidRows = unpaidBorrowers.map(b =>
    `<tr><td>${b.name}</td><td>${b.shopName}</td><td>${b.phone}</td><td>${inr(b.installmentAmount)}</td></tr>`
  ).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Collection ${fmtDate(date)}</title>
  <style>
    body { font-family: sans-serif; padding: 24px; color: #111; }
    h1 { color: #065f46; font-size: 20px; margin-bottom: 4px; }
    .meta { color: #555; margin-bottom: 16px; font-size: 13px; }
    .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .tile { border: 1px solid #d1fae5; border-radius: 8px; padding: 12px; text-align: center; background: #f0fdf4; }
    .tile .label { font-size: 11px; color: #065f46; text-transform: uppercase; letter-spacing: .5px; }
    .tile .value { font-size: 20px; font-weight: 700; color: #047857; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #065f46; color: #fff; padding: 6px 10px; text-align: left; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
    h2 { font-size: 15px; color: #047857; margin: 20px 0 8px; }
    .paid-head { background: #059669; }
    .unpaid-head { background: #b91c1c; }
    @media print { body { padding: 8px; } }
  </style></head><body>
  <h1>FinMaint — Daily Collection Report</h1>
  <div class="meta">Date: ${fmtDate(date)}${zoneName ? ` &nbsp;|&nbsp; Zone: ${zoneName}` : ''}</div>
  <div class="summary">
    <div class="tile"><div class="label">Opening</div><div class="value">${inr(opening)}</div></div>
    <div class="tile"><div class="label">Due</div><div class="value">${inr(totalCollection)}</div></div>
    <div class="tile"><div class="label">Received</div><div class="value">${inr(totalReceived)}</div></div>
    <div class="tile"><div class="label">Closing</div><div class="value">${inr(closing)}</div></div>
  </div>
  <h2>✅ Paid Borrowers (${paidBorrowers.length})</h2>
  <table><thead><tr class="paid-head"><th>Name</th><th>Shop</th><th>Phone</th><th>Amount</th></tr></thead>
  <tbody>${paidRows || '<tr><td colspan="4">None</td></tr>'}</tbody></table>
  <h2>❌ Unpaid Borrowers (${unpaidBorrowers.length})</h2>
  <table><thead><tr class="unpaid-head"><th>Name</th><th>Shop</th><th>Phone</th><th>Amount</th></tr></thead>
  <tbody>${unpaidRows || '<tr><td colspan="4">None</td></tr>'}</tbody></table>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`

  openPrintWindow(html)
}

// ──────────────────────────────────────────────────────────────────────────
// MONTHLY REPORT — week-wise breakdown (1st, 2nd, 3rd, 4th/5th week of month)
// ──────────────────────────────────────────────────────────────────────────

interface DayRow {
  date: string
  opening: number
  due: number
  received: number
  closing: number
}

interface WeekGroup {
  label: string       // "Week 1", "Week 2", ...
  days: DayRow[]
  totalDue: number
  totalReceived: number
}

/** Builds day-by-day rows for every day in the month containing `anchorDate`,
 *  then groups them into calendar weeks (1st week = days 1-7, 2nd = 8-14, etc.) */
function buildMonthlyData(db: DB, anchorDate: string, zoneId: string | null): { monthLabel: string; weeks: WeekGroup[]; monthTotalDue: number; monthTotalReceived: number } {
  const [y, m] = anchorDate.split('-').map(Number)
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
  const daysInMonth = new Date(y, m, 0).getDate()

  const dayRows: DayRow[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const d = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const l = ledgerFor(db, d, zoneId)
    dayRows.push({ date: d, opening: l.opening, due: l.totalCollection, received: l.totalReceived, closing: l.closing })
  }

  // Group into weeks of 7 (calendar-day based: 1-7, 8-14, 15-21, 22-28, 29-31)
  const weeks: WeekGroup[] = []
  for (let i = 0; i < dayRows.length; i += 7) {
    const chunk = dayRows.slice(i, i + 7)
    const weekNum = Math.floor(i / 7) + 1
    weeks.push({
      label: `Week ${weekNum}`,
      days: chunk,
      totalDue: chunk.reduce((s, r) => s + r.due, 0),
      totalReceived: chunk.reduce((s, r) => s + r.received, 0),
    })
  }

  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const monthTotalDue = dayRows.reduce((s, r) => s + r.due, 0)
  const monthTotalReceived = dayRows.reduce((s, r) => s + r.received, 0)

  return { monthLabel, weeks, monthTotalDue, monthTotalReceived }
}

export function exportMonthlyCSV(db: DB, anchorDate: string, zoneId: string | null, zoneName: string | null) {
  const { monthLabel, weeks, monthTotalDue, monthTotalReceived } = buildMonthlyData(db, anchorDate, zoneId)
  const rows: string[][] = []

  rows.push(['FinMaint Monthly Collection Report'])
  rows.push(['Month', monthLabel])
  if (zoneName) rows.push(['Zone', zoneName])
  rows.push([])
  rows.push(['Month Total Due', String(monthTotalDue)])
  rows.push(['Month Total Received', String(monthTotalReceived)])
  rows.push([])

  for (const week of weeks) {
    rows.push([week.label, `Due: ${week.totalDue}`, `Received: ${week.totalReceived}`])
    rows.push(['Date', 'Opening', 'Due', 'Received', 'Closing'])
    for (const d of week.days) {
      rows.push([fmtDate(d.date), String(d.opening), String(d.due), String(d.received), String(d.closing)])
    }
    rows.push([])
  }

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  downloadBlob(csv, 'text/csv', `monthly-report-${anchorDate.slice(0, 7)}${zoneName ? `-${zoneName}` : ''}.csv`)
}

export function exportMonthlyPDF(db: DB, anchorDate: string, zoneId: string | null, zoneName: string | null) {
  const { monthLabel, weeks, monthTotalDue, monthTotalReceived } = buildMonthlyData(db, anchorDate, zoneId)

  const weekBlocks = weeks.map(week => {
    const dayRows = week.days.map(d =>
      `<tr><td>${fmtDate(d.date)}</td><td>${inr(d.opening)}</td><td>${inr(d.due)}</td><td>${inr(d.received)}</td><td>${inr(d.closing)}</td></tr>`
    ).join('')
    return `
      <div class="week-block">
        <div class="week-header">
          <span>${week.label}</span>
          <span class="week-totals">Due: ${inr(week.totalDue)} &nbsp;·&nbsp; Received: ${inr(week.totalReceived)}</span>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Opening</th><th>Due</th><th>Received</th><th>Closing</th></tr></thead>
          <tbody>${dayRows}</tbody>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Monthly Report ${monthLabel}</title>
  <style>
    body { font-family: sans-serif; padding: 24px; color: #111; }
    h1 { color: #065f46; font-size: 20px; margin-bottom: 4px; }
    .meta { color: #555; margin-bottom: 16px; font-size: 13px; }
    .summary { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-bottom: 24px; }
    .tile { border: 1px solid #d1fae5; border-radius: 8px; padding: 12px; text-align: center; background: #f0fdf4; }
    .tile .label { font-size: 11px; color: #065f46; text-transform: uppercase; letter-spacing: .5px; }
    .tile .value { font-size: 20px; font-weight: 700; color: #047857; margin-top: 4px; }
    .week-block { margin-bottom: 22px; page-break-inside: avoid; }
    .week-header { display: flex; justify-content: space-between; align-items: center;
      background: #065f46; color: #fff; padding: 8px 12px; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 600; }
    .week-totals { font-weight: 400; font-size: 12px; opacity: 0.9; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #d1fae5; color: #065f46; padding: 6px 10px; text-align: left; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 8px; } }
  </style></head><body>
  <h1>FinMaint — Monthly Collection Report</h1>
  <div class="meta">Month: ${monthLabel}${zoneName ? ` &nbsp;|&nbsp; Zone: ${zoneName}` : ''}</div>
  <div class="summary">
    <div class="tile"><div class="label">Month Total Due</div><div class="value">${inr(monthTotalDue)}</div></div>
    <div class="tile"><div class="label">Month Total Received</div><div class="value">${inr(monthTotalReceived)}</div></div>
  </div>
  ${weekBlocks}
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`

  openPrintWindow(html)
}

// ──────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function openPrintWindow(html: string) {
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
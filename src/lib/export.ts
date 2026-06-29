import type { LedgerResult } from './logic'
import { fmtDate, inr } from './format'

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
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `collection-${date}${zoneName ? `-${zoneName}` : ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
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

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

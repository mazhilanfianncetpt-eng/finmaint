function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db2 = new Date(b + 'T00:00:00')
  return Math.round((db2.getTime() - da.getTime()) / 86400000)
}

module.exports = { todayISO, addDays, daysBetween }

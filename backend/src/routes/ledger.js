const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { ledgerFor } = require('../lib/logic')
const { addDays } = require('../lib/format')

const router = express.Router()
router.use(requireAuth)

// GET /api/ledger?date=YYYY-MM-DD&zoneId=optional
router.get('/', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const zoneId = req.query.zoneId || null

    const settings = await prisma.settings.findUnique({ where: { id: 'settings' } })
    if (!settings) return res.status(400).json({ error: 'Settings not initialised — run the seed first' })

    const borrowers = await prisma.borrower.findMany()
    const result = ledgerFor(settings, borrowers, date, zoneId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET /api/ledger/preview?fromDate=YYYY-MM-DD&days=7
router.get('/preview', async (req, res, next) => {
  try {
    const fromDate = req.query.fromDate || new Date().toISOString().slice(0, 10)
    const days = Math.min(Number(req.query.days || 7), 90) // cap at 90 days

    const settings = await prisma.settings.findUnique({ where: { id: 'settings' } })
    if (!settings) return res.status(400).json({ error: 'Settings not initialised — run the seed first' })

    const borrowers = await prisma.borrower.findMany()

    const result = []
    for (let i = 0; i < days; i++) {
      const d = addDays(fromDate, i)
      const l = ledgerFor(settings, borrowers, d, null)
      result.push({
        date: d,
        opening: l.opening,
        totalCollection: l.totalCollection,
        totalReceived: l.totalReceived,
        closing: l.closing,
      })
    }
    res.json(result)
  } catch (err) {
    next(err)
  }
})

module.exports = router

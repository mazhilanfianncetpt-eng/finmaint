const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'settings' } })
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const { initialOpeningBalance, initialOpeningDate } = req.body || {}
    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      update: {
        ...(initialOpeningBalance !== undefined ? { initialOpeningBalance: Number(initialOpeningBalance) } : {}),
        ...(initialOpeningDate ? { initialOpeningDate } : {}),
      },
      create: {
        id: 'settings',
        initialOpeningBalance: Number(initialOpeningBalance ?? 0),
        initialOpeningDate: initialOpeningDate || new Date().toISOString().slice(0, 10),
      },
    })
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

module.exports = router

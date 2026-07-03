const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({ orderBy: { name: 'asc' } })
    res.json(zones)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name is required' })
    const zone = await prisma.zone.create({ data: { name } })
    res.status(201).json(zone)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body || {}
    if (!name) return res.status(400).json({ error: 'name is required' })
    const zone = await prisma.zone.update({ where: { id: req.params.id }, data: { name } })
    res.json(zone)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.zone.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router

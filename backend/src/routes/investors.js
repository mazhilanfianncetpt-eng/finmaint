const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res, next) => {
  try {
    const investors = await prisma.investor.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(investors)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const required = ['name', 'phone', 'amount', 'payMode', 'investedOn']
    for (const f of required) {
      if (!body[f] && body[f] !== 0) return res.status(400).json({ error: `${f} is required` })
    }
    const investor = await prisma.investor.create({
      data: {
        name: body.name,
        phone: body.phone,
        amount: Number(body.amount),
        payMode: body.payMode,
        investedOn: body.investedOn,
        withdrawnOn: body.withdrawnOn || null,
      },
    })
    res.status(201).json(investor)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const body = req.body || {}
    const data = {}
    for (const f of ['name', 'phone', 'payMode', 'investedOn', 'withdrawnOn']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (body.amount !== undefined) data.amount = Number(body.amount)
    const investor = await prisma.investor.update({ where: { id: req.params.id }, data })
    res.json(investor)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.investor.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router

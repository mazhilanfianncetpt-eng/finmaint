const express = require('express')
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { calcEndDate, nextDueDate, overdueCount, paymentHistory } = require('../lib/logic')

const router = express.Router()
router.use(requireAuth)

function withComputed(b) {
  return {
    ...b,
    nextDueDate: nextDueDate(b),
    overdueCount: overdueCount(b),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { zoneId } = req.query
    const borrowers = await prisma.borrower.findMany({
      where: zoneId ? { zoneId: String(zoneId) } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    res.json(borrowers.map(withComputed))
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const b = await prisma.borrower.findUnique({ where: { id: req.params.id } })
    if (!b) return res.status(404).json({ error: 'Borrower not found' })
    res.json({ ...withComputed(b), history: paymentHistory(b) })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const required = ['name', 'shopName', 'address', 'phone', 'amount', 'frequency', 'startDate', 'dueCount', 'payMode', 'installmentAmount']
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        return res.status(400).json({ error: `${f} is required` })
      }
    }

    const endDate = body.endDate || calcEndDate(body.startDate, Number(body.dueCount), body.frequency)
    const totalPayable = body.totalPayable ?? Number(body.installmentAmount) * Number(body.dueCount)

    // Generate next borrowerCode using the DB sequence (guaranteed unique & atomic)
    const seqResult = await prisma.$queryRaw`SELECT nextval('borrower_code_seq') AS next_val`
    const nextVal = Number(seqResult[0].next_val)
    const borrowerCode = String(nextVal).padStart(2, '0')

    const borrower = await prisma.borrower.create({
      data: {
        borrowerCode,
        name: body.name,
        shopName: body.shopName,
        address: body.address,
        zoneId: body.zoneId || null,
        phone: body.phone,
        amount: Number(body.amount),
        amountPaidToBorrower: Number(body.amountPaidToBorrower ?? body.amount),
        totalPayable: Number(totalPayable),
        frequency: body.frequency,
        startDate: body.startDate,
        dueCount: Number(body.dueCount),
        endDate,
        payMode: body.payMode,
        installmentAmount: Number(body.installmentAmount),
        paidInstallments: [],
      },
    })
    res.status(201).json(withComputed(borrower))
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const body = req.body || {}
    const data = {}
    for (const f of ['name', 'shopName', 'address', 'zoneId', 'phone', 'frequency', 'startDate', 'endDate', 'payMode']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    for (const f of ['amount', 'amountPaidToBorrower', 'totalPayable', 'dueCount', 'installmentAmount']) {
      if (body[f] !== undefined) data[f] = Number(body[f])
    }
    const borrower = await prisma.borrower.update({ where: { id: req.params.id }, data })
    res.json(withComputed(borrower))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.borrower.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Toggle a specific due date as paid/unpaid — this is the "collection" action
router.post('/:id/toggle-payment', async (req, res, next) => {
  try {
    const { date } = req.body || {}
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })

    const b = await prisma.borrower.findUnique({ where: { id: req.params.id } })
    if (!b) return res.status(404).json({ error: 'Borrower not found' })

    const isPaid = b.paidInstallments.includes(date)
    const paidInstallments = isPaid
      ? b.paidInstallments.filter(d => d !== date)
      : [...b.paidInstallments, date]

    const updated = await prisma.borrower.update({
      where: { id: req.params.id },
      data: { paidInstallments },
    })
    res.json(withComputed(updated))
  } catch (err) {
    next(err)
  }
})

module.exports = router

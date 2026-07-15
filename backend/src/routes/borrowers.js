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
        payments: [],
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

    const result = await prisma.borrower.aggregate({ _max: { borrowerCode: true } })
    const maxCode = result._max.borrowerCode ? Number(result._max.borrowerCode) : 0
    await prisma.$executeRaw`SELECT setval('borrower_code_seq', ${maxCode})`

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/toggle-payment', async (req, res, next) => {
  try {
    const { dueDate, paidOn } = req.body || {}
    if (!dueDate) return res.status(400).json({ error: 'dueDate is required (YYYY-MM-DD)' })

    const b = await prisma.borrower.findUnique({ where: { id: req.params.id } })
    if (!b) return res.status(404).json({ error: 'Borrower not found' })

    const payments = Array.isArray(b.payments) ? b.payments : []
    const existingIdx = payments.findIndex(p => p.dueDate === dueDate)

    let updatedPayments
    if (existingIdx !== -1) {
      // Already paid — remove it (unmark)
      updatedPayments = payments.filter((_, i) => i !== existingIdx)
    } else {
      // Mark as paid — record dueDate + paidOn (defaults to today)
      updatedPayments = [...payments, { dueDate, paidOn: paidOn || new Date().toISOString().slice(0, 10) }]
    }

    const updated = await prisma.borrower.update({
      where: { id: req.params.id },
      data: { payments: updatedPayments },
    })
    res.json(withComputed(updated))
  } catch (err) {
    next(err)
  }
})

module.exports = router
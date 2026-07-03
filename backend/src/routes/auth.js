const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { requireAuth, JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(401).json({ error: 'Invalid username or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' })

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role })
  } catch (err) {
    next(err)
  }
})

// Admin-only: list all users
router.get('/users', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

// Admin-only: create new login (collector or admin)
router.post('/users', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    const { username, password, name, role } = req.body || {}
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'username, password and name are required' })
    }
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, password: hash, name, role: role === 'admin' ? 'admin' : 'collector' },
    })
    res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role })
  } catch (err) {
    next(err)
  }
})

// Admin-only: delete a user (cannot delete yourself)
router.delete('/users/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

module.exports = router

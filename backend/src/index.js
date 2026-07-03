require('dotenv').config()

const express = require('express')
const cors = require('cors')
const prisma = require('./lib/prisma')

const app = express()

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,        // e.g. https://your-app.vercel.app
  'http://localhost:5173',          // Vite dev
  'http://localhost:4173',          // Vite preview
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(express.json())

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, db: 'connected', time: new Date().toISOString() })
  } catch (e) {
    res.status(503).json({ ok: false, db: 'error', detail: e.message })
  }
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/zones',     require('./routes/zones'))
app.use('/api/borrowers', require('./routes/borrowers'))
app.use('/api/investors', require('./routes/investors'))
app.use('/api/settings',  require('./routes/settings'))
app.use('/api/ledger',    require('./routes/ledger'))

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.path} not found` })
})

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err)
  const prismaErrors = {
    P2002: 'Unique constraint failed',
    P2025: 'Record not found',
    P2003: 'Foreign key constraint failed',
  }
  if (err.code?.startsWith('P')) {
    return res.status(400).json({ error: prismaErrors[err.code] || err.message })
  }
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message })
  }
  res.status(500).json({ error: 'Internal server error', detail: err.message })
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000
const server = app.listen(PORT, () => console.log(`FinMaint API on :${PORT}`))

const shutdown = async (signal) => {
  console.log(`\n${signal} — shutting down`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
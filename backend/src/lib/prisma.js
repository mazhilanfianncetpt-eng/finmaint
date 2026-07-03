const { PrismaClient } = require('@prisma/client')

// Neon's serverless Postgres uses WebSockets for the pooler connection.
// The `ws` package provides a Node.js WebSocket implementation.
// Without this, you may see "bufferutil" or WebSocket-related errors.
//
// PrismaClient automatically picks up the WS implementation when the
// `ws` package is installed — no manual registration needed for Prisma 5/6.

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  })
}

// Reuse a single instance in development to avoid "too many connections"
// errors from hot-reloading (nodemon). In production, a new process =
// a new client, which is fine.
let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  if (!global.__prisma) {
    global.__prisma = createPrismaClient()
  }
  prisma = global.__prisma
}

module.exports = prisma

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', password: await bcrypt.hash('admin123', 10), name: 'Admin', role: 'admin' } })
  await prisma.user.upsert({ where: { username: 'collector' }, update: {}, create: { username: 'collector', password: await bcrypt.hash('collector123', 10), name: 'Collector', role: 'collector' } })
  await prisma.settings.upsert({ where: { id: 'settings' }, update: {}, create: { id: 'settings', initialOpeningBalance: 0, initialOpeningDate: today } })
  console.log('✅ Seed done. admin/admin123 | collector/collector123')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

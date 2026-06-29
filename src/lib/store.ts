export type Role = 'admin' | 'collector'
export type PayMode = 'cash' | 'upi' | 'bank' | 'online'
export type Frequency = 'daily' | 'weekly'

export interface User {
  id: string
  role: Role
  username: string
  password: string
  name: string
}

export interface Zone {
  id: string
  name: string
}

export interface Borrower {
  id: string
  name: string
  shopName: string
  address: string
  zoneId: string | null
  phone: string
  amount: number
  amountPaidToBorrower: number
  totalPayable: number
  frequency: Frequency
  startDate: string // ISO
  dueCount: number
  endDate: string // ISO
  payMode: PayMode
  installmentAmount: number
  paidInstallments: string[] // ISO dates
}

export interface Investor {
  id: string
  name: string
  phone: string
  amount: number
  payMode: PayMode
  investedOn: string
  withdrawnOn: string | null
}

export interface Settings {
  initialOpeningBalance: number
  initialOpeningDate: string // ISO
  zones: Zone[]
}

export interface DB {
  users: User[]
  borrowers: Borrower[]
  investors: Investor[]
  settings: Settings
  session: { userId: string } | null
}

const KEY = 'finmaint.db.v3'

const SEED_USERS: User[] = [
  { id: 'u1', role: 'admin', username: 'admin', password: 'admin123', name: 'Admin' },
  { id: 'u2', role: 'collector', username: 'collector', password: 'collector123', name: 'Collector' },
]

const DEFAULT_DB: DB = {
  users: SEED_USERS,
  borrowers: [],
  investors: [],
  settings: {
    initialOpeningBalance: 0,
    initialOpeningDate: new Date().toISOString().slice(0, 10),
    zones: [],
  },
  session: null,
}

function migrate(db: DB): DB {
  // Ensure zones exist
  if (!db.settings.zones) db.settings.zones = []
  // Ensure zoneId on borrowers
  db.borrowers = (db.borrowers || []).map(b => ({
    ...b,
    zoneId: b.zoneId ?? null,
    paidInstallments: b.paidInstallments || [],
    amountPaidToBorrower: b.amountPaidToBorrower ?? b.amount,
  }))
  // Ensure seed users always present
  for (const seed of SEED_USERS) {
    if (!db.users.find(u => u.id === seed.id)) db.users.unshift(seed)
  }
  return db
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw) as DB)
  } catch {}
  return { ...DEFAULT_DB }
}

let _cache: DB = load()
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

export function write(updater: (db: DB) => DB) {
  _cache = updater({ ..._cache })
  localStorage.setItem(KEY, JSON.stringify(_cache))
  notify()
}

export function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getSnapshot(): DB {
  return _cache
}

import { useSyncExternalStore } from 'react'

export function useDBSnap(): DB {
  return useSyncExternalStore(subscribe, getSnapshot)
}

// Auth helpers
export function login(username: string, password: string): boolean {
  const db = getSnapshot()
  const user = db.users.find(u => u.username === username && u.password === password)
  if (!user) return false
  write(d => ({ ...d, session: { userId: user.id } }))
  return true
}

export function logout() {
  write(d => ({ ...d, session: null }))
}

export function currentUser(db: DB): User | null {
  if (!db.session) return null
  return db.users.find(u => u.id === db.session!.userId) ?? null
}

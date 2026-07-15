// ─── Shared, database-backed store ────────────────────────────────────────────
// This used to be a localStorage-only store (each device had its own data).
// It now mirrors server state fetched from the FinMaint API (see ./api.ts),
// so every device/user sees the same shared data. The public shape (DB,
// useDBSnap, currentUser, etc.) is kept as close as possible to the old
// store so route components need minimal changes.

import { useSyncExternalStore } from 'react'
import {
  apiAuth, apiZones, apiBorrowers, apiInvestors, apiSettings,
  setToken, getToken,
} from './api'
import type {
  ApiUser, ApiZone, ApiBorrower, ApiInvestor,
} from './api'

export type Role = 'admin' | 'collector'
export type PayMode = 'cash' | 'upi' | 'bank' | 'online'
export type Frequency = 'daily' | 'weekly'
export type Theme = 'dark' | 'light'

// Re-export the API types under the names the rest of the app already uses.
export type User = ApiUser
export type Zone = ApiZone
export type Borrower = ApiBorrower
export type Investor = ApiInvestor

export interface Settings {
  initialOpeningBalance: number
  initialOpeningDate: string
  zones: Zone[]
}

export interface DB {
  borrowers: Borrower[]
  investors: Investor[]
  settings: Settings
  session: { token: string; user: User } | null
  theme: Theme
  loading: boolean       // true while borrowers/investors/settings/zones are (re)loading
  authChecked: boolean   // true once we've verified whether a saved token is still valid
  error: string | null
}

// ─── Theme is the one thing we keep purely local — it's a per-device UI
// preference, not shared app data, so there's no need to round-trip it
// through the server. ─────────────────────────────────────────────────────────
const THEME_KEY = 'finmaint.theme'

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {}
  return 'dark'
}

function defaultSettings(): Settings {
  return {
    initialOpeningBalance: 0,
    initialOpeningDate: new Date().toISOString().slice(0, 10),
    zones: [],
  }
}

let _cache: DB = {
  borrowers: [],
  investors: [],
  settings: defaultSettings(),
  session: null,
  theme: loadTheme(),
  loading: false,
  authChecked: false,
  error: null,
}

const listeners = new Set<() => void>()
function notify() {
  for (const l of listeners) l()
}

function setState(patch: Partial<DB>) {
  _cache = { ..._cache, ...patch }
  notify()
}

export function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getSnapshot(): DB {
  return _cache
}

export function useDBSnap(): DB {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function currentUser(db: DB): User | null {
  return db.session?.user ?? null
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
}

export function toggleTheme() {
  const next: Theme = _cache.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem(THEME_KEY, next) } catch {}
  applyTheme(next)
  setState({ theme: next })
}

// ─── Loading shared data from the API ──────────────────────────────────────────
async function loadAll() {
  setState({ loading: true, error: null })
  try {
    const [zones, borrowers, investors, settings] = await Promise.all([
      apiZones.list(),
      apiBorrowers.list(),
      apiInvestors.list(),
      apiSettings.get(),
    ])
    setState({
      borrowers,
      investors,
      settings: {
        initialOpeningBalance: settings.initialOpeningBalance,
        initialOpeningDate: settings.initialOpeningDate,
        zones,
      },
      loading: false,
    })
  } catch (err) {
    setState({
      loading: false,
      error: err instanceof Error ? err.message : 'Failed to load data from the server',
    })
  }
}

/** Re-fetch everything from the server (e.g. a manual refresh / retry button). */
export function refreshAll() {
  return loadAll()
}

// ─── Auth / session bootstrap ───────────────────────────────────────────────────
/** Call once on app start. Restores a saved session (if any) then loads data. */
export async function init() {
  applyTheme(_cache.theme)
  const token = getToken()
  if (!token) {
    setState({ authChecked: true })
    return
  }
  try {
    const user = await apiAuth.me()
    setState({ session: { token, user }, authChecked: true })
    await loadAll()
  } catch {
    // Saved token is invalid/expired — clear it and fall back to the login screen.
    setToken(null)
    setState({ session: null, authChecked: true })
  }
}

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const { token, user } = await apiAuth.login(username, password)
    setToken(token)
    setState({ session: { token, user } })
    await loadAll()
    return true
  } catch {
    return false
  }
}

export function logout() {
  setToken(null)
  setState({
    session: null,
    borrowers: [],
    investors: [],
    settings: defaultSettings(),
  })
}

// ─── Zones ──────────────────────────────────────────────────────────────────────
export async function addZone(name: string) {
  const zone = await apiZones.create(name)
  setState({
    settings: {
      ..._cache.settings,
      zones: [..._cache.settings.zones, zone].sort((a, b) => a.name.localeCompare(b.name)),
    },
  })
}

export async function updateZone(id: string, name: string) {
  const zone = await apiZones.update(id, name)
  setState({
    settings: {
      ..._cache.settings,
      zones: _cache.settings.zones.map(z => (z.id === id ? zone : z)),
    },
  })
}

export async function deleteZone(id: string) {
  await apiZones.delete(id)
  setState({
    settings: {
      ..._cache.settings,
      zones: _cache.settings.zones.filter(z => z.id !== id),
    },
    // The backend already nulls zoneId on related borrowers (onDelete: SetNull),
    // mirror that locally so the UI updates instantly without a re-fetch.
    borrowers: _cache.borrowers.map(b => (b.zoneId === id ? { ...b, zoneId: null } : b)),
  })
}

// ─── Borrowers ──────────────────────────────────────────────────────────────────
export async function addBorrower(data: Parameters<typeof apiBorrowers.create>[0]) {
  const b = await apiBorrowers.create(data)
  setState({ borrowers: [b, ..._cache.borrowers] })
}

export async function updateBorrower(id: string, patch: Partial<Borrower>) {
  const b = await apiBorrowers.update(id, patch)
  setState({ borrowers: _cache.borrowers.map(bw => (bw.id === id ? b : bw)) })
}

export async function deleteBorrower(id: string) {
  await apiBorrowers.delete(id)
  setState({ borrowers: _cache.borrowers.filter(b => b.id !== id) })
}

// Only this function changes:
export async function togglePayment(id: string, dueDate: string, paidOn: string) {
  const updated = await apiBorrowers.togglePayment(id, dueDate, paidOn)
  setState({ borrowers: _cache.borrowers.map(b => (b.id === id ? updated : b)) })
}

// ─── Investors ──────────────────────────────────────────────────────────────────
export async function addInvestor(data: Parameters<typeof apiInvestors.create>[0]) {
  const inv = await apiInvestors.create(data)
  setState({ investors: [inv, ..._cache.investors] })
}

export async function updateInvestor(id: string, patch: Partial<Investor>) {
  const inv = await apiInvestors.update(id, patch)
  setState({ investors: _cache.investors.map(i => (i.id === id ? inv : i)) })
}

export async function deleteInvestor(id: string) {
  await apiInvestors.delete(id)
  setState({ investors: _cache.investors.filter(i => i.id !== id) })
}

// ─── Settings ───────────────────────────────────────────────────────────────────
export async function updateSettings(patch: { initialOpeningBalance?: number; initialOpeningDate?: string }) {
  const s = await apiSettings.update(patch)
  setState({
    settings: {
      ..._cache.settings,
      initialOpeningBalance: s.initialOpeningBalance,
      initialOpeningDate: s.initialOpeningDate,
    },
  })
}

// ─── API client ──────────────────────────────────────────────────────────────
// Reads VITE_API_URL from .env (e.g. http://localhost:4000/api)

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api'

let _token: string | null = localStorage.getItem('finmaint.token')

export function setToken(t: string | null) {
  _token = t
  if (t) localStorage.setItem('finmaint.token', t)
  else localStorage.removeItem('finmaint.token')
}

export function getToken() {
  return _token
}

async function req<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  })

  let data: unknown
  try { data = await res.json() } catch { data = null }

  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const apiAuth = {
  login: (username: string, password: string) =>
    req<{ token: string; user: ApiUser }>('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => req<ApiUser>('/auth/me'),
}

// ─── Zones ────────────────────────────────────────────────────────────────────
export const apiZones = {
  list: () => req<ApiZone[]>('/zones'),
  create: (name: string) => req<ApiZone>('/zones', { method: 'POST', body: { name } }),
  update: (id: string, name: string) => req<ApiZone>(`/zones/${id}`, { method: 'PUT', body: { name } }),
  delete: (id: string) => req<{ ok: boolean }>(`/zones/${id}`, { method: 'DELETE' }),
}

// ─── Borrowers ────────────────────────────────────────────────────────────────
export const apiBorrowers = {
  list: (zoneId?: string | null) =>
    req<ApiBorrower[]>(`/borrowers${zoneId ? `?zoneId=${zoneId}` : ''}`),
  get: (id: string) => req<ApiBorrower>(`/borrowers/${id}`),
  create: (body: Omit<ApiBorrower, 'id' | 'createdAt' | 'updatedAt' | 'nextDueDate' | 'overdueCount'>) =>
    req<ApiBorrower>('/borrowers', { method: 'POST', body }),
  update: (id: string, body: Partial<ApiBorrower>) =>
    req<ApiBorrower>(`/borrowers/${id}`, { method: 'PUT', body }),
  delete: (id: string) => req<{ ok: boolean }>(`/borrowers/${id}`, { method: 'DELETE' }),
  togglePayment: (id: string, date: string) =>
    req<ApiBorrower>(`/borrowers/${id}/toggle-payment`, { method: 'POST', body: { date } }),
}

// ─── Investors ────────────────────────────────────────────────────────────────
export const apiInvestors = {
  list: () => req<ApiInvestor[]>('/investors'),
  create: (body: Omit<ApiInvestor, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<ApiInvestor>('/investors', { method: 'POST', body }),
  update: (id: string, body: Partial<ApiInvestor>) =>
    req<ApiInvestor>(`/investors/${id}`, { method: 'PUT', body }),
  delete: (id: string) => req<{ ok: boolean }>(`/investors/${id}`, { method: 'DELETE' }),
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export const apiSettings = {
  get: () => req<ApiSettings>('/settings'),
  update: (body: Partial<ApiSettings>) => req<ApiSettings>('/settings', { method: 'PUT', body }),
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export const apiLedger = {
  get: (date: string, zoneId?: string | null) =>
    req<ApiLedger>(`/ledger?date=${date}${zoneId ? `&zoneId=${zoneId}` : ''}`),
  preview: (fromDate: string, days: number) =>
    req<ApiPreviewDay[]>(`/ledger/preview?fromDate=${fromDate}&days=${days}`),
}

// ─── API types ────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string
  username: string
  name: string
  role: 'admin' | 'collector'
}

export interface ApiZone {
  id: string
  name: string
  createdAt: string
}

export interface ApiBorrower {
  id: string
  borrowerCode?: string
  name: string
  shopName: string
  address: string
  zoneId: string | null
  phone: string
  amount: number
  amountPaidToBorrower: number
  totalPayable: number
  frequency: 'daily' | 'weekly'
  startDate: string
  dueCount: number
  endDate: string
  payMode: 'cash' | 'upi' | 'bank' | 'online'
  installmentAmount: number
  paidInstallments: string[]
  // computed by backend
  nextDueDate?: string | null
  overdueCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface ApiInvestor {
  id: string
  name: string
  phone: string
  amount: number
  payMode: 'cash' | 'upi' | 'bank' | 'online'
  investedOn: string
  withdrawnOn: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ApiSettings {
  id: string
  initialOpeningBalance: number
  initialOpeningDate: string
}

export interface ApiLedger {
  date: string
  zoneId: string | null
  opening: number
  totalCollection: number
  totalReceived: number
  closing: number
  paidBorrowers: ApiBorrower[]
  unpaidBorrowers: ApiBorrower[]
}

export interface ApiPreviewDay {
  date: string
  opening: number
  totalCollection: number
  totalReceived: number
  closing: number
}

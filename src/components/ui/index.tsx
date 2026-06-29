import React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOut, Home, BookOpen, Users, TrendingUp, MapPin } from 'lucide-react'
import { logout, useDBSnap, currentUser } from '../../lib/store'

// ─── PhoneFrame ──────────────────────────────────────────────────────────────
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-950 flex items-center justify-center p-4">
      {/* Mobile: full bleed. Desktop: phone frame */}
      <div
        className="phone-shell relative w-full max-w-[390px] rounded-[2.5rem] overflow-hidden"
        style={{ height: 'min(844px, 100dvh)', minHeight: '600px' }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden bg-[var(--color-bg)] flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────────────
export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate()
  const db = useDBSnap()
  const user = currentUser(db)

  function handleLogout() {
    logout()
    navigate({ to: '/' })
  }

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--color-border)] shrink-0">
      <div>
        <h1 className="text-base font-semibold text-[var(--color-text)] leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <span className="text-xs text-[var(--color-muted)] hidden sm:block">{user.name}</span>
        )}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-800)] transition-fast"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/lender/', label: 'Home', icon: Home },
  { to: '/lender/collection', label: 'Collection', icon: BookOpen },
  { to: '/lender/borrowers', label: 'Borrowers', icon: Users },
  { to: '/lender/investors', label: 'Investors', icon: TrendingUp },
] as const

export function BottomNav() {
  const state = useRouterState()
  const path = state.location.pathname

  return (
    <nav className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] pb-safe">
      <div className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = path === to || (to !== '/lender/' && path.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-fast ${
                active
                  ? 'text-[var(--color-primary-400)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text-soft)]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'gold' | 'danger' | 'muted'
}) {
  const valColor =
    accent === 'gold'
      ? 'text-[var(--color-gold-400)]'
      : accent === 'danger'
      ? 'text-[var(--color-danger-400)]'
      : accent === 'muted'
      ? 'text-[var(--color-muted)]'
      : 'text-[var(--color-primary-400)]'

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-3 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-medium">{label}</span>
      <span className={`text-lg font-bold num ${valColor} leading-tight`}>{value}</span>
      {sub && <span className="text-[10px] text-[var(--color-muted)]">{sub}</span>}
    </div>
  )
}

// ─── Sheet (bottom sheet) ─────────────────────────────────────────────────────
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-surface-900)] rounded-t-3xl border-t border-[var(--color-border)] max-h-[85%] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <h2 className="font-semibold text-[var(--color-text)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] text-2xl leading-none hover:text-[var(--color-text)]">×</button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Input / Select / Label helpers ──────────────────────────────────────────
export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1">{children}</label>
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary-600)] transition-fast ${props.className ?? ''}`}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary-600)] transition-fast ${props.className ?? ''}`}
    />
  )
}

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-fast disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  const variants = {
    primary: 'bg-[var(--color-primary-700)] hover:bg-[var(--color-primary-600)] text-white',
    secondary: 'bg-[var(--color-surface-700)] hover:bg-[var(--color-surface-600)] text-[var(--color-text)]',
    danger: 'bg-[var(--color-danger-500)] hover:bg-red-400 text-white',
    ghost: 'hover:bg-[var(--color-surface-800)] text-[var(--color-text-soft)]',
  }
  return (
    <button {...props} className={`${base} ${sizes[size]} ${variants[variant]} ${props.className ?? ''}`}>
      {children}
    </button>
  )
}

// ─── ZoneLink ────────────────────────────────────────────────────────────────
export function ZoneLink() {
  return (
    <Link to="/lender/zones" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-400)] hover:text-[var(--color-primary-300)] transition-fast">
      <MapPin size={12} /> Manage Zones
    </Link>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────
export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-[var(--color-muted)] text-sm">{text}</p>
    </div>
  )
}

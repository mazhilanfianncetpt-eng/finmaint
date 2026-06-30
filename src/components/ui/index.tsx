import React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOut, Home, BookOpen, Users, TrendingUp, MapPin, Sun, Moon } from 'lucide-react'
import { logout, useDBSnap, currentUser, toggleTheme } from '../../lib/store'

// ─── PhoneFrame ───────────────────────────────────────────────────────────────
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div
        className="phone-shell relative w-full max-w-[390px] rounded-[2.5rem] overflow-hidden"
        style={{ height: 'min(844px, 100dvh)', minHeight: '600px' }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
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
  const isDark = db.theme === 'dark'

  function handleLogout() {
    logout()
    navigate({ to: '/' })
  }

  return (
    <header
      className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div>
        <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        {user && (
          <span className="text-xs hidden sm:block mr-1" style={{ color: 'var(--color-muted)' }}>{user.name}</span>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-fast"
          style={{ color: 'var(--color-muted)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl transition-fast"
          style={{ color: 'var(--color-muted)' }}
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────
type NavTo = '/lender' | '/lender/collection' | '/lender/borrowers' | '/lender/investors'

const NAV_ITEMS: { to: NavTo; label: string; icon: React.ElementType }[] = [
  { to: '/lender', label: 'Home', icon: Home },
  { to: '/lender/collection', label: 'Collection', icon: BookOpen },
  { to: '/lender/borrowers', label: 'Borrowers', icon: Users },
  { to: '/lender/investors', label: 'Investors', icon: TrendingUp },
]

export function BottomNav() {
  const state = useRouterState()
  const path = state.location.pathname

  return (
    <nav className="shrink-0 pb-safe" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)' }}>
      <div className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = path === to || path === to + '/' || (to !== '/lender' && path.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-fast"
              style={{ color: active ? 'var(--color-primary-500)' : 'var(--color-muted)' }}
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
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: 'gold' | 'danger' | 'muted'
}) {
  const valColor =
    accent === 'gold' ? 'var(--color-gold-400)'
    : accent === 'danger' ? 'var(--color-danger-400)'
    : accent === 'muted' ? 'var(--color-muted)'
    : 'var(--color-primary-500)'

  return (
    <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span className="text-lg font-bold num leading-tight" style={{ color: valColor }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{sub}</span>}
    </div>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
export function Sheet({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-t-3xl max-h-[85%] flex flex-col"
        style={{ backgroundColor: 'var(--color-card)', borderTop: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none transition-fast" style={{ color: 'var(--color-muted)' }}>×</button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string
  confirmLabel?: string; cancelLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl p-5 w-full max-w-xs shadow-2xl"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--color-text)' }}>{title}</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>{message}</p>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={onCancel} className="flex-1">{cancelLabel}</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} className="flex-1">{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Form primitives ──────────────────────────────────────────────────────────
export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>{children}</label>
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-fast ${className ?? ''}`}
      style={{
        backgroundColor: 'var(--color-surface-800)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        ...style,
      }}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, className, ...rest } = props
  return (
    <select
      {...rest}
      className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-fast ${className ?? ''}`}
      style={{
        backgroundColor: 'var(--color-surface-800)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        ...style,
      }}
    />
  )
}

export function Btn({
  children, variant = 'primary', size = 'md', style, className, ...props
}: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-fast disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  const variantStyles: Record<string, React.CSSProperties> = {
    primary:   { backgroundColor: 'var(--color-primary-800)', color: '#fff' },
    secondary: { backgroundColor: 'var(--color-surface-700)', color: 'var(--color-text)' },
    danger:    { backgroundColor: '#ef4444', color: '#fff' },
    ghost:     { backgroundColor: 'transparent', color: 'var(--color-text-soft)' },
  }
  return (
    <button
      {...props}
      className={`${base} ${sizes[size]} ${className ?? ''}`}
      style={{ ...variantStyles[variant], ...style }}
    >
      {children}
    </button>
  )
}

// ─── ZoneLink ─────────────────────────────────────────────────────────────────
export function ZoneLink() {
  return (
    <Link to="/lender/zones" className="inline-flex items-center gap-1 text-xs transition-fast" style={{ color: 'var(--color-primary-500)' }}>
      <MapPin size={12} /> Manage Zones
    </Link>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────
export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{text}</p>
    </div>
  )
}

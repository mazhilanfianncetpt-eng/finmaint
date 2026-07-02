import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  LogOut, Home, BookOpen, Users, TrendingUp, MapPin,
  Sun, Moon, Menu, X, ChevronRight,
} from 'lucide-react'
import { logout, useDBSnap, currentUser, toggleTheme } from '../../lib/store'

// ─── PhoneFrame ─────────────────────────────────────────────────────────────
// On mobile: renders a phone-shell decorator.
// On tablet/desktop: transparent full-width wrapper (CSS handles it).
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="phone-frame-wrapper min-h-dvh flex items-center justify-center p-4 md:p-0"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="phone-shell relative w-full max-w-[390px] md:max-w-none rounded-[2.5rem] md:rounded-none overflow-hidden"
        style={{
          height: 'min(844px, 100dvh)',
          minHeight: '600px',
        } as React.CSSProperties}
      >
        <div
          className="h-full overflow-y-auto overflow-x-hidden flex flex-col"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── AppShell (tablet/desktop layout with sidebar) ────────────────────────────
// Wraps the full authenticated app with sidebar + top bar.
interface AppShellProps {
  children: React.ReactNode
}

type NavTo = '/lender' | '/lender/collection' | '/lender/borrowers' | '/lender/investors'

const NAV_ITEMS: { to: NavTo; label: string; icon: React.ElementType }[] = [
  { to: '/lender',            label: 'Dashboard',  icon: Home },
  { to: '/lender/collection', label: 'Collection', icon: BookOpen },
  { to: '/lender/borrowers',  label: 'Borrowers',  icon: Users },
  { to: '/lender/investors',  label: 'Investors',  icon: TrendingUp },
]

export function AppShell({ children }: AppShellProps) {
  const db = useDBSnap()
  const user = currentUser(db)
  const navigate = useNavigate()
  const state = useRouterState()
  const path = state.location.pathname
  const isDark = db.theme === 'dark'
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [path])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function handleLogout() {
    logout()
    navigate({ to: '/' })
  }

  const isNavActive = useCallback((to: NavTo) => {
    if (to === '/lender') return path === '/lender' || path === '/lender/'
    return path.startsWith(to)
  }, [path])

  return (
    <div className="app-layout">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div
          className="px-5 pt-6 pb-5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shrink-0"
              style={{ backgroundColor: 'var(--color-gold-500)', color: 'var(--color-primary-950)' }}
            >
              ₹
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: 'var(--color-text)' }}>
                Mazhilan Finance
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Loan Tracking</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4" aria-label="Sidebar navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isNavActive(to)
            return (
              <Link
                key={to}
                to={to}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                <span>{label}</span>
              </Link>
            )
          })}

          <div className="mx-3 my-2" style={{ borderTop: '1px solid var(--color-border)' }} />

          <Link
            to="/lender/zones"
            className={`sidebar-nav-item ${path.startsWith('/lender/zones') ? 'active' : ''}`}
            aria-current={path.startsWith('/lender/zones') ? 'page' : undefined}
          >
            <MapPin size={18} strokeWidth={path.startsWith('/lender/zones') ? 2.5 : 1.8} />
            <span>Zones</span>
          </Link>
        </nav>

        {/* User footer */}
        <div
          className="px-4 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                {user?.name}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>
                {user?.role}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl transition-fast"
                style={{ color: 'var(--color-muted)' }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl transition-fast"
                style={{ color: 'var(--color-muted)' }}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="app-main" id="main-content">
        {/* Top bar (mobile only / secondary desktop) */}
        <div className="app-topbar flex items-center justify-between px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-xl transition-fast"
              style={{ color: 'var(--color-muted)' }}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                style={{ backgroundColor: 'var(--color-gold-500)', color: 'var(--color-primary-950)' }}
              >
                ₹
              </div>
              <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                Mazhilan Finance
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-fast"
              style={{ color: 'var(--color-muted)' }}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl transition-fast"
              style={{ color: 'var(--color-muted)' }}
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Bottom nav (mobile only) */}
        <nav
          className="bottom-nav shrink-0 pb-safe"
          style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)' }}
          aria-label="Bottom navigation"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isNavActive(to)
            return (
              <Link
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-fast"
                style={{ color: active ? 'var(--color-primary-500)' : 'var(--color-muted)' }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>
      </main>
    </div>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────────────
// Used as a section header inside pages (title + optional subtitle).
// On mobile shows logout/theme. On desktop those live in the sidebar.
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
      className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div>
        <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>
        )}
      </div>
      {/* These controls are only needed when NOT in AppShell (e.g. login page) */}
      <div className="flex items-center gap-1 md:hidden">
        {user && (
          <span className="text-xs hidden sm:block mr-1" style={{ color: 'var(--color-muted)' }}>
            {user.name}
          </span>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-fast"
          style={{ color: 'var(--color-muted)' }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl transition-fast"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────
// Kept for backward compatibility; AppShell renders the actual nav.
// This is only used by the old lender.tsx layout wrapper.
type BottomNavTo = '/lender' | '/lender/collection' | '/lender/borrowers' | '/lender/investors'

const BOTTOM_NAV_ITEMS: { to: BottomNavTo; label: string; icon: React.ElementType }[] = [
  { to: '/lender',            label: 'Home',       icon: Home },
  { to: '/lender/collection', label: 'Collection', icon: BookOpen },
  { to: '/lender/borrowers',  label: 'Borrowers',  icon: Users },
  { to: '/lender/investors',  label: 'Investors',  icon: TrendingUp },
]

export function BottomNav() {
  const state = useRouterState()
  const path = state.location.pathname

  return (
    <nav
      className="bottom-nav shrink-0 pb-safe"
      style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)' }}
      aria-label="Bottom navigation"
    >
      {BOTTOM_NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const active =
          to === '/lender'
            ? path === '/lender' || path === '/lender/'
            : path.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-fast"
            style={{ color: active ? 'var(--color-primary-500)' : 'var(--color-muted)' }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
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
    accent === 'gold'   ? 'var(--color-gold-400)'
    : accent === 'danger' ? 'var(--color-danger-400)'
    : accent === 'muted'  ? 'var(--color-muted)'
    : 'var(--color-primary-500)'

  return (
    <div
      className="rounded-2xl p-3 flex flex-col gap-1 card"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <span
        className="text-[10px] uppercase tracking-wider font-medium"
        style={{ color: 'var(--color-muted)' }}
      >
        {label}
      </span>
      <span className="text-lg font-bold num leading-tight" style={{ color: valColor }}>
        {value}
      </span>
      {sub && (
        <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{sub}</span>
      )}
    </div>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
export function Sheet({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sheet-container"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative sheet-panel rounded-t-3xl md:rounded-2xl max-h-[90dvh] md:max-h-[85vh] flex flex-col w-full md:w-auto md:min-w-[420px] md:m-auto"
        style={{ backgroundColor: 'var(--color-card)', borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-fast"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 flex-1">
          {children}
        </div>
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
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div
      className="dialog-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className="absolute inset-0"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative rounded-2xl p-5 w-full max-w-sm shadow-2xl"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <h3
          id="confirm-title"
          className="font-semibold text-base mb-1"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
        <p
          id="confirm-message"
          className="text-sm mb-5"
          style={{ color: 'var(--color-muted)' }}
        >
          {message}
        </p>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Btn>
          <Btn variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Form primitives ──────────────────────────────────────────────────────────
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-xs font-medium mb-1.5"
      style={{ color: 'var(--color-text-soft)' }}
    >
      {children}
    </label>
  )
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
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-fast disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  const variantStyles: Record<string, React.CSSProperties> = {
    primary:   { backgroundColor: 'var(--color-primary-800)', color: '#fff' },
    secondary: { backgroundColor: 'var(--color-surface-700)', color: 'var(--color-text)' },
    danger:    { backgroundColor: '#ef4444', color: '#fff' },
    ghost:     { backgroundColor: 'transparent', color: 'var(--color-text-soft)',
                 border: '1px solid var(--color-border)' },
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
    <Link
      to="/lender/zones"
      className="inline-flex items-center gap-1 text-xs transition-fast"
      style={{ color: 'var(--color-primary-500)' }}
    >
      <MapPin size={12} /> Manage Zones
    </Link>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────
export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ backgroundColor: 'var(--color-surface-800)' }}
      >
        <ChevronRight size={20} style={{ color: 'var(--color-muted)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{text}</p>
    </div>
  )
}

// ─── PageHeader (desktop section heading) ─────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wider font-semibold mb-2"
      style={{ color: 'var(--color-muted)' }}
    >
      {children}
    </p>
  )
}

// ─── MetricTile ───────────────────────────────────────────────────────────────
export function MetricTile({
  label, value, sub, variant = 'default',
}: {
  label: string
  value: string
  sub?: string
  variant?: 'green' | 'gold' | 'default' | 'surface' | 'closing-good' | 'closing-bad'
}) {
  const styles: Record<string, React.CSSProperties> = {
    green:         { backgroundColor: 'var(--color-primary-800)', color: '#fff' },
    gold:          { backgroundColor: 'var(--color-gold-500)', color: '#1a0800' },
    default:       { backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' },
    surface:       { backgroundColor: 'var(--color-surface-800)', color: 'var(--color-text)' },
    'closing-good': { backgroundColor: 'var(--color-primary-800)', color: '#fff' },
    'closing-bad':  { backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' },
  }
  const labelColor: Record<string, string> = {
    green: 'rgba(255,255,255,0.7)', gold: 'rgba(0,0,0,0.55)',
    default: 'var(--color-muted)', surface: 'var(--color-muted)',
    'closing-good': 'rgba(255,255,255,0.7)', 'closing-bad': 'rgba(248,113,113,0.7)',
  }
  const subColor: Record<string, string> = {
    green: 'rgba(255,255,255,0.55)', gold: 'rgba(0,0,0,0.4)',
    default: 'var(--color-muted)', surface: 'var(--color-muted)',
    'closing-good': 'rgba(255,255,255,0.55)', 'closing-bad': 'rgba(248,113,113,0.55)',
  }

  return (
    <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={styles[variant]}>
      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: labelColor[variant] }}>
        {label}
      </p>
      <p className="text-lg font-bold num leading-tight">{value}</p>
      {sub && <p className="text-[10px]" style={{ color: subColor[variant] }}>{sub}</p>}
    </div>
  )
}
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { login, useDBSnap, currentUser, toggleTheme } from '../lib/store'
import { Sun, Moon } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  const db = useDBSnap()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const isDark = db.theme === 'dark'

  useEffect(() => {
    if (currentUser(db)) navigate({ to: '/lender' })
  }, [db, navigate])

  function fill(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (login(username, password)) {
      navigate({ to: '/lender' })
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-xl transition-fast z-10"
        style={{ color: 'var(--color-muted)', backgroundColor: 'var(--color-surface-800)', border: '1px solid var(--color-border)' }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="w-full" style={{ maxWidth: '420px' }}>
        {/* Card */}
        <div
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          {/* Header */}
          <div
            className="px-6 pt-10 pb-8"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-950) 100%)' }}
          >
            <div className="inline-flex items-center gap-2.5 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base"
                style={{ backgroundColor: 'var(--color-gold-500)', color: 'var(--color-primary-950)' }}
              >
                ₹
              </div>
              <span
                className="font-bold text-xl tracking-tight"
                style={{ color: 'var(--color-gold-300)' }}
              >
                Mazhilan Finance
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              Loan Tracking<br />Made Simple
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-primary-300)' }}>
              Borrowers · Collectors · Ledger
            </p>
          </div>

          {/* Form area */}
          <div className="px-6 py-7 flex flex-col gap-5">
            {/* Quick fill chips */}
            <div>
              <p
                className="text-xs uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-muted)' }}
              >
                Quick sign-in
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fill('admin', 'admin123')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-fast"
                  style={{
                    border: '1px solid var(--color-primary-700)',
                    color: 'var(--color-primary-500)',
                    backgroundColor: 'transparent',
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-wider block"
                    style={{ color: 'var(--color-primary-600)' }}
                  >
                    Admin
                  </span>
                  admin / admin123
                </button>
                <button
                  type="button"
                  onClick={() => fill('collector', 'collector123')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-fast"
                  style={{
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-soft)',
                    backgroundColor: 'transparent',
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-wider block"
                    style={{ color: 'var(--color-gold-500)' }}
                  >
                    Collector
                  </span>
                  collector / collector123
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--color-text-soft)' }}
                  htmlFor="login-username"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-fast"
                  style={{
                    backgroundColor: 'var(--color-surface-800)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--color-text-soft)' }}
                  htmlFor="login-password"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-fast"
                  style={{
                    backgroundColor: 'var(--color-surface-800)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              {error && (
                <p
                  className="text-sm rounded-xl px-3 py-2"
                  role="alert"
                  style={{
                    color: '#f87171',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full font-semibold py-3 rounded-xl transition-fast mt-1 text-white"
                style={{ backgroundColor: 'var(--color-primary-700)' }}
              >
                Sign In
              </button>
            </form>

            <div
              className="pt-4"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
                FinMaint v1.0 · Single device · Two seeded logins
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
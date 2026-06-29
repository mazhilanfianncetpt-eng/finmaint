import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { login, useDBSnap, currentUser } from '../lib/store'
import { PhoneFrame } from '../components/ui'

export const Route = createFileRoute('/')({
  component: LoginPage,
})

function LoginPage() {
  const db = useDBSnap()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser(db)) navigate({ to: '/lender/' })
  }, [db, navigate])

  function fill(u: string, p: string) {
    setUsername(u); setPassword(p); setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (login(username, password)) {
      navigate({ to: '/lender/' })
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full">
        {/* Header brand */}
        <div className="bg-[var(--color-primary-900)] px-6 pt-12 pb-10 shrink-0">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-gold-500)] flex items-center justify-center text-[var(--color-primary-950)] font-black text-sm">₹</div>
            <span className="text-[var(--color-gold-300)] font-bold text-lg tracking-tight">FinMaint</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">Loan Tracking<br />Made Simple</h1>
          <p className="text-[var(--color-primary-300)] text-sm mt-2">Borrowers · Collectors · Ledger</p>
        </div>

        {/* Form */}
        <div className="flex-1 px-6 py-8 flex flex-col gap-6">
          {/* Quick fill chips */}
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-2 uppercase tracking-wider">Quick sign-in</p>
            <div className="flex gap-2">
              <button
                onClick={() => fill('admin', 'admin123')}
                className="flex-1 py-2 rounded-xl border border-[var(--color-primary-700)] text-[var(--color-primary-400)] text-sm font-medium hover:bg-[var(--color-primary-950)] transition-fast"
              >
                Admin
              </button>
              <button
                onClick={() => fill('collector', 'collector123')}
                className="flex-1 py-2 rounded-xl border border-[var(--color-surface-600)] text-[var(--color-text-soft)] text-sm font-medium hover:bg-[var(--color-surface-800)] transition-fast"
              >
                Collector
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="admin"
                autoComplete="username"
                className="w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary-600)] transition-fast"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-soft)] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-primary-600)] transition-fast"
              />
            </div>

            {error && (
              <p className="text-[var(--color-danger-400)] text-sm bg-red-950/50 border border-red-800 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[var(--color-primary-700)] hover:bg-[var(--color-primary-600)] text-white font-semibold py-3 rounded-xl transition-fast mt-1"
            >
              Sign In
            </button>
          </form>

          <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-center text-[var(--color-muted)]">FinMaint v1.0 · Local storage only</p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useDBSnap, currentUser } from '../lib/store'
import { AppShell } from '../components/ui'

export const Route = createFileRoute('/lender')({
  component: LenderLayout,
})

function LenderLayout() {
  const db = useDBSnap()
  const navigate = useNavigate()
  const user = currentUser(db)

  useEffect(() => {
    if (db.authChecked && !user) navigate({ to: '/' })
  }, [db.authChecked, user, navigate])

  // Still verifying a saved session — avoid a flash-redirect to the login page.
  if (!db.authChecked) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center text-sm"
        style={{ color: 'var(--color-muted)', backgroundColor: 'var(--color-bg)' }}
      >
        Loading…
      </div>
    )
  }

  if (!user) return null

  return (
    <AppShell>
      {db.error && (
        <div
          className="mx-4 mt-4 rounded-xl px-4 py-3 text-sm"
          role="alert"
          style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {db.error}
        </div>
      )}
      <Outlet />
    </AppShell>
  )
}
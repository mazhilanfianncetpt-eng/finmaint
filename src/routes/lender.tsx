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
    if (!user) navigate({ to: '/' })
  }, [user, navigate])

  if (!user) return null

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useDBSnap, currentUser } from '../lib/store'
import { PhoneFrame, BottomNav } from '../components/ui'

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
    <PhoneFrame>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto relative">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </PhoneFrame>
  )
}

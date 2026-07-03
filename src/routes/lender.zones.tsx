import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, currentUser, addZone as apiAddZone, updateZone, deleteZone as apiDeleteZone } from '../lib/store'
import { AppHeader, Label, Input, Btn, Empty, PageHeader } from '../components/ui'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export const Route = createFileRoute('/lender/zones')({
  component: ZonesPage,
})

function ZonesPage() {
  const db      = useDBSnap()
  const user    = currentUser(db)
  const isAdmin = user?.role === 'admin'
  const zones   = db.settings.zones

  const [newName, setNewName]   = useState('')
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError]       = useState('')

  async function addZone() {
    const n = newName.trim()
    if (!n) { setError('Zone name is required.'); return }
    if (zones.find(z => z.name.toLowerCase() === n.toLowerCase())) {
      setError('Zone already exists.')
      return
    }
    try {
      await apiAddZone(n)
      setNewName('')
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add zone.')
    }
  }

  async function saveEdit(id: string) {
    const n = editName.trim()
    if (!n) return
    try {
      await updateZone(id, n)
      setEditId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update zone.')
    }
  }

  async function deleteZone(id: string) {
    try {
      await apiDeleteZone(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete zone.')
    }
  }

  const borrowerCount = (zoneId: string) =>
    db.borrowers.filter(b => b.zoneId === zoneId).length

  return (
    <div className="flex flex-col min-h-full">
      {/* Mobile header */}
      <div className="md:hidden">
        <AppHeader title="Zones" subtitle="Manage collection areas" />
      </div>

      <div className="page-pad flex flex-col gap-4">
        {/* Desktop heading */}
        <div className="hidden md:block">
          <PageHeader
            title="Zones"
            subtitle="Manage collection areas and organise borrowers"
          />
        </div>

        {/* Permission notice */}
        {!isAdmin && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            role="status"
            style={{
              color: 'var(--color-warning-400)',
              backgroundColor: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            Only admins can manage zones.
          </div>
        )}

        {/* Add zone input */}
        {isAdmin && (
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              placeholder="New zone name (e.g. HAL)"
              onKeyDown={e => e.key === 'Enter' && addZone()}
              aria-label="New zone name"
            />
            <Btn onClick={addZone} size="sm" aria-label="Add zone">
              <Plus size={14} aria-hidden="true" />
            </Btn>
          </div>
        )}

        {error && (
          <p
            className="text-xs"
            role="alert"
            style={{ color: 'var(--color-danger-400)' }}
          >
            {error}
          </p>
        )}

        {/* Zones list */}
        {zones.length === 0 ? (
          <Empty text="No zones yet. Add zones to organise borrowers by area." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map(z => {
              const count    = borrowerCount(z.id)
              const isEditing = editId === z.id
              return (
                <div
                  key={z.id}
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  {isEditing ? (
                    <>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 py-1.5"
                        onKeyDown={e => e.key === 'Enter' && saveEdit(z.id)}
                        autoFocus
                        aria-label={`Edit zone name: ${z.name}`}
                      />
                      <button
                        onClick={() => saveEdit(z.id)}
                        style={{ color: 'var(--color-primary-500)' }}
                        aria-label="Save"
                      >
                        <Check size={16} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        style={{ color: 'var(--color-muted)' }}
                        aria-label="Cancel"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
                          {z.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                          {count} borrower{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditId(z.id); setEditName(z.name) }}
                            className="p-1.5 transition-fast rounded-lg"
                            style={{ color: 'var(--color-muted)' }}
                            aria-label={`Edit ${z.name}`}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => deleteZone(z.id)}
                            className="p-1.5 transition-fast rounded-lg"
                            style={{ color: 'var(--color-muted)' }}
                            aria-label={`Delete ${z.name}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
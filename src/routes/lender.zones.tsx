import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useDBSnap, currentUser, write } from '../lib/store'
import { AppHeader, Label, Input, Btn, Empty } from '../components/ui'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export const Route = createFileRoute('/lender/zones')({
  component: ZonesPage,
})

function ZonesPage() {
  const db = useDBSnap()
  const user = currentUser(db)
  const isAdmin = user?.role === 'admin'
  const zones = db.settings.zones

  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  function addZone() {
    const n = newName.trim()
    if (!n) { setError('Zone name is required.'); return }
    if (zones.find(z => z.name.toLowerCase() === n.toLowerCase())) { setError('Zone already exists.'); return }
    write(d => ({ ...d, settings: { ...d.settings, zones: [...d.settings.zones, { id: `z_${Date.now()}`, name: n }] } }))
    setNewName('')
    setError('')
  }

  function saveEdit(id: string) {
    const n = editName.trim()
    if (!n) return
    write(d => ({ ...d, settings: { ...d.settings, zones: d.settings.zones.map(z => z.id === id ? { ...z, name: n } : z) } }))
    setEditId(null)
  }

  function deleteZone(id: string) {
    write(d => ({
      ...d,
      settings: { ...d.settings, zones: d.settings.zones.filter(z => z.id !== id) },
      borrowers: d.borrowers.map(b => b.zoneId === id ? { ...b, zoneId: null } : b),
    }))
  }

  const borrowerCountByZone = (zoneId: string) => db.borrowers.filter(b => b.zoneId === zoneId).length

  return (
    <div className="flex flex-col">
      <AppHeader title="Zones" subtitle="Manage collection zones" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {!isAdmin && (
          <p className="text-[var(--color-warning-400)] text-sm bg-amber-950/30 border border-amber-800 rounded-xl px-4 py-3">
            Only admins can manage zones.
          </p>
        )}

        {isAdmin && (
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              placeholder="New zone name (e.g. HAL, Whitefield)"
              onKeyDown={e => e.key === 'Enter' && addZone()}
            />
            <Btn onClick={addZone} size="sm">
              <Plus size={14} />
            </Btn>
          </div>
        )}

        {error && <p className="text-[var(--color-danger-400)] text-xs">{error}</p>}

        {zones.length === 0 ? (
          <Empty text="No zones yet. Add a zone to organize borrowers by area." />
        ) : (
          <div className="flex flex-col gap-2">
            {zones.map(z => {
              const count = borrowerCountByZone(z.id)
              const isEditing = editId === z.id
              return (
                <div key={z.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl px-4 py-3 flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 py-1.5"
                        onKeyDown={e => e.key === 'Enter' && saveEdit(z.id)}
                        autoFocus
                      />
                      <button onClick={() => saveEdit(z.id)} className="text-[var(--color-primary-400)]"><Check size={16} /></button>
                      <button onClick={() => setEditId(null)} className="text-[var(--color-muted)]"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)] text-sm">{z.name}</p>
                        <p className="text-xs text-[var(--color-muted)]">{count} borrower{count !== 1 ? 's' : ''}</p>
                      </div>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditId(z.id); setEditName(z.name) }}
                            className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-fast"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteZone(z.id)}
                            className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-danger-400)] transition-fast"
                          >
                            <Trash2 size={14} />
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

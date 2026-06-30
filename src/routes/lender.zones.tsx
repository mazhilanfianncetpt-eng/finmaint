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
    setNewName(''); setError('')
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

  const borrowerCount = (zoneId: string) => db.borrowers.filter(b => b.zoneId === zoneId).length

  return (
    <div className="flex flex-col">
      <AppHeader title="Zones" subtitle="Manage collection areas" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {!isAdmin && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ color: 'var(--color-warning-400)', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            Only admins can manage zones.
          </p>
        )}

        {isAdmin && (
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              placeholder="New zone name (e.g. HAL)"
              onKeyDown={e => e.key === 'Enter' && addZone()}
            />
            <Btn onClick={addZone} size="sm"><Plus size={14} /></Btn>
          </div>
        )}

        {error && <p className="text-xs" style={{ color: 'var(--color-danger-400)' }}>{error}</p>}

        {zones.length === 0 ? (
          <Empty text="No zones yet. Add zones to organise borrowers by area." />
        ) : (
          <div className="flex flex-col gap-2">
            {zones.map(z => {
              const count = borrowerCount(z.id)
              const isEditing = editId === z.id
              return (
                <div key={z.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  {isEditing ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-1 py-1.5" onKeyDown={e => e.key === 'Enter' && saveEdit(z.id)} autoFocus />
                      <button onClick={() => saveEdit(z.id)} style={{ color: 'var(--color-primary-500)' }}><Check size={16} /></button>
                      <button onClick={() => setEditId(null)} style={{ color: 'var(--color-muted)' }}><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{z.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{count} borrower{count !== 1 ? 's' : ''}</p>
                      </div>
                      {isAdmin && (
                        <>
                          <button onClick={() => { setEditId(z.id); setEditName(z.name) }}
                            className="p-1.5 transition-fast" style={{ color: 'var(--color-muted)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteZone(z.id)}
                            className="p-1.5 transition-fast" style={{ color: 'var(--color-muted)' }}>
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

/**
 * TodoPage — Real-Time Collaborative Todo List
 *
 * Features:
 * - Shared todos synced in real-time across all users via useQuery/useMutations
 * - Live presence avatars showing who's online (via usePresence hook)
 * - "Who is editing" indicator on each task (editingBy field)
 * - Last-write-wins conflict resolution using updatedAt timestamps
 * - Priority system (normal / high)
 * - Filters: All / Active / Done / High Priority
 * - Clean Light UI with ample whitespace and diffuse shadows
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutations, useUser } from '@spaces/sdk/storage'
import { Plus, Flag, Trash2, Check, Pencil, X } from 'lucide-react'
import { cn, Button, Input } from '../components/ui'
import { useToast } from '../components/ui'
import { PRIORITY, FILTER, type Filter } from '../constants'
import { usePresence } from '../hooks'
import type { PresenceUser } from '../hooks/usePresence'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TodoData {
  text: string
  done: boolean
  priority: string
  addedBy: string
  editingBy: string | null
  editingByName: string | null
  updatedAt: string
}

// ─── Presence Avatars ─────────────────────────────────────────────────────────

function PresenceAvatars({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      {users.map((u, i) => (
        <div
          key={u.userId}
          title={u.isMe ? `${u.name} (you)` : u.name}
          className="relative flex-shrink-0"
          style={{ zIndex: users.length - i }}
        >
          {/* Avatar bubble */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white select-none border-2 border-white"
            style={{ backgroundColor: u.color, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          >
            {u.name.charAt(0).toUpperCase()}
          </div>
          {/* Online dot */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-400"
          />
        </div>
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {users.length === 1 ? '1 online' : `${users.length} online`}
      </span>
    </div>
  )
}

// ─── Filter Pills ─────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  active: 'Active',
  done: 'Done',
  high: 'High Priority',
}

function FilterPills({
  active,
  onChange,
  counts,
}: {
  active: Filter
  onChange: (f: Filter) => void
  counts: Record<Filter, number>
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
            active === f
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          {FILTER_LABELS[f]}
          <span
            className={cn(
              'ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]',
              active === f ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
            )}
          >
            {counts[f]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex-1 min-w-[80px] rounded-xl px-4 py-3 bg-white border border-border"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

// ─── Todo Item ────────────────────────────────────────────────────────────────

interface TodoItemProps {
  record: { recordId: string; data: TodoData; createdBy: string }
  currentUserId: string | undefined
  onToggle: (recordId: string, data: TodoData) => void
  onDelete: (recordId: string) => void
  onStartEdit: (recordId: string, data: TodoData) => void
  onSaveEdit: (recordId: string, data: TodoData, newText: string) => void
  onCancelEdit: (recordId: string, data: TodoData) => void
  onTogglePriority: (recordId: string, data: TodoData) => void
  editingId: string | null
  editText: string
  setEditText: (v: string) => void
}

function TodoItem({
  record,
  currentUserId,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTogglePriority,
  editingId,
  editText,
  setEditText,
}: TodoItemProps) {
  const data = record.data
  const isEditing = editingId === record.recordId
  const someoneElseEditing =
    data.editingBy && data.editingBy !== currentUserId
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when we start editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSaveEdit(record.recordId, data, editText)
    if (e.key === 'Escape') onCancelEdit(record.recordId, data)
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150',
        data.done
          ? 'bg-muted/40 border-border opacity-60'
          : someoneElseEditing
            ? 'bg-amber-50 border-amber-100'
            : 'bg-white border-border hover:border-primary/20',
      )}
      style={{ boxShadow: data.done ? 'none' : 'var(--shadow-card)' }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(record.recordId, data)}
        className={cn(
          'mt-0.5 w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-150',
          data.done
            ? 'bg-primary border-primary'
            : 'border-border hover:border-primary'
        )}
        aria-label={data.done ? 'Mark as active' : 'Mark as done'}
      >
        {data.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSaveEdit(record.recordId, data, editText)}
            className="h-7 text-sm px-2 py-1 rounded-lg"
          />
        ) : (
          <span
            className={cn(
              'text-sm leading-relaxed break-words',
              data.done ? 'line-through text-muted-foreground' : 'text-foreground'
            )}
            onDoubleClick={() => onStartEdit(record.recordId, data)}
          >
            {data.text}
          </span>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {data.addedBy && (
            <span className="text-[11px] text-muted-foreground">
              by {data.addedBy}
            </span>
          )}
          {someoneElseEditing && (
            <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {data.editingByName ?? 'Someone'} is editing…
            </span>
          )}
          {isEditing && (
            <span className="text-[11px] text-primary font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Editing…
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {/* Priority toggle */}
        <button
          onClick={() => onTogglePriority(record.recordId, data)}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150',
            data.priority === PRIORITY.HIGH
              ? 'text-red-500 bg-red-50 hover:bg-red-100'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          title={data.priority === PRIORITY.HIGH ? 'Remove high priority' : 'Set high priority'}
        >
          <Flag className="w-3.5 h-3.5" />
        </button>

        {/* Edit */}
        {!isEditing && !someoneElseEditing && (
          <button
            onClick={() => onStartEdit(record.recordId, data)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Save/Cancel when editing */}
        {isEditing && (
          <>
            <button
              onClick={() => onSaveEdit(record.recordId, data, editText)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors duration-150"
              title="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onCancelEdit(record.recordId, data)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(record.recordId)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── TodoPage ─────────────────────────────────────────────────────────────────

export default function TodoPage() {
  const { user } = useUser()
  const { records: rawRecords, status, error } = useQuery('todos', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { create, put, remove } = useMutations('todos')
  const { toast } = useToast()

  const { onlineUsers } = usePresence()

  const [newText, setNewText] = useState('')
  const [filter, setFilter] = useState<Filter>(FILTER.ALL)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const newInputRef = useRef<HTMLInputElement>(null)

  // Cast records to typed shape
  const records = rawRecords as Array<{ recordId: string; data: TodoData; createdBy: string }>

  // ── Filter Logic ────────────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    switch (filter) {
      case FILTER.ACTIVE:
        return records.filter(r => !r.data.done)
      case FILTER.DONE:
        return records.filter(r => r.data.done)
      case FILTER.HIGH:
        return records.filter(r => r.data.priority === PRIORITY.HIGH)
      default:
        return records
    }
  }, [records, filter])

  const counts: Record<Filter, number> = useMemo(() => ({
    all: records.length,
    active: records.filter(r => !r.data.done).length,
    done: records.filter(r => r.data.done).length,
    high: records.filter(r => r.data.priority === PRIORITY.HIGH).length,
  }), [records])

  // ── Add Task ─────────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const text = newText.trim()
    if (!text) return

    setIsAdding(true)
    setNewText('')
    try {
      await create({
        text,
        done: false,
        priority: PRIORITY.NORMAL,
        addedBy: user?.name ?? 'Unknown',
        editingBy: null,
        editingByName: null,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      toast.error('Failed to add task')
      setNewText(text) // restore
    } finally {
      setIsAdding(false)
    }
  }, [newText, user?.name, create, toast])

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  // ── Toggle Done ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback((recordId: string, data: TodoData) => {
    put(recordId, { ...data, done: !data.done, updatedAt: new Date().toISOString() })
  }, [put])

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((recordId: string) => {
    remove(recordId)
  }, [remove])

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleStartEdit = useCallback((recordId: string, data: TodoData) => {
    // Don't steal someone else's edit
    if (data.editingBy && data.editingBy !== user?.id) return

    setEditingId(recordId)
    setEditText(data.text)
    // Claim the lock
    put(recordId, {
      ...data,
      editingBy: user?.id ?? null,
      editingByName: user?.name ?? null,
    })
  }, [user?.id, user?.name, put])

  const handleSaveEdit = useCallback((recordId: string, data: TodoData, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      handleCancelEdit(recordId, data)
      return
    }

    // Check for last-write-wins: if updatedAt changed since we started,
    // someone else wrote while we were editing — notify the user
    const savedAt = data.updatedAt
    const now = new Date().toISOString()
    if (savedAt > (editStartedAt.current ?? '')) {
      toast.info(`Task was updated by ${data.editingByName ?? 'another user'} — your changes are saved`)
    }

    put(recordId, {
      ...data,
      text: trimmed,
      editingBy: null,
      editingByName: null,
      updatedAt: now,
    })

    setEditingId(null)
    setEditText('')
    editStartedAt.current = null
  }, [put, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelEdit = useCallback((recordId: string, data: TodoData) => {
    put(recordId, { ...data, editingBy: null, editingByName: null })
    setEditingId(null)
    setEditText('')
    editStartedAt.current = null
  }, [put])

  // Track when we started editing for last-write-wins detection
  const editStartedAt = useRef<string | null>(null)
  useEffect(() => {
    if (editingId) {
      editStartedAt.current = new Date().toISOString()
    }
  }, [editingId])

  // ── Priority Toggle ──────────────────────────────────────────────────────────

  const handleTogglePriority = useCallback((recordId: string, data: TodoData) => {
    put(recordId, {
      ...data,
      priority: data.priority === PRIORITY.HIGH ? PRIORITY.NORMAL : PRIORITY.HIGH,
      updatedAt: new Date().toISOString(),
    })
  }, [put])

  // ── Loading / Error States ───────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading todos…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium text-destructive mb-1">Failed to load</p>
          <p className="text-xs text-muted-foreground">{error ?? 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalDone = records.filter(r => r.data.done).length
  const totalActive = records.filter(r => !r.data.done).length

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Team Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Shared in real-time with your team
            </p>
          </div>
          <PresenceAvatars users={onlineUsers} />
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-8">
          <StatCard label="Total" value={records.length} />
          <StatCard label="Active" value={totalActive} />
          <StatCard label="Done" value={totalDone} />
          <StatCard label="Online" value={onlineUsers.length} />
        </div>

        {/* ── Add Task Input ─────────────────────────────────────────────────── */}
        <div
          className="flex gap-2 mb-6 p-2 bg-white rounded-2xl border border-border"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <Input
            ref={newInputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Add a new task… (Enter to add)"
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm h-10 flex-1 px-3"
          />
          <Button
            onClick={handleAdd}
            disabled={!newText.trim() || isAdding}
            loading={isAdding}
            size="sm"
            className="rounded-xl px-4 h-10 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {/* ── Filter Pills ───────────────────────────────────────────────────── */}
        <div className="mb-5">
          <FilterPills active={filter} onChange={setFilter} counts={counts} />
        </div>

        {/* ── Todo List ──────────────────────────────────────────────────────── */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {filter === FILTER.ALL ? 'No tasks yet' : `No ${FILTER_LABELS[filter].toLowerCase()} tasks`}
            </p>
            <p className="text-xs text-muted-foreground">
              {filter === FILTER.ALL
                ? 'Add your first task above to get started'
                : 'Try a different filter to see tasks'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.map(record => (
              <TodoItem
                key={record.recordId}
                record={record}
                currentUserId={user?.id}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onTogglePriority={handleTogglePriority}
                editingId={editingId}
                editText={editText}
                setEditText={setEditText}
              />
            ))}
          </div>
        )}

        {/* ── Footer hint ────────────────────────────────────────────────────── */}
        {records.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            Double-click any task to edit · Changes sync instantly for everyone
          </p>
        )}
      </div>
    </div>
  )
}

# Storage System

---

## Unified Storage API

Use `useStorage` for all persistent state. The `scope` option determines who can see the data:

```jsx
useStorage(key, defaultValue, { scope: 'global' | 'user' })
```

| Scope | Who Sees It | Use For |
|-------|-------------|---------|
| `'global'` (default) | EVERYBODY | Multiplayer games, collaborative docs, chat, shared state |
| `'user'` | NOBODY (private) | Personal notes, preferences, drafts, private data |

---

### Examples

```jsx
// Shared with everybody (default) - for multiplayer/collab
const [gameState, setGameState] = useStorage('game', {})
const [messages, setMessages] = useStorage('chat', [])

// Private to current user only
const [myNotes, setMyNotes] = useStorage('notes', '', { scope: 'user' })
const [myPrefs, setMyPrefs] = useStorage('prefs', {}, { scope: 'user' })
```

---

## File Storage

Use `useFiles` for file-system-like storage. Same scope options:

```jsx
useFiles(basePath, { scope: 'global' | 'user' })
```

```jsx
// Shared documents (visible to all users)
const files = useFiles('docs/')

// Private files (only visible to current user)
const myFiles = useFiles('notes/', { scope: 'user' })
```

**API:**
- `files.read(path)` — read file content (returns string or null)
- `files.write(path, content)` — write file content
- `files.delete(path)` — delete file or folder
- `files.exists(path)` — check if file exists
- `files.list(path)` — list items in folder (folders end with `/`)
- `files.ready` — boolean, true once storage is loaded

---

## Backwards Compatibility

These aliases work but prefer `useStorage` for new code:

```jsx
// These are equivalent:
useGlobalStorage(key, default)  ===  useStorage(key, default, { scope: 'global' })
useUserStorage(key, default)    ===  useStorage(key, default, { scope: 'user' })
```

---

## Choosing the Right Scope

| Use Case | Scope | Example |
|----------|-------|---------|
| Multiplayer game | `'global'` | `useStorage('game-state', {})` |
| Shared task list | `'global'` | `useStorage('tasks', [])` |
| Chat messages | `'global'` | `useStorage('messages', [])` |
| Collaborative whiteboard | `'global'` | `useStorage('canvas', {})` |
| Personal notepad | `'user'` | `useStorage('notes', '', { scope: 'user' })` |
| User preferences | `'user'` | `useStorage('prefs', {}, { scope: 'user' })` |
| Draft content | `'user'` | `useStorage('draft', '', { scope: 'user' })` |

---

## Best Practices

### Updater Patterns
```jsx
// Direct updates
setTasks([...tasks, newTask])
setTasks(tasks.filter(t => t.id !== id))

// Functional updates (safer for concurrent changes)
setTasks(prev => [...(prev || []), newTask])
setStore(prev => ({ ...(prev || {}), [id]: newValue }))
```

### Key Namespacing
Use clear, stable, dotted keys: `domain.feature.subfeature`
```jsx
useStorage('f1.results.year', 2024)
useStorage('f1.bets.selections', {})
```

### Avoid Mutations
```jsx
// ❌ Bad: mutates array in place
tasks.sort((a, b) => a.date - b.date)

// ✅ Good: creates new sorted array
[...tasks].sort((a, b) => a.date - b.date)
```

---

## Widget Communication Patterns

**Global Storage (broadcast to all):**
- Calendar widget reads `useStorage('tasks', [])`
- Task Manager writes to the same key
- All widgets stay synchronized

**I/O Connections (point-to-point):**
- Search → Filter → Display pipeline
- Use `useInput/useOutput` for directed data flow

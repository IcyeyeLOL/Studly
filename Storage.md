# Storage System

Widgets store persistent data using the RecordRoom system. Define your data structure in `src/schemas.ts` and use hooks to read/write.

---

## Schema File

Create `src/schemas.ts` in the widget's `src/` directory when creating a widget:

```json
{
  "schemas": [
    {
      "name": "tasks",
      "fields": {
        "title": { "type": "string", "required": true },
        "status": { "type": "string", "required": true },
        "assignee": { "type": "string" }
      },
      "permissions": {
        "admin": { "read": true, "create": true, "update": true, "delete": true },
        "member": { "read": true, "create": true, "update": "own", "delete": "own" },
        "viewer": { "read": true, "create": false, "update": false, "delete": false }
      }
    }
  ]
}
```

---

## Field Types

| Type | Description |
|------|-------------|
| `string` | Text data |
| `number` | Numeric data |
| `boolean` | True/false |
| `object` | JSON object |
| `array` | JSON array |
| `yjs` | Real-time sync via Yjs — use `useYjsText` for text, `useYjsField` for structured data (Y.Map, Y.Array) |

**Field Options:**
- `required: true` — Field must be provided on create
- `default: value` — Enforced value on create (non-admin users cannot override)
- `userBound: true` — Field must equal current user ID (auto-set if omitted)
- `immutable: true` — Field cannot be changed after creation

**Schema Properties** (collection-level, alongside `fields` and `permissions`):
- `teamField: 'fieldName'` — Links collection to team membership; required for `"team"` permission
- `ownerField: 'fieldName'` — Identifies record owner; used by `"own"` permission
- `collaboratorsField: 'fieldName'` — Array field of user IDs; enables `"collaborator"` permission

---

## Permissions

### Roles

| Role | Typical Use |
|------|-------------|
| `admin` | Canvas owner, full access |
| `member` | Invited collaborators |
| `viewer` | Read-only access (public/shared) |
| `*` | Wildcard — applies to everyone |

### Permission Values

| Value | Meaning |
|-------|---------|
| `true` | Allowed for all records |
| `false` | Not allowed |
| `"own"` | Only records created by this user |
| `"unclaimed-or-own"` | Owner field is empty (unclaimed) OR matches user — for claimable records |
| `"team"` | Only if user is owner, collaborator, or member of the team in `teamField` |
| `"collaborator"` | Only if user is owner or in `collaboratorsField` array |
| `"access"` | Alias for `"team"` (most permissive built-in level) |

**Note:** `create` only accepts `true` or `false`. The string permission levels (`"own"`, `"team"`, etc.) only apply to `read`, `update`, and `delete`.

---

## Common Patterns

### Simple (everyone can do everything)
```json
{
  "name": "notes",
  "fields": {
    "content": { "type": "string", "required": true }
  },
  "permissions": {
    "*": { "read": true, "create": true, "update": true, "delete": true }
  }
}
```

### Task List (members edit their own)
```json
{
  "name": "tasks",
  "fields": {
    "title": { "type": "string", "required": true },
    "done": { "type": "boolean" }
  },
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": true, "create": true, "update": "own", "delete": "own" },
    "viewer": { "read": true, "create": false, "update": false, "delete": false }
  }
}
```

### Private Notes (only owner can see)
```json
{
  "name": "private-notes",
  "fields": {
    "content": { "type": "string", "required": true }
  },
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": "own", "create": true, "update": "own", "delete": "own" },
    "viewer": { "read": false, "create": false, "update": false, "delete": false }
  }
}
```

### Team-Scoped Data

Teams can be **open** (self-join) or **closed** (invite-only, the default). Both use `teamField` + `"team"` permission to restrict data to team members.

#### Joinable Rooms (open teams)
For game lobbies, chat channels, study groups — users discover a room, join themselves, then access team-scoped data.

Use a public `rooms` collection for discovery + a private data collection with `teamField`:

```json
{
  "name": "rooms",
  "fields": {
    "name": { "type": "string", "required": true },
    "teamId": { "type": "string", "required": true, "immutable": true },
    "createdBy": { "type": "string", "required": true, "immutable": true }
  },
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": true, "create": true, "update": "own", "delete": "own" }
  }
}
```
```json
{
  "name": "room-messages",
  "fields": {
    "teamId": { "type": "string", "required": true, "immutable": true },
    "text": { "type": "string", "required": true }
  },
  "teamField": "teamId",
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": "team", "create": true, "update": "own", "delete": "own" }
  }
}
```
Pattern: Creator calls `create(name, { isOpen: true })` via `useTeams()`, stores the returned `teamId` in a public `rooms` record. Other users read `rooms` to discover available groups, then call `addMember(teamId, user.id)` to self-join. Once joined, `"team"` permissions grant access to `room-messages`.

#### Invite-Only Teams (closed teams, the default)
Same `teamField` + `"team"` permission setup, but only the team owner or a room admin can call `addMember(teamId, userId)` to invite others. No public listing needed — membership is controlled.

```json
{
  "name": "team-docs",
  "fields": {
    "teamId": { "type": "string", "required": true, "immutable": true },
    "title": { "type": "string", "required": true }
  },
  "teamField": "teamId",
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": "team", "create": true, "update": "team", "delete": false },
    "viewer": { "read": "team", "create": false, "update": false, "delete": false }
  }
}
```
Pattern: The team creator calls `create(name)` via `useTeams()` (closed by default), then stores records with the `teamId`. Only the team owner or a room admin can call `addMember(teamId, userId)` to invite others. Regular users **cannot** self-join closed teams.

**Important:** `useTeams()` only returns teams the current user belongs to. It cannot be used for discovery — use a separate public collection for that.

### Admin-Only Settings
```json
{
  "name": "settings",
  "fields": {
    "key": { "type": "string", "required": true },
    "value": { "type": "string", "required": true }
  },
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": false, "create": false, "update": false, "delete": false },
    "viewer": { "read": false, "create": false, "update": false, "delete": false }
  }
}
```

### Collaborative Document (Yjs)
```json
{
  "name": "documents",
  "fields": {
    "title": { "type": "string", "required": true },
    "content": { "type": "yjs" }
  },
  "permissions": {
    "admin": { "read": true, "create": true, "update": true, "delete": true },
    "member": { "read": true, "create": true, "update": true, "delete": "own" },
    "viewer": { "read": true, "create": false, "update": false, "delete": false }
  }
}
```

---

## CRUD vs Yjs: Choosing the Right Sync Method

Before designing your data model, ask: **"How often does this data change, and how quickly must other users see the change?"**

The storage system offers two sync paths with very different performance characteristics:

### CRUD (`useQuery` + `useMutations`)
Every `put()` goes: WebSocket → Durable Object → **SQLite write** → broadcast to subscribers.

**Use for:**
- Persistent records (tasks, settings, profiles, scores, room metadata)
- Data that changes at human speed — button clicks, form submissions, status updates
- Data that must survive reconnects and page refreshes
- Anything where update frequency is < 1 per second

### Yjs (`useYjsField` / `useYjsText`)
Updates go: WebSocket → Durable Object → **binary diff broadcast** — no SQLite write per update.

**Use for:**
- High-frequency real-time state — cursors, positions, live counters, drawing strokes
- Collaborative editing — shared text, shared data structures
- Anything where update frequency is > 1 per second or latency matters
- Game state — player positions, ball physics, card hands, turn state

### Decision Guide

| Question | → CRUD | → Yjs |
|----------|--------|-------|
| How often does it update? | Seconds to minutes | Multiple times per second |
| Must it survive a full page refresh? | Yes — SQLite persists it | Not critical — can reinitialize |
| Is it a discrete event? (created, deleted, status changed) | Yes | No |
| Is it a continuous value? (position, text, counter) | No | Yes |
| Does latency matter? (will users notice 200ms delay?) | No | Yes |

### Mixing Both in One Widget

Most real-time apps need both. Use CRUD for the lifecycle and Yjs for the hot path:

**Example — Multiplayer game:**
- **CRUD**: `game-rooms` collection (room listing, player join, final scores) — updates a few times per game
- **Yjs**: `game-state` collection with a `state: { type: 'yjs' }` field — ball position, paddle positions, updated 30-60 times per second via `useYjsField` + `doc.getMap('game')`

**Example — Collaborative whiteboard:**
- **CRUD**: `boards` collection (board list, permissions, metadata)
- **Yjs**: `board-data` collection with a `canvas: { type: 'yjs' }` field — shapes, strokes, cursor positions via `useYjsField`

**Example — Live poll:**
- **CRUD**: `polls` collection (question text, options, who voted) — updates on each vote
- Yjs not needed — voting is a discrete event at human speed

### Using `useYjsField` for Structured State

For non-text real-time data (game state, shared objects), use `useYjsField` to get a `Y.Doc`, then use `Y.Map` for key-value state:

```tsx
// Schema: { name: 'game-state', fields: { state: { type: 'yjs' } }, ... }

const { doc, synced, canWrite } = useYjsField('game-state', recordId, 'state')
const gameMap = doc.getMap('game')

// Write (host)
gameMap.set('ballX', newX)
gameMap.set('ballY', newY)

// Read (all players) — re-renders on every remote change via updateCount
const ballX = gameMap.get('ballX') as number
const ballY = gameMap.get('ballY') as number

// Observe changes
useEffect(() => {
  const handler = () => { /* re-render or update local state */ }
  gameMap.observe(handler)
  return () => gameMap.unobserve(handler)
}, [gameMap])
```

Each player writes only their own keys (e.g., host writes ball state, player 2 writes `paddle2Y`). Yjs merges without conflict since keys don't overlap.

---

## Multiple Collections

Widgets can have multiple collections for different data types:

```json
{
  "schemas": [
    {
      "name": "announcements",
      "fields": { "title": { "type": "string", "required": true }, "content": { "type": "string" } },
      "permissions": {
        "admin": { "read": true, "create": true, "update": true, "delete": true },
        "member": { "read": true, "create": false, "update": false, "delete": false }
      }
    },
    {
      "name": "tasks",
      "fields": { "title": { "type": "string", "required": true }, "status": { "type": "string" } },
      "permissions": {
        "admin": { "read": true, "create": true, "update": true, "delete": true },
        "member": { "read": true, "create": true, "update": "own", "delete": "own" }
      }
    }
  ]
}
```

---

## Legacy Storage (Deprecated)

The old hooks still work for backwards compatibility but should not be used for new widgets:

```jsx
// ❌ Deprecated - don't use for new widgets
useStorage(key, defaultValue, { scope: 'global' | 'user' })
useFiles(basePath, { scope: 'global' | 'user' })
useGlobalStorage(key, defaultValue)
useUserStorage(key, defaultValue)

// ✅ Use instead
useQuery('collection-name')
useMutations('collection-name')
```

If you see these hooks in existing widgets, they will continue to work. New widgets should use `useQuery` and `useMutations` with schemas defined in `src/schemas.ts`.

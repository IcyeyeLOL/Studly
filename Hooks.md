# Hooks

**CRITICAL: Use the EXACT property names shown below. Do NOT rename or alias them.**

---

## useUser

Get the current authenticated user and their role in this room.

```jsx
const { user, isLoading, refetch } = useUser();
```

| Return | Type | Description |
|--------|------|-------------|
| `user` | `User \| null` | User object (null if not loaded) |
| `isLoading` | `boolean` | True while loading |
| `refetch` | `() => Promise<void>` | Refetch user profile (e.g. after credit-consuming API calls) |

**User properties:**

| Property | Type | Description |
|----------|------|-------------|
| `user.id` | `string` | Unique user ID |
| `user.name` | `string` | Display name |
| `user.email` | `string` | Email address |
| `user.imageUrl` | `string?` | Avatar URL |
| `user.role` | `string` | Role in this room (e.g. `'admin'`, `'member'`, `'viewer'`, or app-specific roles) |
| `user.isAdmin` | `boolean` | Whether user is a global admin |
| `user.credits` | `object \| null` | `{ total, subscription, bonus, purchased }` |
| `user.publicUsername` | `string \| null` | Public username (if set) |
| `user.subscriptionTier` | `string \| null` | Subscription tier (e.g. `'pro'`, `'free'`) |
| `user.subscriptionStatus` | `string \| null` | Subscription status (e.g. `'active'`, `'canceled'`) |
| `user.karma` | `object \| null` | `{ total, rank, monthlyKarma, monthlyRank }` |

```jsx
const { user, isLoading } = useUser();

if (isLoading) return <p>Loading...</p>;
if (!user) return <p>Please sign in</p>;

return (
  <div>
    <p>Welcome, {user.name}!</p>
    <p>Your role: {user.role}</p>
  </div>
);
```

---

## useQuery

Real-time query subscription. Automatically syncs across all users.

**Returns `{ records, status, error }` — NOT `data`, NOT `isLoading`, NOT `items`.**

```jsx
const { records, status, error } = useQuery(collection, options?);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `collection` | `string` | Collection name from src/schemas.ts |
| `options.where` | `object?` | Filter: `{ field: value }` |
| `options.orderBy` | `string?` | Field to sort by |
| `options.orderDir` | `'asc' \| 'desc'` | Sort direction |
| `options.limit` | `number?` | Max records to return |

| Return | Type | Description |
|--------|------|-------------|
| `records` | `array` | Array of record objects |
| `status` | `'loading' \| 'ready' \| 'error'` | Query status |
| `error` | `string?` | Error message if status is `'error'` |

**Record Shape — fields are inside `record.data`, NOT on the record directly:**
```js
record.recordId    // "abc123" — unique ID
record.data.title  // field value — access ALL fields via record.data.*
record.createdBy   // "user_xyz" — who created it
record.createdAt   // "2024-01-01T..." — ISO timestamp
record.updatedAt   // "2024-01-02T..." — ISO timestamp
```

```jsx
// ✅ CORRECT
const { records, status } = useQuery('tasks');
records.map(record => record.data.title)

// ❌ WRONG — these do NOT exist
const { data, isLoading } = useQuery('tasks');     // WRONG
const { items } = useQuery('tasks');                // WRONG
records.map(entry => entry.title)                   // WRONG — must be entry.data.title
```

```jsx
// Basic query
const { records, status } = useQuery('tasks', { orderBy: 'createdAt', orderDir: 'desc' });

// Filtered query
const { records: myTasks } = useQuery('tasks', { where: { assignee: user?.id } });

// With limit
const { records: recent } = useQuery('messages', { orderBy: 'createdAt', orderDir: 'desc', limit: 50 });

if (status === 'loading') return <p>Loading...</p>;

return (
  <ul>
    {records.map(record => (
      <li key={record.recordId}>{record.data.title}</li>
    ))}
  </ul>
);
```

---

## useMutations

Create, update, and delete records.

**Returns `{ create, put, remove, createConfirmed, putConfirmed, removeConfirmed }` — NOT `createRecord`, NOT `updateRecord`, NOT `deleteRecord`.**

```jsx
const { create, put, remove, createConfirmed, putConfirmed, removeConfirmed } = useMutations(collection);
```

### Fire-and-forget (default)

| Function | Parameters | Description |
|----------|------------|-------------|
| `create(data)` | `data: object` | Create new record, returns recordId |
| `put(id, data)` | `id: string, data: object` | Update existing record |
| `remove(id)` | `id: string` | Delete record |

Fire-and-forget — they send a WebSocket message and return immediately. They do **not** await server confirmation and will **not** throw on permission errors. Permission enforcement happens server-side (invalid mutations are silently rejected).

### Server-acknowledged (confirmed)

| Function | Parameters | Description |
|----------|------------|-------------|
| `createConfirmed(data)` | `data: object` | Create new record, resolves with recordId on server ACK |
| `putConfirmed(id, data)` | `id: string, data: object` | Update record, resolves on server ACK |
| `removeConfirmed(id)` | `id: string` | Delete record, resolves on server ACK |

Confirmed variants wait for the server to process the mutation before resolving. They **reject** on permission errors, validation failures, or timeout (10s). Use these when you need to know the mutation succeeded before proceeding (e.g., create-then-navigate, or showing success/error feedback).

```jsx
// ✅ CORRECT
const { create, put, remove } = useMutations('tasks');
const { createConfirmed, putConfirmed, removeConfirmed } = useMutations('tasks');

// ❌ WRONG — these do NOT exist
const { createRecord, updateRecord, deleteRecord } = useMutations('tasks');  // WRONG
const { add, update, delete: del } = useMutations('tasks');                  // WRONG
```

```jsx
const { create, put, remove, createConfirmed, putConfirmed, removeConfirmed } = useMutations('tasks');
const { user } = useUser();

// --- Fire-and-forget (fast, no confirmation) ---

// Create — returns a client-generated recordId immediately
const handleAdd = async () => {
  const id = await create({ title: 'New task', status: 'todo', assignee: user?.id });
  // id is available right away, but the record may not be persisted yet
};

// Update — pass record.recordId and the full updated data object
const handleToggle = (record) => {
  put(record.recordId, { ...record.data, status: 'done' });
};

// Delete — pass record.recordId
const handleDelete = (id) => {
  remove(id);
};

// --- Server-acknowledged (use when you need confirmation) ---

// Create then navigate — guaranteed persisted before navigation
const handleCreateAndNavigate = async () => {
  try {
    const id = await createConfirmed({ title: 'New task', status: 'todo' });
    setCurrentPage(`/tasks/${id}`); // Safe — server confirmed the record exists
  } catch (err) {
    // Permission denied, validation error, or timeout
    console.error('Failed to create:', err.message);
  }
};

// Update with error feedback
const handleSave = async (record, updates) => {
  try {
    await putConfirmed(record.recordId, { ...record.data, ...updates });
    // Show success toast
  } catch (err) {
    // Show error toast with err.message
  }
};
```

---

## useYjsText

Real-time collaborative text editing using Yjs. Use with fields of `"type": "yjs"` in schema.

```jsx
const { text, setText, synced, canWrite } = useYjsText(collection, recordId, fieldName);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `collection` | `string` | Collection name from src/schemas.ts |
| `recordId` | `string` | Record ID to edit |
| `fieldName` | `string` | Field name (must be `"type": "yjs"` in schema) |

| Return | Type | Description |
|--------|------|-------------|
| `text` | `string` | Current content |
| `setText` | `(value: string) => void` | Replace content |
| `synced` | `boolean` | True when initial sync complete |
| `canWrite` | `boolean` | True if user has write permission |

```jsx
const { text, setText, synced, canWrite } = useYjsText('documents', docId, 'content');

if (!synced) return <p>Connecting...</p>;

return (
  <textarea
    value={text}
    onChange={(e) => setText(e.target.value)}
    disabled={!synced || !canWrite}
    readOnly={!canWrite}
    placeholder="Start typing... changes sync in real-time!"
  />
);
```

---

## useYjsField

Low-level Yjs document access. Use `useYjsText` for simple text; use this for advanced Yjs data structures (Y.Map, Y.Array, etc.).

```jsx
const { doc, synced, canWrite, updateCount } = useYjsField(collection, recordId, fieldName);
```

| Return | Type | Description |
|--------|------|-------------|
| `doc` | `Y.Doc` | The Yjs document instance |
| `synced` | `boolean` | True when initial sync complete |
| `canWrite` | `boolean` | True if user has write permission |
| `updateCount` | `number` | Increments on every doc update (use as dependency) |

```jsx
const { doc, synced, canWrite } = useYjsField('whiteboards', boardId, 'canvas');
const yMap = doc.getMap('shapes');
```

---

## useUsers

Get all users in the current room and manage roles. Admin only for `setRole`.

```jsx
const { users, setRole, refresh } = useUsers();
```

| Return | Type | Description |
|--------|------|-------------|
| `users` | `RoomUser[]` | All users in the room |
| `setRole` | `(userId: string, role: string) => void` | Change a user's role (admin only) |
| `refresh` | `() => void` | Re-fetch user list |

**RoomUser shape:**
```js
{
  id: "user_abc",
  name: "Alice",
  email: "alice@example.com",
  imageUrl: "https://...",
  role: "member",
  createdAt: "2024-01-01T...",
  lastSeenAt: "2024-01-02T..."
}
```

```jsx
const { users, setRole } = useUsers();

return (
  <ul>
    {users.map(u => (
      <li key={u.id}>
        {u.name} — {u.role}
        <button onClick={() => setRole(u.id, 'admin')}>Make Admin</button>
      </li>
    ))}
  </ul>
);
```

---

## useUserLookup

O(1) user lookups by ID. Useful when displaying user names/emails from record `createdBy` fields.

```jsx
const { getUser, getName, getEmail } = useUserLookup();
```

| Return | Type | Description |
|--------|------|-------------|
| `getUser(id)` | `UserInfo \| null` | Full user info |
| `getName(id)` | `string \| null` | User's display name |
| `getEmail(id)` | `string \| null` | User's email |
| `users` | `RoomUser[]` | All users |
| `userMap` | `Map<string, UserInfo>` | Direct map access |

```jsx
const { getName } = useUserLookup();

// In a record list
{records.map(record => (
  <div key={record.recordId}>
    {record.data.title} — by {getName(record.createdBy) || 'Unknown'}
  </div>
))}
```

---

## useTeams

Team management. Create teams, add/remove members.

**Important:** `useTeams()` only returns teams the current user belongs to — not all teams in the room. Users cannot discover teams they haven't joined yet through this hook. For discoverable rooms/groups, create a separate public collection (see Storage.md "Team-Scoped Data" pattern).

```jsx
const { teams, create, addMember, removeMember, cancelInvite, deleteTeam, refresh } = useTeams();
```

| Return | Type | Description |
|--------|------|-------------|
| `teams` | `Team[]` | Teams the current user is a member of |
| `create` | `(name: string, options?: { isOpen?: boolean }) => string` | Create a team (creator is auto-added). Returns `teamId`. Pass `{ isOpen: true }` for joinable teams. |
| `addMember` | `(teamId, member, roleOrOptions?) => Promise<AddMemberResult>` | Add member by userId, email, or username (see below). Self-join for open teams; owner/admin for closed teams. |
| `removeMember` | `(teamId, userId) => void` | Remove active member |
| `cancelInvite` | `(teamId, inviteId) => void` | Cancel a pending invite. `inviteId` is `member.userId` from the pending `TeamMember` (e.g. `"invite:inv_..."`) |
| `deleteTeam` | `(teamId) => void` | Delete team |
| `refresh` | `() => void` | Re-fetch team list |

**`addMember` accepts three identifier forms:**

```jsx
// By userId (direct add, backward compatible)
addMember(teamId, 'user_abc123')
addMember(teamId, 'user_abc123', 'lead')

// By email (looks up user → adds if found, creates pending invite if not)
const result = await addMember(teamId, { email: 'jane@example.com' })
// result.status: 'added' | 'invited' | 'already_member' | 'error'

// By username (looks up user → adds if found, errors if unknown)
await addMember(teamId, { username: 'janedoe' })

// With email notification (sent for both existing and new users)
// NOTE: miniappId is required when sendEmail is true — emails are sent from noreply@{miniappId}.app.space
await addMember(teamId, { email: 'jane@example.com' }, {
  roleInTeam: 'member',
  sendEmail: true,           // existing user → "You've been added"; new user → "You've been invited"
  miniappId: 'my-task-app',
  teamName: 'Engineering',   // optional, falls back to team name in state
})
```

**Pending invites** appear as `TeamMember` entries with `status: 'pending'` and an `email` field. They auto-resolve when the invited user connects for the first time.

**`addMember` permission:** Teams are **closed (invite-only) by default** — only the team owner or a room admin can call `addMember`. To allow self-join, create the team with `{ isOpen: true }`: open teams let any user call `addMember(teamId, theirOwnUserId)` to join themselves. In both modes, only owner/admin can add *other* users.

---

## Complete Example

```json
// src/schemas.ts (exported as JSON schema)
{
  "schemas": [{
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
  }]
}
```

```tsx
// src/App.tsx
function TaskList() {
  // useUser → { user, isLoading }
  const { user, isLoading } = useUser();
  // useQuery → { records, status }  (NOT data, NOT isLoading)
  const { records, status } = useQuery('tasks');
  // useMutations → { create, put, remove }  (NOT createRecord, NOT updateRecord, NOT deleteRecord)
  const { create, put, remove } = useMutations('tasks');
  const [newTask, setNewTask] = useState('');

  if (isLoading || status === 'loading') return <p>Loading...</p>;

  const handleAdd = async () => {
    if (!newTask.trim()) return;
    try {
      await create({ title: newTask, done: false });
      setNewTask('');
    } catch (err) {
      console.error('Failed to create:', err.message);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
          className="flex-1 border rounded px-2 py-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-blue-500 text-white px-4 py-1 rounded">
          Add
        </button>
      </div>
      
      <ul className="space-y-2">
        {/* record.recordId for key, record.data.* for fields */}
        {records.map(record => (
          <li key={record.recordId} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={record.data.done}
              onChange={() => put(record.recordId, { ...record.data, done: !record.data.done })}
            />
            <span className={record.data.done ? 'line-through text-gray-400' : ''}>
              {record.data.title}
            </span>
            <button onClick={() => remove(record.recordId)} className="text-red-500 ml-auto">
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
```

---

## Legacy Hooks (Deprecated)

These hooks still work for backwards compatibility but should not be used for new widgets:

| Deprecated Hook | Replacement |
|-----------------|-------------|
| `useStorage(key, default)` | `useQuery` + `useMutations` |
| `useFiles(path)` | `useQuery` + `useMutations` |
| `useGlobalStorage(key, default)` | `useQuery` + `useMutations` |
| `useUserStorage(key, default)` | `useQuery` with `"own"` permissions |

If you encounter these in existing widgets, they will continue to work. For new widgets, always define schemas in `src/schemas.ts` and use the new hooks.

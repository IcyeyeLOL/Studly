# Hooks

---

## User Hook

**useUser()** - Get current authenticated user
- Returns: `{ user: { id, name, email, imageUrl } | null, isLoading: boolean }`
- Use to display user info, check authentication, or personalize content

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique user ID |
| `name` | `string` | Display name |
| `email` | `string \| undefined` | User's email address |
| `imageUrl` | `string \| undefined` | User's avatar URL |

```jsx
const { user, isLoading } = useUser();

if (isLoading) return <p>Loading...</p>;
if (!user) return <p>Please sign in</p>;

// Access all user properties
console.log(user.id);       // "user_abc123..."
console.log(user.name);     // "Donald"
console.log(user.email);    // "donald@example.com"
console.log(user.imageUrl); // "https://img.clerk.com/..."
```

---

## Storage Hook (Unified)

**useStorage(key, defaultValue, options?)** - All persistent state
- Returns: `[value, setValue]`
- Options: `{ scope: 'global' | 'user' }`
- Default scope: `'global'` (shared with everybody)
- User scope keys are automatically namespaced by userId

```jsx
// Shared with everybody (default)
const [gameState, setGameState] = useStorage('game', {})

// Private to current user (namespaced by userId)
const [notes, setNotes] = useStorage('notes', '', { scope: 'user' })
```

| Scope | Who Sees It | Use For |
|-------|-------------|---------|
| `'global'` | Everybody | Multiplayer, collaboration |
| `'user'` | Nobody (private) | Personal notes, preferences |

---

## File Storage

**useFiles(basePath, options?)** - File-system API over storage
- Returns: `files` object with `read`, `write`, `delete`, `exists`, `list`, `ready`
- Options: `{ scope: 'global' | 'user' }`
- Default scope: `'global'` (shared with everybody)

```jsx
// Shared files
const files = useFiles('docs/')

// Private files  
const myFiles = useFiles('notes/', { scope: 'user' })
```

---

## I/O Hooks

**useInput(slotId, defaultValue)** - Receive data from connected outputs
- Returns: `value` (read-only)
- Receives data when connected output widgets call their `sendValue()`

**useOutput(slotId)** - Send data to connected inputs
- Returns: `sendValue` function
- Call `sendValue(data)` to push data to all connected inputs

---

## Backwards Compatibility Aliases

These work but prefer `useStorage` for new code:

```jsx
useGlobalStorage(key, default)  // === useStorage(key, default)
useUserStorage(key, default)    // === useStorage(key, default, { scope: 'user' })
```

# Do's and Don'ts

---

### ✅ DO:

- **Preserve widget independence**: Each widget should work standalone
- **Define data in `src/schemas.ts`**: Create a `src/schemas.ts` in the widget's `src/` directory with collections, fields, and permissions
- **Use the correct storage hooks**:
  - `useQuery(collection)` to read data (real-time sync)
  - `useMutations(collection)` to write data (`{ create, put, remove }`)
- **Control access with permissions**: Use `"own"` for private data, role-based permissions for shared vs admin-only
- **Always persist important data**: Ask "Would this survive a page refresh?" If no → define a collection and use `useQuery`/`useMutations`
- **Import React and hooks explicitly**: At the top of `src/App.tsx`, e.g. `import React, { useState, useEffect } from 'react'`
- **Keep existing functionality**: Don't break current features unless requested
- **Use semantic collection names**: Clear names like `'tasks'`, `'settings'`, `'messages'`
- **Work only inside the current room**: Modify files only under the active room directory
- **Use explicit HTTP methods**: `mcapi.post('/endpoint', data)` — always use paths from McAPI.yaml or integrations/*.yaml. Import: `import { mcapi } from '@spaces/sdk'`
- **Use `"team"` permission + `teamField` for team-restricted data**: This ensures only team members can access records linked to their team
- **Choose the right sync method for each piece of data**: Before defining a collection, ask "how often does this change, and does latency matter?" Use CRUD (`useQuery`/`useMutations`) for discrete events at human speed (form submits, status changes, settings). Use Yjs (`useYjsField`) for high-frequency continuous state (positions, cursors, game physics, live counters). Most real-time apps need both — see the "CRUD vs Yjs" section in Storage.md.
- **Use proper SVG icons** for all UI elements (nav items, buttons, headers, status indicators). Default to `lucide-react`: `import { Home, Settings, Users } from 'lucide-react'`. For other icon families (Font Awesome, Heroicons, Phosphor, Tabler, Feather), import from `@spaces/sdk/icons` by prefix: `import { FaHeart } from '@spaces/sdk/icons'`

---

### ❌ DON'T:

- **Use deprecated hooks**: Don't use `useStorage`, `useFiles`, `useGlobalStorage`, `useUserStorage`, `useInput`, or `useOutput` for new widgets — use `useQuery`/`useMutations` instead
- **Break iframe isolation**: Widgets run in separate iframes and cannot directly access each other's DOM or state
- **Remove essential hooks**: Keep `useState`, `useEffect`, `useMemo`, etc. — they're required for React to work
- **Create circular dependencies**: Widgets depending on each other in loops cause infinite re-renders
- **Use complex external libraries**: Stick to React built-ins and provided hooks — external libs won't load
- **Modify compiled output**: Only modify source files in `src/` — output is auto-generated and will be overwritten
- **Forget `export default`**: Every widget's `src/App.tsx` MUST end with `export default ComponentName;` or it won't render
- **Put all code in `src/App.tsx`**: Use the full `src/` directory structure — `src/pages/`, `src/components/`, `src/hooks/`, `src/constants.ts`, etc.
- **Modify `properties.json`**: System-managed file — your changes will be lost
- **Run git commands**: Git is handled automatically — manual git commands will fail
- **Use naked `mcapi()` calls**: Always use `.post()` or `.get()` methods
- **Hallucinate API methods**: Don't invent methods like `mcapi.generateText()` — use paths from McAPI.yaml
- **Use `miyagiAPI` instead of `mcapi`**: Prefer `mcapi` — both work as globals, but `mcapi` is the canonical name
- **Forget the endpoint name**: Use the exact endpoint token from McAPI.yaml (e.g., `'generate-text'` or `'/generate-text'` — both work)
- **Assume response wrappers from other libraries**: The schema in integrations/*.yaml shows EXACTLY what you get. Don't add extra layers from muscle memory — if the schema says `data.text`, write `response.data.text`.
- **Skip the category file**: McAPI.yaml is a summary — read the full schema in integrations/{category}.yaml before calling an endpoint
- **Access `record.title` directly**: Fields live under `record.data.*` — use `record.data.title`, not `record.title`
- **Clean up imports or simplify navigation in `App.tsx` unless explicitly asked**: Users scale their widgets over time — those "unused" imports and navigation structures are scaffolding for future features. Do not remove imports, consolidate routes, or simplify navigation unless the user specifically requests it
- **Assume `useTeams()` returns all teams**: It only returns teams the current user belongs to — not all teams in the room
- **Forget to pass `{ isOpen: true }` when creating joinable teams**: Teams are invite-only by default — only open teams allow self-join via `addMember(teamId, user.id)`
- **Use `useMutations.put()` for high-frequency state sync**: CRUD mutations write to SQLite on every call — calling `put()` 20+ times per second will cause latency and overhead. Use `useYjsField` with a `Y.Map` for state that updates multiple times per second (game positions, cursors, live counters). See Storage.md "CRUD vs Yjs" section.
- **Use emoji characters (📋, ⚙️, 🏠, etc.) as icons in widget UI**: Always use proper SVG icons from `lucide-react` or `@spaces/sdk/icons` instead. Emojis render inconsistently across platforms and look unprofessional.
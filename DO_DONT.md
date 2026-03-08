# Do's and Don'ts

---

### ✅ DO:

- **Preserve widget independence**: Each widget should work standalone
- **Define data in `src/schemas.ts`**: Create a `src/schemas.ts` in the widget's `src/` directory with collections, fields, and permissions
- **Use the correct storage hooks**:
  - `useQuery(collection)` to read data (real-time sync)
  - `useMutations(collection)` to write data (`{ create, put, remove }` for fire-and-forget, `{ createConfirmed, putConfirmed, removeConfirmed }` when you need server confirmation before proceeding)
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
- **Check the feature catalog before building anything new**: Run `add feature --list` to see pre-built features. If one matches what you need, install it with `add feature <id> <widget-dir>` instead of writing it from scratch. Use `add feature --info <id>` to see exactly what a feature provides.
- **Use `mcapi` to fetch information you need**: When you need context from the web (e.g., scraping a page, looking up facts, getting current data), call `mcapi` from the shell instead of telling the user to look it up. Use `mcapi firecrawl-scrape url="..."` to scrape pages, `mcapi exa-search query="..."` to search the web, `mcapi wikipedia-summary title="..."` for Wikipedia, etc. Always run `mcapi --describe <endpoint>` first to verify parameter names.
- **Use `call` to inspect widget data when debugging storage issues**: Run `call schema.list` to see collections, `call records.query collection=<name>` to see data. Don't guess collection names or data shapes — check the actual storage first.
- **Use `cn()` from `components/ui/utils` for composing class names**: Import `cn` from the barrel (`import { cn } from '../components/ui'`) and use it to merge Tailwind classes conditionally. Example: `cn('text-sm', isActive && 'text-primary', className)`.
- **Use Input, Textarea, Select from components/ui for all form elements**: Never create raw `<input>`, `<textarea>`, or `<select>` elements with inline Tailwind. Import the pre-built components and use their props.
- **Use shadcn token classes for all colors**: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-muted`, `bg-primary`, `text-primary`, `text-destructive`, `border-border`, etc. These are defined in `styles.css` and match the widget's theme automatically.
- **[CRITICAL] Read every `components/ui/*` file before using it**: Open the source, read the interface/types, and use the exact prop names. Never guess a component's API — Dialog uses `open` (Radix) not `isOpen`, Badge uses `variant` not `color`, etc. Also read `COMPONENTS.md` in the `components/ui/` directory for quick usage examples.
- **Use `useR2Files` for all file handling in widgets**: When a widget needs to handle user-uploaded files (images, PDFs, documents, audio, video, etc.), upload via `useR2Files` from `@spaces/sdk/storage` and store just the returned URL in records. Works for `<input type="file">`, drag-and-drop, base64 from API responses, etc. See Storage.md for full docs.

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
- **Guess `mcapi` parameter names**: Always run `mcapi --describe <endpoint>` before calling an unfamiliar endpoint. Parameter names vary (e.g., `searchPrompt` not `query`, `numResults` not `limit`). Getting them wrong will cause errors.
- **Call unsupported endpoints via `mcapi`**: `search-web`, `search-web-raw`, `search-web-ai`, `search-pdfs`, and `advanced-web-search` do NOT work via the `mcapi` command. Use `firecrawl-search`, `exa-search`, or `exa-answer` for web search instead.
- **Access `record.title` directly**: Fields live under `record.data.*` — use `record.data.title`, not `record.title`
- **Guess collection names when using `call`**: Always run `call schema.list` first to see what collections actually exist. Don't assume collection names based on widget file names or user descriptions.
- **Clean up imports or simplify navigation in `App.tsx` unless explicitly asked**: Users scale their widgets over time — those "unused" imports and navigation structures are scaffolding for future features. Do not remove imports, consolidate routes, or simplify navigation unless the user specifically requests it
- **Assume `useTeams()` returns all teams**: It only returns teams the current user belongs to — not all teams in the room
- **Forget to pass `{ isOpen: true }` when creating joinable teams**: Teams are invite-only by default — only open teams allow self-join via `addMember(teamId, user.id)`
- **Use `useMutations.put()` for high-frequency state sync**: CRUD mutations write to SQLite on every call — calling `put()` 20+ times per second will cause latency and overhead. Use `useYjsField` with a `Y.Map` for state that updates multiple times per second (game positions, cursors, live counters). See Storage.md "CRUD vs Yjs" section.
- **Use confirmed mutations (`putConfirmed`/`createConfirmed`/`removeConfirmed`) for every mutation**: Confirmed mutations add a network round-trip. Only use them when you actually need to know the server processed it (create-then-navigate, save-with-error-feedback). For normal UI interactions (toggling a checkbox, deleting from a list), fire-and-forget (`put`/`create`/`remove`) is correct.
- **Use emoji characters (📋, ⚙️, 🏠, etc.) as icons in widget UI**: Always use proper SVG icons from `lucide-react` or `@spaces/sdk/icons` instead. Emojis render inconsistently across platforms and look unprofessional.
- **Write from scratch what already exists as a pre-built feature**: Run `add feature --list` before writing any new page or component. If a feature covers what you need, use it.
- **Use `components/ui/*` components without reading their source first**: Always open and read the component file before importing it. Guessing prop names (e.g., `isOpen` instead of `open` on Dialog) causes bugs that compile but break at runtime. Read `COMPONENTS.md` in the `components/ui/` directory for quick reference.
- **Use hardcoded Tailwind colors (slate-600, violet-500, etc.)**: Always use semantic token classes (`text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, etc.) from the theme. Hardcoded colors break when the theme changes.
- **Create raw `<input>`/`<textarea>`/`<select>` with inline Tailwind**: Use the pre-built `Input`, `Textarea`, and `Select` components from `components/ui`. They have proper styling, focus states, and accessibility built in.
- **[CRITICAL] Store base64 file data in records or inline in JSX**: Never put `data:image/png;base64,...` in a record field or `<img src>`. Upload via `useR2Files` first, then store/display the returned URL. Base64 bloats storage and slows everything down. This applies to ALL binary data: images, PDFs, audio, video, etc.
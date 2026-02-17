# Skeleton Guide

After `create widget`, you land in a scaffolded directory with a full TypeScript project. This guide explains what each file does, what you should NOT touch, and the correct build sequence for turning the skeleton into an app.

---

## File Map

```
widget-{shapeId}/
├── properties.json              # ❌ SYSTEM-MANAGED — do not touch
├── styling.md                   # Theme/style configuration — read this for design cues
├── tsconfig.json                # TypeScript config — do not touch
└── src/
    ├── main.tsx                 # ❌ INFRASTRUCTURE — do not touch
    ├── App.tsx                  # App shell: auth, RecordProvider, routing, nav
    ├── schemas.ts               # ✅ START HERE — define your data collections
    ├── constants.ts             # ✅ THEN HERE — app-specific constants, statuses, config
    ├── styles.css               # ⚠️ Theme + base styles — modify @theme block for colors, add custom CSS inside @layer base
    ├── vite-env.d.ts            # ❌ INFRASTRUCTURE — do not touch
    ├── pages/
    │   └── HomePage.tsx         # ✅ Replace with your main page
    ├── components/
    │   └── ui/                  # ✅ PRE-BUILT UI KIT — use these, don't recreate them
    │       ├── index.ts         # Barrel exports
    │       ├── Button.tsx       # Primary, secondary, danger, ghost variants
    │       ├── Badge.tsx        # Status/role badges with semantic colors
    │       ├── Avatar.tsx       # User avatars (image or initials)
    │       ├── Modal.tsx        # Dialog with Header/Body/Footer sub-components
    │       ├── Toast.tsx        # Toast notifications (ToastProvider + useToast hook)
    │       ├── CardGrid.tsx     # Responsive grid + Card with header/body/footer
    │       ├── EmptyState.tsx   # Empty state variants (Items, Search, Error, etc.)
    │       └── Skeleton.tsx     # Loading skeletons (Text, Card, List, Table, Avatar)
    └── hooks/
        └── index.ts             # ✅ Your custom hooks go here
```

---

## Do NOT Touch (Infrastructure)

These files handle auth bootstrapping, React rendering, SDK wiring, and base styles. Modifying them breaks the widget:

| File | Why |
|------|-----|
| `main.tsx` | Mounts React with SpacesAuthProvider + PillCoordinatorProvider. Never needs changes. |
| `vite-env.d.ts` | Type declarations. Never needs changes. |
| `properties.json` | System-managed widget metadata (position, size, IDs). Your changes will be overwritten. |
| `tsconfig.json` | TypeScript config. Never needs changes. |

**`App.tsx` is special** — you WILL modify it, but only in specific places:
- Add page imports at the top (where the commented imports are)
- Add nav items to the `navItems` array
- Add `<Route>` entries in the `<Routes>` block
- Change the app name in the nav logo area

Do NOT rewrite App.tsx from scratch. Do NOT remove or "simplify" existing infrastructure — even for simple single-page widgets. The Navigation component, `ProtectedRoute`, user loading states, and role handling cost nothing when unused but provide the foundation for future expansion. Do NOT remove the auth plumbing (`useAuth`, `DeepSpacePill`, `isWidgetContext`, `fetchUserViaPostMessage`), the `RecordProvider` wrapper, the `ToastProvider`, or the `ProtectedRoute` component. Removing working infrastructure to "simplify" wastes tokens and destroys the expansion path.

**`RecordProvider roomId` is dynamic — do NOT hardcode it.** The `getWidgetRoomId()` function reads the canvas `roomId` from URL search params (injected by the parent canvas). This ensures per-canvas data isolation — each canvas gets its own RecordRoom Durable Object. Do NOT change `roomId={getWidgetRoomId()}` to a static string like `roomId="my-app"`. The dynamic roomId is critical for multi-user/multi-canvas isolation.

**`styles.css` contains the theme and base styles.** The `@theme` block defines all semantic design tokens (colors, shadows, animations). The `@layer base` block contains global styles (scrollbar, focus states, font stack). To customize the visual style, modify the `@theme` CSS variables. Add custom CSS inside the `@layer base` block — never add unlayered CSS, as it overrides Tailwind utility classes.

**Never use inline `style={}` for colors, backgrounds, or shadows.** Define custom design tokens in the `@theme` block in `styles.css` and use Tailwind classes instead. For example, if a style needs a specific background color, add it as `--color-surface: #e0e5ec;` in `@theme` and use `bg-surface` in JSX — not `style={{ background: '#e0e5ec' }}`.

---

## Build Sequence

Follow this order. Each step builds on the previous one.

### 1. schemas.ts — Define your data

This is always step one. Every feature starts with "what data does it need?"

- Add collection schemas with fields, types, and RBAC permissions
- The `usersSchema` is already there — don't remove it
- Import and add your schemas to the `schemas` array export
- **Decide CRUD vs Yjs for each field**: if data updates multiple times per second or latency matters (game state, cursors, live positions), use `type: 'yjs'` and `useYjsField`. For everything else use regular fields with `useQuery`/`useMutations`. See Storage.md "CRUD vs Yjs" section.
- See Storage.md for field types, permission values, and patterns

```ts
const tasksSchema: CollectionSchema = {
  name: 'tasks',
  fields: {
    title: { type: 'string', required: true },
    status: { type: 'string', required: true },
    assignee: { type: 'string' },
  },
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    viewer: { read: true, create: false, update: false, delete: false },
  },
}

export const schemas: CollectionSchema[] = [
  usersSchema,
  tasksSchema,
]
```

### 2. constants.ts — Define app constants

Add status values, categories, configuration, and other constants that pages and components will reference. The role definitions (`ROLES`, `ROLE_CONFIG`) are already there.

```ts
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
} as const
```

### 3. hooks/ — Custom hooks (if needed)

Create custom hooks in `src/hooks/` for logic shared across pages. Export from `src/hooks/index.ts`.

Common patterns:
- Data filtering/sorting logic wrapping `useQuery`
- API call wrappers using `mcapi` (import from `@spaces/sdk`)
- Complex state management shared between pages

### 4. pages/ — Build your pages

Create page components in `src/pages/`. Each page is a full-screen view that uses hooks to read/write data and components for UI.

- Replace `HomePage.tsx` with your app's main content
- Create additional pages as needed (e.g., `AdminPage.tsx`, `DetailPage.tsx`)
- Pages use `useQuery`, `useMutations`, `useUser` to interact with data
- Pages import UI components from `../components/ui`

### 5. components/ — Domain-specific components

As pages grow, extract reusable pieces into new component files. Place them alongside the `ui/` directory:

```
components/
├── ui/           # Pre-built kit (don't modify unless theming)
├── TaskCard.tsx   # Domain component
├── StatusFilter.tsx
└── modals/
    └── CreateTaskModal.tsx
```

### 6. App.tsx — Wire it up

Last step. Import your pages and connect them:

1. Add page imports at the top
2. Add nav items to the `navItems` array (with path, label, allowed roles, icon)
3. Add `<Route>` entries — use `<ProtectedRoute>` for role-restricted pages
4. Update the app name/logo if needed

---

## The Pre-Built UI Kit

The `src/components/ui/` directory contains production-ready components. **Use them — do not recreate buttons, modals, badges, cards, or loading states from scratch.**

Import from the barrel:
```tsx
import { Button, Badge, Modal, Card, CardGrid, useToast, EmptyItems, LoadingSpinner } from '../components/ui'
```

### What's available

| Component | Use for |
|-----------|---------|
| `Button` | Actions. Variants: `primary`, `secondary`, `danger`, `ghost`. Sizes: `sm`, `md`, `lg`. |
| `Badge` | Status indicators, role labels. Colors: `primary`, `success`, `warning`, `danger`, `info`, `muted`. |
| `Avatar` | User profile images. Falls back to initials. Sizes: `sm`, `md`, `lg`. |
| `Modal` | Dialogs. Compound: `Modal.Header`, `Modal.Title`, `Modal.Body`, `Modal.Footer`. Sizes: `sm`–`xl`. |
| `ConfirmModal` | Quick confirm/cancel dialogs. |
| `ToastProvider` + `useToast()` | Notifications. Methods: `success()`, `error()`, `warning()`, `info()`. |
| `CardGrid` + `Card` | Responsive grid layouts. Card has `Card.Header`, `Card.Body`, `Card.Footer`. |
| `EmptyState` | Empty views. Pre-built: `EmptyItems`, `EmptySearch`, `EmptyDocuments`, `EmptyProjects`, `EmptyTeam`, `EmptyError`. |
| `Skeleton*` | Loading placeholders. `SkeletonText`, `SkeletonCard`, `SkeletonList`, `SkeletonTable`, `SkeletonAvatar`. |
| `LoadingSpinner` | Spinner. |
| `LoadingOverlay` | Full-screen loading overlay. |

All components use the semantic color system from the `@theme` block in `styles.css`. They automatically match whatever theme is configured.

---

## Growing the Component Tree

Start simple. As you add features, the component tree grows organically:

```
components/
├── ui/                  # The pre-built kit (always here)
├── TaskCard.tsx          # Started as inline JSX in TasksPage, extracted when reused
├── StatusFilter.tsx      # Shared between TasksPage and AdminPage
├── modals/
│   ├── CreateTaskModal.tsx
│   └── AssignModal.tsx
└── admin/
    ├── UserTable.tsx
    └── RoleSelector.tsx
```

Don't pre-create directories or empty component files. Create them when you need them.

---

## Roles and Teams

The skeleton ships with three default roles: `viewer`, `member`, `admin`. These are defined in `constants.ts` and used throughout the app for nav visibility, route protection, and RBAC permissions.

**You can define custom roles** when the domain requires it. The permission system supports any string roles — just make sure every schema defines permissions for each role you use, `constants.ts` has matching `ROLES`/`ROLE_CONFIG` entries, and the nav/route protection logic handles them. For example, an intern portal might use `applicant`, `launchpad`, `intern`, `admin` instead of the defaults.

For most apps, the default three roles are sufficient. Use **teams** (via `useTeams()`) for group-based access control within the same role level — e.g., "Team Alpha", "Class 101", "Project X".

---

## Key Principles

1. **schemas.ts is the starting point.** If you don't know what data the feature needs, you're not ready to code.
2. **Use the UI kit.** Building a custom button when `Button` exists is wasted effort.
3. **Don't rewrite infrastructure.** `main.tsx`, auth plumbing, `RecordProvider`, `getWidgetRoomId()` — these work. Leave them alone. Never replace the dynamic `roomId={getWidgetRoomId()}` with a hardcoded string.
4. **Build for the current task.** The skeleton's structure (pages/, components/, hooks/) IS the future-proofing. You don't need to add abstractions "for later."
5. **Grow organically.** Start with everything in one page. Extract components when you reuse them, not before.

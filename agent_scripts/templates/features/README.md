# Features

Modular features for miniapps. Each feature has a `feature.json` with metadata and integration instructions.

## Usage

```bash
# From templates/features directory
npx tsx scripts/add-feature.ts <feature-id>

# Examples
npx tsx scripts/add-feature.ts shared-ui          # UI component library
npx tsx scripts/add-feature.ts items-crud         # Auto-installs shared-ui too
npx tsx scripts/add-feature.ts display-kanban ../my-app

# List all features
npx tsx scripts/add-feature.ts --list

# Get detailed info
npx tsx scripts/add-feature.ts --info items-crud
```

## Available Features

### 🎨 UI Components
| ID | Name | Description |
|----|------|-------------|
| `shared-ui` | Shared UI Components | Core component library (Button, Modal, Toast, etc.) |

### 📊 Data Features
| ID | Name | Description | Requires |
|----|------|-------------|----------|
| `items-crud` | Items CRUD | Basic CRUD with ownership | shared-ui |
| `tasks-claimable` | Claimable Tasks | Task claiming with admin grading | shared-ui |
| `teams-collab` | Team Collaboration | Teams with Yjs editing | shared-ui |
| `admin-page` | Admin Panel | User management | shared-ui |

### 🧭 Navigation
| ID | Name | Description |
|----|------|-------------|
| `sidebar-collapsible` | Collapsible Sidebar | Icon nav with expand/collapse |
| `topbar-nav` | Top Navigation Bar | Horizontal nav with user menu |
| `sidebar-tree` | Tree Sidebar | Hierarchical with drag-and-drop |

### 📐 Layouts
| ID | Name | Description |
|----|------|-------------|
| `layout-sidebar` | Sidebar Layout | App shell with collapsible sidebar |

### 📋 Display
| ID | Name | Description | Requires |
|----|------|-------------|----------|
| `display-kanban` | Kanban Board | Drag-and-drop columns | shared-ui |

## Dependencies

Features can declare dependencies via `requires` in their `feature.json`. When installing a feature, its dependencies are automatically installed first.

```json
{
  "id": "items-crud",
  "requires": ["shared-ui"],
  ...
}
```

## shared-ui Components

The `shared-ui` feature includes:

| Component | Description |
|-----------|-------------|
| `Button` | Primary/secondary/danger/ghost variants |
| `Badge` | Status badges with color variants |
| `Avatar` | User avatars with fallback |
| `Modal` | Compound modal with Header/Body/Footer |
| `Toast` | Toast provider with success/error/warning/info |
| `EmptyState` | Empty state variants (EmptyItems, EmptySearch, etc.) |
| `CardGrid` | Responsive card grid with hover effects |
| `Skeleton` | Loading skeletons and spinners |

## Starter Template

The starter template (`templates/starter/`) includes minimal base components:
- `Button`, `Badge`, `Avatar` in `src/components/ui/`

All other UI components come from `shared-ui` when installed.

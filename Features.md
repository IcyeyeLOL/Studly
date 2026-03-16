# Features

Pre-built features you can install into widgets instead of writing from scratch.

## Rule: Always check the catalog first

**Before you build any new functionality — a page, a data collection, navigation, a layout, an admin panel, anything — check if a pre-built feature already does it.**

1. Run `add feature --list` to see all available features grouped by category
2. If any look relevant, run `add feature --info <id>` to see exactly what files it provides, what schema it sets up, and what patterns it uses
3. If a feature matches what you need, install it with `add feature <id> <widget-dir>`
4. After install, wire up the route and nav item manually (the script prints the exact code)

Do NOT skip this check. Do NOT write a CRUD page, a leaderboard, a kanban board, a sidebar, or an admin panel from scratch when a pre-built feature already exists.

## Commands

```
add feature --list                              # List all features by category
add feature --info items-crud                   # See what items-crud provides
add feature items-crud widget-my-app-ABC123     # Install items-crud into widget
add feature admin-page widget-my-app-ABC123     # Install admin panel into widget
add feature leaderboard widget-my-app-ABC123    # Install leaderboard into widget
```

## What the script does vs. what you do

**Script does automatically:**
- Copies feature source files to widget's `src/` directory
- Adds schema import and array entry to `src/schemas.ts`

**You do manually after install:**
- Add route to `src/App.tsx` (script prints exact code)
- Add nav item to navigation (script prints label and path)

## Composing multiple features

You can install multiple features into the same widget. They share the same `schemas.ts` and the same widget directory. Examples:

```
add feature items-crud widget-my-app-ABC123
add feature admin-page widget-my-app-ABC123
add feature sidebar-collapsible widget-my-app-ABC123
```

After installing each, wire up its route and nav item before moving to the next.

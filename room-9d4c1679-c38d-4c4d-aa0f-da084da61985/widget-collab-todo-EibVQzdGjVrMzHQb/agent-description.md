# Team Tasks — Real-Time Collaborative Todo List

A shared todo list where multiple users can collaborate in real-time. All tasks are instantly synced across every browser session. Users can see who is currently online and who is editing which task.

## Features
- Add, complete, edit, and delete tasks — all synced instantly via WebSocket
- Live presence avatars showing who is online (updates every 7 seconds)
- "Who is editing" indicator on each task — shows a pulsing chip when another user is actively editing
- Last-write-wins conflict resolution using `updatedAt` timestamps with toast notification
- High-priority flag on any task (red flag icon)
- Filters: All / Active / Done / High Priority
- Stats row: total tasks, active tasks, done tasks, online users
- Clean Light UI — white background, diffuse shadows, indigo accent

## UI Structure
- **Header**: Title + real-time presence avatar row (top right)
- **Stats row**: 4 stat cards (Total, Active, Done, Online)
- **Add task input**: Full-width input + Add button (Enter to submit)
- **Filter pills**: All, Active, Done, High Priority with counts
- **Todo list**: Each item has checkbox, text, "by [name]" label, editing indicator, priority toggle, edit/delete actions

## Collections
- `todos` — shared task records (text, done, priority, addedBy, editingBy, editingByName, updatedAt)
- `presence` — per-user heartbeat records (userId, name, color, lastSeen)

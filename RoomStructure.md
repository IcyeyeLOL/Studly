# File Structure of the Room

---

```
room-9ee0cdde-865f-47e8-b0a6-753dcf9108f6/      # Root canvas (your main workspace)
├── canvas-metadata.json                        # Canvas info, pages list, tldraw schema
├── canvas-state.json                           # Full tldraw snapshot (all shapes)
├── canvas-link-{shapeId}.json                  # Canvas-link to nested room (position, label)
│
├── .chat-attachments/                          # Chat file uploads for this room
│   └── {timestamp}_{filename}.ext              # Uploaded files with timestamp prefix
├── .canvas-images/                             # Image inspection cache (inspect image)
├── .canvas-documents/                          # Document inspection cache (inspect document)
│   ├── {assetId}.txt                          # Extracted text
│   ├── {assetId}.json                         # Document metadata
│   └── {assetId}/                             # Multi-file extractions
│       ├── images/                            # Extracted images from PDFs
│       └── attachments/                       # PDF embedded files
│
├── files/                                      # File storage (room-level, not in widgets)
│   ├── notes/                                  # Example: Notepad widget files
│   │   ├── config.json                         # { currentNote, currentFolder }
│   │   ├── welcome.md                          # Note content (HTML)
│   │   ├── quick-notes.md
│   │   └── projects/                           # Nested folder
│   │       ├── .folder                         # Folder placeholder
│   │       └── project-alpha.md
│   ├── slides/                                 # Example slide deck widget files
│   ├── documents/                              # Example PDF generator files
│   └── sheets/                                 # Example spreadsheet files
│
├── room-252060fe-aabb-4c5d-.../                # Subcanvas (nested room)
│   ├── canvas-metadata.json
│   ├── canvas-state.json
│   ├── files/                                  # Each room has its own files/
│   └── widget-XUc7WesCe2PWoiEe/
│       ├── properties.json                     # Shape props (position, size, rotation, etc.)
│       ├── styling.md                          # Widget styling notes
│       ├── src/                                # Full TypeScript project (replaces template.jsx)
│       │   ├── App.tsx                         # Main component (entry point)
│       │   ├── main.tsx                        # Application entry point
│       │   ├── schemas.ts                      # Collection schemas
│       │   ├── constants.ts                    # Constants
│       │   ├── styles.css                      # Styles
│       │   ├── pages/
│       │   │   └── HomePage.tsx                # Home page component
│       │   ├── components/
│       │   │   └── ui/*.tsx                    # UI components
│       │   └── hooks/
│       │       └── index.ts                    # Custom hooks
│
└── widget-p0nDqOHs4tURnBGrIVwOV/                # Widget in root canvas
    ├── properties.json
    ├── styling.md
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── schemas.ts
    │   ├── constants.ts
    │   ├── styles.css
    │   ├── pages/HomePage.tsx
    │   ├── components/ui/*.tsx
    │   └── hooks/index.ts
```

# Allowed Commands for DeepSpace Agent

This repository enforces strict agent constraints. Read this document together with AGENTS.md and McAPI.yaml.

---

## Agent Constraints (Important)
- Allowed commands only: `create`
  - Do not use raw shell (e.g., `node`, `npm`, etc.).
  - Do not chain commands (no `&&`, `|`, `;`). Send one high‑level command at a time.
- Room scope only:
  - Active room ID is stored at `/app/container_vars.json` under `currentRoom`.
  - Work strictly under `/app/workspace/repo/<currentRoom>` (and nested `room-*` subrooms if any).
  - Never modify files outside the current room subtree.
- Outputs are auto‑managed by hooks:
  - Do not attempt to run bundlers; `template.html` is generated automatically on commit.
  - Do not attempt to run any git commands; this is handled for you automatically when you complete the request

---

## Widget Creation (Recommended path)
- Primary action: `create widget <template-id>`
  - Example: `create widget notepad`
  - Example: `create widget crm-workflow-guide`
- After creation:
  - Edit `template.jsx` and other .jsx files under the widget folder to implement behavior and UI.
- If the template exists in the library, the system scaffolds it; otherwise it creates a stub for you to modify.

---

## Document Inspection

- `inspect document <assetId>` - Fetch and process document from canvas
  - Supported types: PDF, DOCX, images, text files
  - What it does:
    - **PDF/DOCX**: Extracts text + metadata
    - **Images**: Fetches image (viewable with Read - Claude has vision)
    - **Text**: Fetches text content
  - Saves results to `.canvas-documents/`
  - Example: `inspect document abc123`
  - Example: `inspect document abc123 --extract-images`
  - Options (PDF only):
    - `--extract-images` - Extract embedded images from PDFs
    - `--extract-attachments` - Extract embedded files from PDFs
- After extraction, use Read tool to view the content
  - PDF/DOCX: `Read .canvas-documents/abc123.txt`
  - Images: `Read .canvas-documents/abc123.png`
  - Metadata: `Read .canvas-documents/abc123.json`

---

## Room Navigation

- `locate-room` - Find the full path to your current room
  - Uses room ID from `/app/container_vars.json`
  - Returns full path like `/app/workspace/repo/parent-room/your-room`
  - Example: `locate-room`
  - Example: `locate-room room-487be075-a712-4234-aa53-2017d8021e2e`
- Use this to find your workspace before starting work

---

## Prohibited Actions
- No shell/OS commands of any kind.
- No git commands
- No command chaining.
- Do not modify files outside the current room subtree.
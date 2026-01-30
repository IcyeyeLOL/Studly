# Allowed Commands for DeepSpace Agent

This repository enforces strict agent constraints. Read this document together with AGENTS.md and McAPI.yaml.

---

## Agent Constraints (Important)
- Allowed commands only: `create`
  - Do not use raw shell (e.g., `node`, `npm`, etc.).
  - Do not chain commands (no `&&`, `|`, `;`). Send one high‑level command at a time.
- Room scope only:
  - Your room path is stored at `/app/container_vars.json` under `currentRoomPath`.
  - Work strictly within `currentRoomPath` (not in nested `room-*` subrooms).
  - Never modify files outside the current room.
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

- `inspect document <asset_id_or_file_path>` - Fetch and process documents from canvas or chat attachments
  - **Accepts either**:
    - Asset ID (e.g., `GM2wo-KippGsBKzYPvYv3`) - fetches from canvas/R2
    - File path (e.g., `.chat-attachments/document.pdf`) - reads local file
  - Supported types: PDF, DOCX, images, text files
  - What it does:
    - **PDF/DOCX**: Extracts text + metadata
    - **Images**: Fetches image (viewable with Read - Claude has vision)
    - **Text**: Fetches text content
  - Saves results to `.canvas-documents/`
  - **Examples**:
    - `inspect document GM2wo-KippGsBKzYPvYv3` (canvas asset)
    - `inspect document .chat-attachments/report.pdf` (chat attachment)
    - `inspect document .chat-attachments/doc.pdf --extract-images` (with image extraction)
  - Options (PDF only):
    - `--extract-images` - Extract embedded images from PDFs
    - `--extract-attachments` - Extract embedded files from PDFs
- After extraction, use Read tool to view the content
  - PDF/DOCX: `Read .canvas-documents/{assetId}.txt`
  - Images: `Read .canvas-documents/{assetId}.png`
  - Metadata: `Read .canvas-documents/{assetId}.json`

---

## Prohibited Actions
- No shell/OS commands of any kind.
- No git commands
- No command chaining.
- Do not modify files outside the current room subtree.
# Allowed Commands for DeepSpace Agent

This repository enforces strict agent constraints. Read this document together with AGENTS.md and McAPI.yaml.

---

## Agent Constraints (Important)
- Allowed commands only: `create widget`, `add feature`, `inspect document`, and `upload file`
  - Do not use raw shell (e.g., `node`, `npm`, etc.).
  - Do not chain commands (no `&&`, `|`, `;`). Send one high‑level command at a time.
- Room scope only:
  - Your room path is stored at `/app/container_vars.json` under `currentRoomPath`.
  - Work strictly within `currentRoomPath` (not in nested `room-*` subrooms).
  - Never modify files outside the current room.
- Outputs are auto‑managed by hooks:
  - Do not attempt to run bundlers; widget output is generated automatically on commit.
  - Do not attempt to run any git commands; this is handled for you automatically when you complete the request

---

## Widget Creation (Recommended path)
- Primary action: `create widget <template-id>`
  - Example: `create widget notepad`
  - Example: `create widget crm-workflow-guide`
- After creation:
  - Edit files under the widget's `src/` directory to implement behavior and UI. The main component is `src/App.tsx`.
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

## File Upload to R2

Upload local files to permanent R2 storage and get a URL you can use in widgets.

- `upload file <path> [--content-type <mime>]` — Upload a file and get a permanent URL
  - `<path>` is relative to your current room. Use `.chat-attachments/file.png`, NOT `room-xxx/.chat-attachments/file.png`.

**When to use:**
- User provides an image (via chat) and wants it displayed in a widget
- User provides a PDF/document and wants it embedded or linked in a widget
- You need a permanent, publicly-accessible URL for any file in `.chat-attachments/`
- You generated an image via mcapi and need to re-upload a local copy

**What it returns:**
The command prints a permanent URL like:
```
https://canvas-sync.deepspace.tech/api/uploads/users~usr_abc~uploaded-550e8400.png
```
Use this URL directly in widget code as an `<img src="...">`, `<a href="...">`,
background-image, or any place that accepts a URL.

**Examples:**
- `upload file .chat-attachments/1709512345_photo.png`
- `upload file .chat-attachments/1709512345_report.pdf --content-type application/pdf`

**Typical workflow:**
1. User sends an image in chat → saved to `.chat-attachments/photo.png`
2. User says "use this image in a widget"
3. Run `upload file .chat-attachments/photo.png` → get permanent URL
4. Use the URL in widget code: `<img src="https://..." />`

---

## Feature Installation

Add pre-built features (CRUD pages, navigation, admin panels, kanban, etc.) to existing widgets.

- `add feature --list` — list available features by category
- `add feature --info <id>` — see what files a feature provides and how to integrate it
- `add feature <id> <widget-dir>` — install feature files into the widget directory

**What it does automatically:**
- Copies feature source files into the widget's `src/` directory
- Adds the feature's schema import and entry to `src/schemas.ts`

**What you must do manually after install:**
- Add the route to `src/App.tsx` (the script prints the exact code)
- Add the nav item (the script prints the label and path)

**Examples:**
- `add feature items-crud widget-my-app-ABC123` — adds CRUD page + schema
- `add feature admin-page widget-my-app-ABC123` — adds admin panel
- `add feature display-kanban widget-my-app-ABC123` — adds kanban board component

Read Features.md for the full feature catalog and composition examples.

---

## Direct Integration Calls (mcapi)

Call any integration endpoint directly from the shell to fetch real data during your work. Use this to gather context, validate schemas, answer user questions, or pre-populate widget content.

- `mcapi --list` — list all available integration endpoints by category
- `mcapi --describe <endpoint>` — show endpoint parameters and schema
- `mcapi <endpoint> [param=value ...]` — execute an integration endpoint

**Examples:**
- `mcapi generate-text prompt="Summarize this data" provider=openai model=gpt-4o-mini`
- `mcapi current-weather location="New York"`
- `mcapi wikipedia-summary title="Machine learning"`
- `mcapi news-top-headlines country=us category=technology`
- `mcapi firecrawl-scrape url="https://example.com"` — scrape a webpage for content
- `mcapi firecrawl-search query="React best practices" limit=3` — search the web and get scraped content
- `mcapi exa-search query="latest AI news" numResults=5` — neural web search
- `mcapi exa-answer query="What is quantum computing?"` — get an LLM answer from web sources

**Unsupported endpoints (do NOT call via mcapi):**
The following endpoints use non-standard calling conventions and will error if called via `mcapi`. Use them only via `mcapi.post()` in widget code:
- `search-web`, `search-web-raw`, `search-web-ai`, `search-pdfs`, `advanced-web-search`
- For web search via `mcapi`, use `firecrawl-search`, `exa-search`, or `exa-answer` instead.

**Notes:**
- **Always run `mcapi --describe <endpoint>` before calling an unfamiliar endpoint** to see the exact parameter names and types
- Credits are deducted per normal billing rules (same as widget mcapi calls)
- OAuth endpoints (Google Drive, Gmail, Slack) require the user to have connected their account in the DeepSpace UI first
- Response data is printed as JSON to stdout

---

## RecordRoom Storage Access (call)

Read and write widget storage data directly from the shell. Works in both canvas and miniapp modes.

- `call --list` — list all available storage tools
- `call --describe <tool>` — show a tool's parameters
- `call <tool> [param=value ...]` — execute a tool

**Examples:**
- `call schema.list` — see all collection schemas defined for this room
- `call schema.describe collection=tasks` — see fields and permissions for a collection
- `call records.query collection=tasks` — list all records in a collection
- `call records.query collection=tasks where='{"status":"todo"}' limit=10` — filtered query
- `call records.get collection=tasks recordId=abc123` — get a single record
- `call records.create collection=tasks data='{"title":"New task","status":"todo"}'` — create a record
- `call records.update collection=tasks recordId=abc123 data='{"status":"done"}'` — update a record
- `call records.delete collection=tasks recordId=abc123` — delete a record
- `call user.current` — get current user profile
- `call user.list` — list all users in this room
- `call yjs.list` — list all Yjs documents (collaborative text/data)
- `call yjs.getText collection=__widget_storage__ recordId=shape:notepad-xxx fieldName=data` — read Yjs text
- `call yjs.setText collection=__widget_storage__ recordId=shape:notepad-xxx fieldName=data text="Hello"` — write Yjs text

**Notes:**
- Always run `call schema.list` first to discover what collections exist
- RBAC permissions are enforced — the agent operates as the canvas owner
- Record fields live under `data.*` (e.g., `record.data.title`, not `record.title`)

---

## Prohibited Actions
- No shell/OS commands of any kind.
- No git commands
- No command chaining.
- Do not modify files outside the current room subtree.
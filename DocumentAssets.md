# Document Assets on Canvas

Documents (PDFs, DOCX, text files, etc.) placed on the canvas are stored as `general-asset-image-{assetId}.json` files in the room directory. Non-image files have `meta.isFileAsset: true`.

---

## Important: Asset Storage Convention

All files on canvas (images, PDFs, DOCX, etc.) are stored as `general-asset-image-{assetId}.json` with `type: "image"`. This is due to a tldraw limitation - tldraw only supports three asset types: `image`, `video`, `bookmark`.

**To identify the actual file type:**
- Check `meta.isFileAsset`: If `true`, it's a document file (not an actual image)
- Check `meta.originalMimeType`: Contains the real MIME type (e.g., `"application/pdf"`, `"application/vnd.openxmlformats-officedocument.wordprocessingml.document"`)
- Check `meta.originalFileName`: Contains the original filename

**Example - A DOCX file stored as an "image" asset:**
```json
{
  "type": "image",
  "meta": {
    "isFileAsset": true,
    "originalMimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "originalFileName": "report.docx"
  },
  "props": {
    "name": "report.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
}
```

Don't be confused by the `"image"` type and filename pattern - check the meta fields to understand what type of file it actually is.

---

## What you can see by default
- Metadata: filename, fileSize, mimeType (by reading the JSON file)
- That a document exists at a location

## What you CAN'T see without `inspect document`
- Text content
- Images embedded in PDFs
- Document structure and metadata (page count, author, etc.)
- PDF attachments

## When to use `inspect document {ASSET_ID}`
- User refers to a document on canvas (e.g., "that PDF I uploaded", "the report")
- You need to read document contents to complete a task
- You need to extract images from PDFs
- You need document metadata (author, page count, creation date)

## Supported File Types

### PDF Documents
- Text extraction → `.canvas-documents/{assetId}.txt`
- Metadata extraction → `.canvas-documents/{assetId}.json`
- Optional: Extract embedded images with `--extract-images`
- Optional: Extract attachments with `--extract-attachments`

### DOCX/DOC Documents
- Text extraction → `.canvas-documents/{assetId}.txt`
- Metadata → `.canvas-documents/{assetId}.json`

### Images (PNG, JPG, GIF, WebP)
- Saves image → `.canvas-documents/{assetId}.png` (or .jpg, etc.)
- **You can view images directly** - Claude has vision capabilities
- Use the Read tool to analyze image content

### Text/Code Files
- Saves content → `.canvas-documents/{assetId}.txt`

---

## Examples

### PDF or DOCX (Text Extraction)
```bash
# Process document (extracts text + metadata)
inspect document GM2wo-KippGsBKzYPvYv3

# Read extracted text
Read .canvas-documents/GM2wo-KippGsBKzYPvYv3.txt

# View metadata
Read .canvas-documents/GM2wo-KippGsBKzYPvYv3.json
```

### Images (Direct Viewing)
```bash
# Fetch and save image
inspect document kgskYiLqgdJ0bYeR2arZz

# View the image (Claude can see and analyze it)
Read .canvas-documents/kgskYiLqgdJ0bYeR2arZz.png
```

### PDF with Images
```bash
# Extract images from PDF (in addition to text + metadata)
inspect document abc123 --extract-images

# View extracted images
Read .canvas-documents/abc123/images/page-001.png
Read .canvas-documents/abc123/images/page-002.png
```

### PDF Attachments
```bash
# Extract embedded files from PDF
inspect document def456 --extract-attachments

# View attachments
Read .canvas-documents/def456/attachments/spreadsheet.xlsx
```

### Everything
```bash
# Extract text, metadata, images, and attachments
inspect document xyz789 --extract-images --extract-attachments
```

---

## Output Structure

After running `inspect document`, files are saved to `.canvas-documents/`:

```
.canvas-documents/
├── {assetId}.json          # Metadata (all types)
├── {assetId}.txt           # Extracted text (PDF/DOCX)
├── {assetId}.png           # Image file (for image-type documents)
└── {assetId}/              # Additional extractions (PDFs only)
    ├── images/             # Images extracted FROM PDF (with --extract-images)
    │   ├── page-001.png
    │   └── page-002.png
    └── attachments/        # PDF embedded files (with --extract-attachments)
        └── data.xlsx
```

**Note**: Image-type documents are saved directly (e.g., `abc123.png`), not in a subfolder. Images extracted FROM PDFs go in `abc123/images/`.

---

## NOT needed for
- Images in `.chat-attachments/` — these are already in your context
- Images that work with `inspect image` — use that for simpler image inspection

# Image Assets on Canvas

Images placed **on the canvas** are stored as `general-asset-image-{assetId}.json` files in the room directory. These are different from chat attachments.

---

## What you can see by default
- Metadata: filename, dimensions, mimeType (by reading the JSON file)
- That an image exists at a location

## What you CAN'T see without `inspect image`
- The actual visual content (pixels)

## When to use `inspect image {ASSET_ID}`
- User refers to an image **on the canvas** (e.g., "the chart I added", "that screenshot on my board")
- You need to understand visual content of a canvas asset to complete a task
- You see a `general-asset-image-*.json` and need to know what's depicted

## NOT needed for
- Images in `.chat-attachments/` — these are already provided in your conversation context (use `upload file` to get a permanent URL for widget use)
- Text/code content — use normal file reading

---

## Using images in widgets

Images in `.chat-attachments/` are local files — they can't be referenced by URL in widget code.
To use them in a widget, upload to R2 first:

1. `upload file .chat-attachments/photo.png` → prints a permanent URL
2. Use the URL in your widget: `<img src="https://..." />`

This also works for any local file you need a permanent URL for.

### In widget code (useR2Files)

When building a widget that handles user file uploads at runtime (e.g., `<input type="file">`), use `useR2Files`:

```tsx
import { useR2Files } from '@spaces/sdk/storage'

const { upload } = useR2Files()
const result = await upload(file, file.name)
// result.url → permanent URL, store this in a record
```

Works for all file types: images, PDFs, documents, audio, video, etc.
Never inline base64 data in records or JSX. See Storage.md for full docs.

---

## Example (canvas asset inspection)
```bash
# Inspect the image (fetches and saves to .canvas-images/)
inspect image GM2wo-KippGsBKzYPvYv3

# Then read the saved image to view its contents
Read .canvas-images/GM2wo-KippGsBKzYPvYv3.png
```


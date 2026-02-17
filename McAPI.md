# McAPI Integration

- **Import**: `import { mcapi } from '@spaces/sdk'`
- **McAPI.yaml** contains a summary of all integrations (names, descriptions, categories)
- **integrations/*.yaml** contain the full endpoint specifications with input/output schemas

## File Structure

```
prompts/
├── McAPI.yaml              # Summary: integration names, descriptions, category refs
└── integrations/
    ├── search.yaml         # Full specs for search endpoints
    ├── images.yaml         # Full specs for image endpoints
    ├── github.yaml         # Full specs for GitHub endpoints
    └── ...                 # One file per category
```

## How to Find an Endpoint

1. Open **McAPI.yaml** to see all available integrations organized by category
2. Find the endpoint you need and note its category
3. Open **integrations/{category}.yaml** for the full specification with input/output schemas

---

## Response Format (all integrations)
All responses follow this structure:
```javascript
// Success: { success: true, data: { ...payload } }
// Error:   { success: false, error: "message" }
```

---

## API Usage Pattern:
```javascript
import { mcapi } from '@spaces/sdk';

// POST requests (most integrations)
const response = await mcapi.post('/generate-text', { prompt: '...' });
if (response.success) {
  console.log(response.data.text);  // Access payload via response.data
}

// GET requests (fetching data)
const response = await mcapi.get('/flights', { from: 'NYC', to: 'LAX', date: '2025-06-15' });
```

---

## Example API Calls:
```javascript
import { mcapi } from '@spaces/sdk';

// Generate text with LLM
const response = await mcapi.post('/generate-text', {
  prompt: 'Explain quantum computing',
  provider: 'openai',
  model: 'gpt-4o-mini',
});
// Response: { success: true, data: { text: "...", provider: "openai", model: "gpt-4o-mini" } }
const text = response.data.text;

// Search Amazon products
const response = await mcapi.post('/amazon-search', { query: 'laptop', limit: 5 });
const products = response.data.products;

// Get weather data
const response = await mcapi.post('/current-weather', { location: 'New York' });
const weather = response.data.weather;
```

---

## Critical Rules:
- **Always access payload via `response.data`** (not `response.text`, `response.products`, etc.)
- **Use the `endpoint` field** with leading `/` (e.g., `/generate-text`)
- Use `mcapi.post()` for most integrations
- Use `mcapi.get()` for simple data fetches
- Check `output.data` schema in **integrations/{category}.yaml** for available fields

---

## ⚠️ CRITICAL: Trust the Schema

**The response structure in McAPI.yaml is EXACTLY what you get.** Do not assume wrappers or transformations based on other libraries you've seen.

### Before Using mcapi:
1. **Find the endpoint in McAPI.yaml** (summary file)
2. **Read the full schema in integrations/{category}.yaml**
3. **Use exactly the structure shown** — no additions, no assumptions
4. **If unsure, re-read the schema** — it's the single source of truth

### Common Mistake:
```javascript
// ❌ WRONG - Adding layers that don't exist
response.data.data.text   // Where did the extra .data come from?

// ✅ CORRECT - Match the schema exactly
response.data.text        // Schema says: { success, data: { text } }
```

**If the schema says `data.text`, write `response.data.text`. Don't add extra layers from muscle memory.**

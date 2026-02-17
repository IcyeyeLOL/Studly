# Integrations & McAPI System

This document explains how the DeepSpace integrations system works, including how endpoints are defined, documented, and exposed to the AI agent.

## Overview

The integrations system provides 130+ API endpoints across 24 categories (search, images, calendar, GitHub, etc.) that the AI agent can call to perform actions on behalf of users. The system uses a "schema-first" approach where:

1. **Zod schemas** define endpoint inputs/outputs in TypeScript
2. **YAML files** are auto-generated for the AI agent to read
3. **JSON catalog** is generated for the web UI integrations explorer

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        apps/api                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  src/services/integrations/schemas/index.ts                 │    │
│  │  ─────────────────────────────────────────────────────────  │    │
│  │  ROUTE_SPECS: RouteSpec[] = [                               │    │
│  │    { method, path, description, category,                   │    │
│  │      bodySchema, responseSchema, ... }                      │    │
│  │  ]                                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  scripts/generate-mcapi.ts                                  │    │
│  │  ─────────────────────────────────────────────────────────  │    │
│  │  Converts Zod → JSON Schema → YAML                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ McAPI.yaml       │  │ integrations/    │  │ catalog.json     │
│ (summary)        │  │ *.yaml (full)    │  │ (web UI)         │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                      │
        └──────────┬───────────┘
                   ▼
         ┌──────────────────┐
         │  AI Agent reads  │
         │  YAML specs      │
         └──────────────────┘
```

## File Locations

| File | Purpose |
|------|---------|
| `apps/api/src/services/integrations/schemas/index.ts` | Source of truth - Zod schemas |
| `apps/agentapi/src/prompts/McAPI.yaml` | Summary file - quick reference |
| `apps/agentapi/src/prompts/integrations/*.yaml` | Full specs per category |
| `apps/api/src/services/integrations/catalog.json` | JSON catalog for web UI |
| `apps/api/scripts/generate-mcapi.ts` | Generator script |

## RouteSpec Interface

Each endpoint is defined using the `RouteSpec` interface:

```typescript
interface RouteSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string                    // Express-style: /weather-forecast
  description?: string            // Human-readable description
  category?: string               // Groups endpoints: 'weather', 'search', etc.
  paramsSchema?: z.ZodTypeAny     // URL params like :id
  querySchema?: z.ZodTypeAny      // Query string params
  bodySchema?: z.ZodTypeAny       // Request body (POST/PATCH)
  responseSchema?: z.ZodTypeAny   // Response shape
  includeInMcapi?: boolean        // Set false to hide from agent
}
```

## Example: Adding a New Endpoint

### Step 1: Define the RouteSpec

In `apps/api/src/services/integrations/schemas/index.ts`:

```typescript
{
  method: 'POST',
  path: '/my-new-endpoint',
  description: 'Does something useful',
  category: 'my-category',
  bodySchema: z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  responseSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
    error: z.string().optional(),
  }),
}
```

### Step 2: Implement the Route Handler

In `apps/api/src/routes/integrations/` or via auto-routes.

### Step 3: Regenerate YAML Files

```bash
cd apps/api
pnpm run generate:mcapi
```

This creates/updates:
- `apps/agentapi/src/prompts/integrations/my-category.yaml`
- `apps/agentapi/src/prompts/McAPI.yaml` (summary)
- `apps/api/src/services/integrations/catalog.json`

## Generated YAML Format

### McAPI.yaml (Summary)

Quick reference listing all categories and endpoints:

```yaml
categories:
  weather:
    file: integrations/weather.yaml
    endpoint_count: 3
    endpoints:
      - name: current_weather
        method: POST
        endpoint: /current-weather
        description: "Get current weather"
      - name: weather_forecast
        method: POST
        endpoint: /weather-forecast
        description: "Get 5-day forecast"
```

### Category Files (Full Specs)

Individual files with complete input/output schemas:

```yaml
# weather.yaml
tools:
  current_weather:
    method: POST
    endpoint: /current-weather
    description: "Get current weather"
    input_schema:
      type: object
      properties:
        location:
          type: string
          minLength: 1
        units:
          type: string
          enum: [metric, imperial, kelvin]
      required:
        - location
    output:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            weather:
              type: object
              properties:
                temp: { type: number }
                humidity: { type: number }
                description: { type: string }
        error:
          type: string
      required:
        - success
```

## How the AI Agent Uses Integrations

The agent reads `McAPI.yaml` to discover available endpoints, then calls them via `mcapi`:

```typescript
import { mcapi } from '@spaces/sdk';

const weather = await mcapi.post('/current-weather', {
  location: 'San Francisco',
  units: 'metric'
})

// Response
{
  success: true,
  data: {
    weather: {
      temp: 18.5,
      humidity: 72,
      description: "Partly cloudy"
    }
  }
}
```

## Categories

Current integration categories:

| Category | Endpoints | Description |
|----------|-----------|-------------|
| amazon | 1 | Product search |
| audio | 2 | Text-to-speech, speech-to-text |
| calendar | 2 | Google Calendar events |
| document | 3 | File conversion, text extraction |
| formula1 | 13 | F1 race data, standings |
| github | 18 | Repos, PRs, commits, issues |
| gmail | 11 | Email, contacts, Drive |
| images | 24 | Generation, editing, stock |
| internal | 3 | Canvas users, current user |
| linkedin | 4 | Profile search, messaging |
| market | 3 | Stocks, crypto |
| nasa | 7 | APOD, asteroids, space weather |
| news | 2 | Headlines, search |
| polymarket | 12 | Prediction markets |
| scholar | 7 | Academic papers, authors |
| search | 8 | Web, images, videos, PDFs |
| submagic | 3 | Video creation |
| text-generation | 1 | LLM text generation |
| tiktok | 4 | Video posting |
| travel | 5 | Flights, hotels, places |
| video | 1 | Video generation |
| weather | 3 | Current, forecast |
| wikipedia | 4 | Search, content |
| youtube | 3 | Search, trending |

## Response Envelope

All endpoints return a standard envelope:

```typescript
{
  success: boolean,      // Always present
  data?: { ... },        // Present on success
  error?: string         // Present on failure
}
```

## Validation

Request validation happens automatically via the Zod schemas:
1. `paramsSchema` validates URL parameters (`:id`)
2. `querySchema` validates query strings (`?limit=10`)
3. `bodySchema` validates request bodies
4. `responseSchema` validates (and documents) responses

Invalid requests return 400 with error details:
```json
{
  "error": "Invalid body",
  "details": {
    "fieldErrors": {
      "location": ["Required"]
    }
  }
}
```

## Web UI Integration Explorer

The `/integrations` page in the web app displays all available endpoints using `catalog.json`. Users can:
- Browse endpoints by category
- Search endpoints
- View input/output schemas
- Try endpoints directly (authenticated)

## Regenerating Files

After modifying `ROUTE_SPECS`, regenerate all files:

```bash
cd apps/api
pnpm run generate:mcapi
```

This runs `scripts/generate-mcapi.ts` which:
1. Groups specs by category
2. Converts Zod schemas to JSON Schema
3. Emits YAML for each category
4. Emits summary McAPI.yaml
5. Emits catalog.json for web UI

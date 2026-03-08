# Scheduled Tasks (Cron)

Run background tasks on a schedule, billed to the app owner. Use for: daily content generation, periodic cleanup, data aggregation, scheduled notifications.

## How It Works

1. Create `cron.json` in the widget root — declares tasks
2. Create `src/cron.ts` — implements the handler that runs on schedule
3. That's it — the platform auto-registers and runs your tasks on next deploy

The handler receives a `CronContext` with data access and optional integration calls. The platform handles scheduling, auth, and billing.

## Scheduling Modes

Each task uses **one** mode — not both.

### Interval Mode

Run every N minutes from last execution. Simple, no timezone needed.

```json
{
  "tasks": [
    { "name": "daily-digest", "intervalMinutes": 1440 },
    { "name": "hourly-sync", "intervalMinutes": 60 }
  ]
}
```

Common values: `1440` = daily, `60` = hourly, `30` = every 30 min, `10080` = weekly.

### Cron Expression Mode

Standard 5-field cron expression with an IANA timezone. Use when you need time-of-day or day-of-week precision.

```json
{
  "tasks": [
    { "name": "morning-report", "schedule": "0 9 * * 1-5", "timezone": "America/New_York" },
    { "name": "nightly-cleanup", "schedule": "0 2 * * *", "timezone": "UTC" }
  ]
}
```

Fields: `minute hour day-of-month month day-of-week`

| Expression | Meaning |
|---|---|
| `* * * * *` | Every minute |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Top of every hour |
| `0 9 * * *` | 9:00 AM daily |
| `0 9 * * 1-5` | 9:00 AM weekdays |
| `0 12 * * *` | Noon daily |
| `30 8,17 * * *` | 8:30 AM and 5:30 PM |
| `0 0 1 * *` | Midnight on the 1st of each month |
| `0 0 * * 0` | Midnight every Sunday |

Day-of-week: 0 = Sunday, 6 = Saturday.

**Timezone** must be a valid IANA timezone string: `UTC`, `America/New_York`, `Europe/London`, `Asia/Tokyo`, etc.

## src/cron.ts — Handler

```typescript
import type { CronContext } from '@spaces/sdk/worker'

export async function handler(taskName: string, ctx: CronContext): Promise<void> {
  switch (taskName) {
    case 'daily-digest':
      await generateDailyDigest(ctx)
      break
    case 'hourly-sync':
      await syncData(ctx)
      break
  }
}
```

## CronContext API

```typescript
// Data access (RecordRoom — same collections as your frontend useQuery/useMutations)
ctx.records.query(collection, { where, limit })   // Query records
ctx.records.create(collection, data)                // Create a record
ctx.records.update(collection, recordId, data)      // Update a record
ctx.records.delete(collection, recordId)            // Delete a record

// Integration calls (optional — billed to app owner)
// Returns { success, data: { ... } } — same shape as mcapi.post()
ctx.integrations.call(endpoint, params)             // Same endpoints as mcapi.post()

// Owner info
ctx.ownerUserId                                     // App owner's Clerk user ID
```

## Common Patterns

### Daily content with duplicate prevention
```typescript
async function generateDaily(ctx: CronContext) {
  const today = new Date().toISOString().split('T')[0]
  const existing = await ctx.records.query('daily_content', { where: { date: today } })
  if (existing.length > 0) return // Already generated today

  const result = await ctx.integrations.call('generate-text', {
    model: 'gpt-4o', prompt: 'Generate daily content...'
  })

  await ctx.records.create('daily_content', {
    date: today,
    content: result.data.text,
    generatedAt: new Date().toISOString(),
  })
}
```

### Periodic cleanup
```typescript
// cron.json: { "name": "cleanup-old", "intervalMinutes": 1440 }
async function cleanupOld(ctx: CronContext) {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
  const old = await ctx.records.query('temp_data', { where: {} })
  for (const record of old) {
    if (record.data.createdAt < cutoff) {
      await ctx.records.delete('temp_data', record.recordId)
    }
  }
}
```

## Rules

- **Always check for duplicates** before creating records — the handler may run again if there's a timing edge case
- **ctx.integrations.call() costs credits** — check if work is needed before calling
- **Handler runs in Cloudflare Worker** — no Node.js filesystem APIs, 30-second execution limit
- **ctx.records operates on the 'default' RecordRoom** — same data your frontend sees
- **Two files needed:** `cron.json` (task declarations) in widget root and `src/cron.ts` (handler) — create both manually
- **Each task uses one mode:** either `intervalMinutes` or `schedule`+`timezone`, never both

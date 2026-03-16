# Agent Context Files

When you build or significantly modify a widget, create/update two files in the widget directory root (next to `src/`). These are shipped with the deployed app and give its AI chat agent full context about the app — without them, the deployed agent knows nothing about what it's helping with.

## `agent-description.md`

Describe the app so a separate AI agent (who has never seen the code) can understand it. Include:

- **Purpose** — 1-2 sentence summary
- **Features** — bullet list of user-facing capabilities
- **UI Structure** — main pages/views and what they show
- **User Flows** — common things a user does, step by step

Do NOT duplicate the data model here — `schemas.ts` is the authoritative source of truth for collections, fields, types, and permissions. The deployed agent reads `schemas.ts` directly.

### Example

```markdown
# HyperFoodie — Recipe Tracker

A recipe saving and organization app. Users save recipes from Instagram or enter them manually, organize by meal type, and generate grocery lists.

## Features
- Save recipes from Instagram URLs (auto-extracts ingredients, instructions, images)
- Manual recipe entry with structured fields
- Filter by meal type (Breakfast, Dinner, Dessert, Snack, Other)
- Star/unstar favorites
- Auto-generated grocery list from selected recipes

## UI Structure
- **Home page**: Recipe grid with search, meal type filter tabs, star toggle
- **Recipe detail**: Ingredients, instructions, image
- **Add Recipe page**: Manual entry or Instagram URL paste
- **Grocery List page**: Checklist from selected recipes
```

## `agent-prompt.md`

Instructions for the deployed AI agent. This agent can ONLY read/write data via the `call` command — it cannot see or edit code. Include:

- **Role** — what kind of assistant it should be
- **Common requests** — what users ask and how to handle each (with exact `call` commands)
- **Data conventions** — field formats, valid enum values
- **Boundaries** — what it can and can't do

### Example

```markdown
# Agent Instructions — HyperFoodie

You are a cooking assistant. Help users manage their recipe collection and grocery lists.

## Common Requests

### "Save this recipe" / user pastes a URL
1. Extract: title, ingredients, instructions, author, mealType
2. `call records.create collection=recipes data='{"title":"...","ingredients":[...]}'`
3. Confirm what was saved

### "What recipes do I have?"
1. `call records.query collection=recipes`
2. Summarize: titles with meal types and star status

### "Star/unstar a recipe"
1. `call records.query collection=recipes where='{"title":"..."}'`
2. `call records.update collection=recipes recordId=<id> data='{"starred":true}'`

### "Make a grocery list from [recipes]"
1. Query the recipes for ingredients
2. Create groceryList entries per ingredient
3. Confirm the list

## Data Conventions
- Timestamps: ISO 8601
- `mealType`: lowercase — breakfast, dinner, dessert, snack, other
- `tags`: lowercase string array

## Boundaries
- Can read/write recipes and grocery list items
- Cannot modify user profiles (system-managed)
- If user asks to "edit the app" or "change the design" — explain you can only manage data
```

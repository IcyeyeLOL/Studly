# Agent

You are an expert software engineer with strong typescript and front end abilities. Your goal is to fulfill the user requests.

**CRITICAL**: YOU MUST FOLLOW ALL THE RULES OF THIS PROJECT WITH NO EXCEPTION.

---

## Reference Files

Make sure you read the full content of AGENTS.md (this file) as well as all the files listed below:

- AppGuide.md — user-facing app features, capabilities, and common workflows
- McAPI.yaml — API endpoint summary (names, descriptions, categories)
- integrations/*.yaml — full endpoint specs with input/output schemas (one file per category)
- AllowedCommands.md — permitted commands and agent constraints
- RoomStructure.md — file/folder layout of a canvas room
- DO_DONT.md — best practices and common pitfalls
- Storage.md — data schemas, collections, and permissions (schemas defined in `src/schemas.ts`)
- ImageAssets.md — working with images on the canvas
- DocumentAssets.md — working with documents (PDF, DOCX) on canvas
- Hooks.md — quick reference for all available hooks
- McAPI.md — mcapi usage patterns and examples
- Styling.md — rules for when to apply or preserve widget styling
- SkeletonGuide.md — how the widget skeleton works, what each file does, the build sequence

---

## Your Task

1. **Clarify if needed** — if the request is ambiguous or you're unsure what the user wants, ask a clarifying question before starting work. Don't guess.

2. **Clarify scope** — for broad requests, think through what components this might involve, then ask the user which parts they want. Don't assume.

3. **Confirm the design** — before coding complex features, propose a high-level design: what components will exist, what properties/behaviors they'll have, how they'll work from the user's perspective. Get confirmation that this matches what the user has in mind. This is about *what* you'll build, not *how* you'll code it.

4. **Assess complexity** — once you know what the user wants, for complex requests plan your work before coding
5. **Analyze** the current widget ecosystem and their interactions
6. **Implement** changes to widget JSX code and storage patterns
7. **Verify** widgets work together harmoniously

For simple requests (single widget changes, small fixes), skip steps 1-3 and just do the work.

---

## Guidelines

- **CRITICAL**: Before you start working on the user request, read DO_DONT.md

- **CRITICAL**: Before building widgets that need external data, check McAPI.yaml to verify the integration exists. If it doesn't, explain the limitation and direct user to request it from the Integrations panel (puzzle icon → Browse Integration Catalog → Suggest Integration).

- **CRITICAL**: Before modifying widget styling, read Styling.md

- **Room scope only**:
  - Your room path is stored at `/app/container_vars.json` under `currentRoomPath`.
  - Work strictly within `currentRoomPath` (not in nested `room-*` subrooms).
  - Never modify files outside the current room.

- **Outputs are auto-managed by hooks**:
  - Do not attempt to run bundlers; widget output is generated automatically.

- **Preserve existing data**: Never lose user's current information when modifying widgets.

- **Performance-conscious**: Avoid unnecessary re-renders or heavy computations.

---

## Terminal Commands

- **CRITICAL**: Before you execute a terminal command, read AllowedCommands.md
- **CRITICAL**: DO NOT RUN commands like:
  - `node /app/workspace/repo/agent_scripts/generate_widget.js` — always use `create widget $WIDGET_ID`
  - `git add/commit/push` — the system handles this

---

## API Integration System (mcapi)

- **CRITICAL**: Before you use an integration, read McAPI.md
- **CRITICAL**: DO NOT HALLUCINATE API CALLS — only use endpoints listed in McAPI.yaml
- **CRITICAL**: The response structure in the integration files is EXACTLY what you get. Do not assume wrappers or transformations.

**File Structure:**
- **McAPI.yaml** — Summary file with endpoint names, descriptions, and categories
- **integrations/*.yaml** — Full specifications with input/output schemas (one file per category)

**How to use:**
1. Open McAPI.yaml to find the endpoint you need
2. Note the category (e.g., `search`, `images`, `github`)
3. Open integrations/{category}.yaml for the full input/output schema
4. Use the schema exactly as documented

---

## Canvas System Overview

### What is a Canvas?

A **Canvas** is a collaborative workspace where users can place and interact with **widgets** - interactive React components that serve specific purposes. Each canvas has:

- **Room ID**: Unique identifier for the collaborative space
- **Widgets**: Interactive React components positioned on pages
- **Storage**: RecordRoom-based persistent data with schemas, collections, and RBAC permissions
- **Sub-canvases**: optional

### Widget Architecture

Widgets are **iframe-based React applications** that run independently and communicate with each other through a sophisticated storage system. Each widget:

- Runs in its own isolated iframe for security
- Has a unique `shapeId` and `widgetId`
- Contains a `src/` directory with TypeScript/React source code that defines its functionality
- Has position (x, y) and size (width, height) properties (stored in properties.json)
- Can store data in collections defined by `src/schemas.ts`

### Widget Communication

- **CRITICAL**: Use `useQuery/useMutations` for shared persistent data via collections (see Storage.md)

---

### What This Means for Widget Development

#### Imports

Everything must be explicitly imported. Nothing is available as a global.

```jsx
// React
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Storage hooks — from '@spaces/sdk/storage'
import { useQuery, useMutations, useYjsText, useYjsField, useUser, useUsers, useTeams } from '@spaces/sdk/storage';

// API client — from '@spaces/sdk'
import { mcapi } from '@spaces/sdk';
```

| Import | From | Purpose |
|--------|------|---------|
| `useQuery`, `useMutations` | `@spaces/sdk/storage` | Read/write collection data |
| `useYjsText`, `useYjsField` | `@spaces/sdk/storage` | Real-time Yjs sync |
| `useUser`, `useUsers`, `useTeams` | `@spaces/sdk/storage` | User/team info |
| `mcapi` | `@spaces/sdk` | API calls (`mcapi.post()`, `mcapi.get()`) |

- Legacy hooks (deprecated, for old widgets only): `useStorage`, `useFiles`, `useGlobalStorage`, `useUserStorage`, `useInput`, `useOutput`.

#### Template Library (reusable widgets)

- The full library of reusable widget sources is available on disk at:
  - `/app/workspace/repo/agent_scripts/templates/`
  - Each folder under this path is a template ID: `/app/workspace/repo/agent_scripts/templates/<template-id>/` (contains the `src/` directory structure with `App.tsx`, `main.tsx`, `schemas.ts`, `constants.ts`, `styles.css`, `pages/`, `components/`, `hooks/`).

- Reuse flow (when applicable):
  - Inspect the library path above to choose the matching `<template-id>` for the user's request.
  - Use your existing "create widget <template-id>" action. The system will scaffold the widget from the library automatically (and bundle it via hooks).

- Notes:
  - Keep helper imports within `./components`, `./pages`, `./hooks` (and `./constants.ts`, `./schemas.ts` if needed) to ensure portability and reuse.
  - Avoid cross-widget relative imports.

#### Automatic Features

- **Storage persistence** - Data in collections survives widget reloads
- **Real-time sync** - `useQuery` subscriptions update all users instantly via WebSocket
- **RBAC permissions** - Server enforces read/write/delete permissions per role per collection
- **Authentication** - API calls and storage are automatically authenticated
- **Error handling** - Built-in API error management

---

### Widget Bundling Process

#### How It Works

1. **TypeScript Source** → You modify files in the widget's `src/` directory (`App.tsx` is the main component, `main.tsx` is the entry point)
2. **Bundling** → The build system bundles the widget from `src/main.tsx` (supports multi-file imports across the `src/` directory)
3. **CSS** → `src/styles.css` is compiled via Tailwind CLI (supports `@apply` and custom classes)
4. **HTML Output** → Final HTML with an IIFE bundle and auto-render scaffold is generated
5. **Widget Rendering** → HTML loads in iframe and renders your component

#### Why TypeScript Projects

- **Full project structure** - Widgets are organized TypeScript projects with `src/` directory
- **Type safety** - TypeScript catches errors at build time
- **Modular architecture** - Pages, components, hooks, constants, and schemas are well-separated
- **Script Injection** - Runtime scripts are automatically added during compilation

---

## Storage System

- **CRITICAL**: Before implementing persistent state, read Storage.md
- **CRITICAL**: When creating a widget that needs data, define schemas in `src/schemas.ts`
- **CRITICAL**: Use the correct hooks:
  - `useQuery(collection, options?)` — read data from a collection (real-time sync)
  - `useMutations(collection)` — returns `{ create, put, remove }` for writing data
  - `useYjsText(collection, recordId, field)` — collaborative text editing
  - `useUser()` — current user with role
- **CRITICAL**: Permissions are defined in `src/schemas.ts` per collection and enforced server-side

---

## Image Assets on Canvas

- **CRITICAL**: Before adding/modifying images on canvas, read ImageAssets.md
- **CRITICAL**: Key rules:
  - Use `inspect document` or `inspect image` commands to access canvas images
  - Never hardcode image paths or URLs

---

## Hooks

- **CRITICAL**: Before using DeepSpace-specific hooks, read Hooks.md
- **CRITICAL**: Available hooks:
  - `useUser()` — current user profile and role
  - `useQuery(collection, options?)` — real-time query subscriptions
  - `useMutations(collection)` — `{ create, put, remove }` for CRUD
  - `useYjsText(collection, recordId, field)` — collaborative text editing
  - `useUsers()` — all users in room + role management
- **CRITICAL**: Do NOT use deprecated hooks (`useStorage`, `useFiles`, `useGlobalStorage`, `useInput`, `useOutput`) for new widgets

---

## Tools You Have Access To

You can only use these console commands:

**`create widget ${TEMPLATE_ID}`**
- If the template is a known template from `/app/workspace/repo/agent_scripts/templates`, the tool will do all the work
- If the template is not under `/app/workspace/repo/agent_scripts/templates`, the tool will do just scaffolding, and you will need to modify files in the `src/` directory (starting with `src/App.tsx`)

**`inspect document ${ASSET_ID} [options]`**
- Fetches and processes documents from canvas
- Supported: PDF, DOCX, images (PNG/JPG/etc), text files
- What it does by type:
  - **PDF/DOCX**: Extracts text + metadata → `.canvas-documents/{assetId}.txt` and `.json`
  - **Images**: Saves image file → `.canvas-documents/{assetId}.png` (viewable with Read - Claude has vision)
  - **Text**: Saves content → `.canvas-documents/{assetId}.txt`
- After processing, use Read tool to view the content
- Options (PDF only):
  - `--extract-images` - Also extract embedded images from PDFs → `.canvas-documents/{assetId}/images/`
  - `--extract-attachments` - Also extract embedded files from PDFs

**`inspect image ${ASSET_ID}`** (deprecated - use `inspect document` instead)
- Analyzes an image on the canvas and returns a description of its contents
- Use when you need to understand what's depicted in a canvas image

---

## Available React Environment

- **React 18**: Full hooks API (`useState`, `useEffect`, `useMemo`, `useCallback`, etc.)
- **Data hooks**: `useQuery(collection)`, `useMutations(collection)`, `useYjsText(collection, id, field)` — import from `@spaces/sdk/storage`
- **User hooks**: `useUser()`, `useUsers()`, `useUserLookup()`, `useTeams()` — import from `@spaces/sdk/storage`
- **I/O hooks (deprecated)**: `useInput(slotId, default)`, `useOutput(slotId)` — still work in old widgets, do not use for new ones
- **API Access**: `mcapi.post(endpoint, data)`, `mcapi.get(endpoint, params)` — import from `@spaces/sdk`
- **Modern JavaScript**: ES6+, async/await, destructuring, etc.

---

## Widget Creation and Modification

In the widget directory, maintain modularity using the `src/` directory structure:
- Keep central logic in `src/App.tsx` (main component)
- Use `src/pages/` for page-level components
- Use `src/components/ui/` for reusable UI components
- Use `src/hooks/` for custom React hooks
- Use `src/constants.ts` for constants and `src/schemas.ts` for collection schemas

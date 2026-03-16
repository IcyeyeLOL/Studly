# Studly Homework Helper

An AI-powered homework help widget backed by the Studly backend (https://studly-eosin.vercel.app).

## Features
- Subject picker: Math, Science, English, History, Computer Science, Business, Other
- Question input with Cmd+Enter shortcut and example question filler
- Streams AI answers in real-time from the Studly backend (`/api/solve/stream`)
- Backend health status indicator
- Cancel in-flight requests

## UI Structure
- **Header**: Studly branding + backend status pill
- **Subject tabs**: colored pill buttons
- **Input area**: textarea + "Get Answer" button + cancel
- **Answer area**: streamed answer or feature showcase when empty

## Backend
Calls `https://studly-eosin.vercel.app/api/solve/stream` with `Authorization: Bearer <token>` from `getWidgetAuthToken()`. Returns NDJSON streaming response.

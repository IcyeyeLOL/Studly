/**
 * Collection Schemas
 * 
 * Defines all collections with fields and RBAC permissions.
 * This is the SINGLE SOURCE OF TRUTH - imported by both worker and frontend.
 * 
 * Roles (stored on user records):
 * - viewer: Read-only access (default for new users)
 * - member: Can create and edit own content
 * - admin: Full access (automatically assigned to global admins)
 * 
 * To add features, copy schema files to src/schemas/ then import:
 *   import { itemsSchema } from './schemas/items-schema'
 *   import { challengesSchema } from './schemas/tasks-schema'
 *   import { teamsSchemas } from './schemas/teams-schema'
 *   import { settingsSchema } from './schemas/admin-schema'
 */

import type { CollectionSchema } from '@spaces/sdk/worker'
import { USERS_COLLECTION_FIELDS } from '@spaces/sdk/worker'
import { settingsSchema } from './schemas/admin-schema'

// ============================================================================
// Users Collection (required)
// ============================================================================

const usersSchema: CollectionSchema = {
  name: 'users',
  fields: {
    ...USERS_COLLECTION_FIELDS,
  },
  permissions: {
    viewer: { 
      read: 'own',
      create: false,
      update: 'own', 
      delete: false,
      writableFields: [],
    },
    member: { 
      read: true,
      create: false,
      update: 'own', 
      delete: false,
      writableFields: [],
    },
    admin: { read: true, create: false, update: true, delete: true },
  },
}

// ============================================================================
// Todos Collection
// Shared todos list — all members can create, update, delete own items.
// editingBy / editingByName fields enable real-time "who is editing" display.
// ============================================================================

const todosSchema: CollectionSchema = {
  name: 'todos',
  fields: {
    text: { type: 'string', required: true },
    done: { type: 'boolean' },
    priority: { type: 'string' },       // 'normal' | 'high'
    addedBy: { type: 'string' },        // display name of creator
    editingBy: { type: 'string' },      // userId of the user currently editing
    editingByName: { type: 'string' },  // display name of the user currently editing
    updatedAt: { type: 'string' },      // ISO timestamp for last-write-wins conflict resolution
  },
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: true, create: true, update: true, delete: true },
    viewer: { read: true, create: false, update: false, delete: false },
    '*': { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// Presence Collection
// Each user writes their own heartbeat record so others can see who is online.
// Records older than 20s are treated as offline by the frontend.
// ============================================================================

const presenceSchema: CollectionSchema = {
  name: 'presence',
  fields: {
    userId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    color: { type: 'string', required: true },   // hex color for the avatar bubble
    lastSeen: { type: 'string', required: true }, // ISO timestamp
  },
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: true, create: true, update: true, delete: true },
    viewer: { read: true, create: true, update: 'own', delete: false },
    '*': { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// Export all schemas
// ============================================================================

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  todosSchema,
  presenceSchema,
]

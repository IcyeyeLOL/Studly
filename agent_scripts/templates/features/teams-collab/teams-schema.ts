/**
 * Teams Feature - Schema
 * 
 * Team-based collaboration demonstrating:
 * - 'team' permission level for team-scoped access
 * - teamField for team membership checks
 * - Yjs fields for real-time collaborative editing
 */

import type { CollectionSchema } from '@spaces/sdk/worker'

// Shared documents (anyone can see, members can create/edit)
export const sharedDocsSchema: CollectionSchema = {
  name: 'shared-docs',
  fields: {
    title: { type: 'string', required: true },
    content: { type: 'yjs' }, // Collaborative content using Yjs
    createdById: { type: 'string', required: true, userBound: true, immutable: true },
  },
  ownerField: 'createdById',
  permissions: {
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: true, delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// Team documents (only team members can access)
export const teamDocsSchema: CollectionSchema = {
  name: 'team-docs',
  fields: {
    teamId: { type: 'string', required: true, immutable: true },
    title: { type: 'string', required: true },
    content: { type: 'yjs' },
  },
  teamField: 'teamId', // Required for 'team' permission level
  permissions: {
    viewer: { read: 'team', create: false, update: false, delete: false },
    member: { read: 'team', create: true, update: 'team', delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// Export both schemas as array for easy spreading
export const teamsSchemas = [sharedDocsSchema, teamDocsSchema]

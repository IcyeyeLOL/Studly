/**
 * RBAC Test Feature - Schemas
 * 
 * Multiple collections that exercise every RBAC permission pattern:
 * - Collection-level deny (viewer can't create/update/delete)
 * - 'own' permission (member can only edit/delete own records)
 * - writableFields (member can only update specific fields)
 * - immutable fields (cannot change after creation)
 * - userBound fields (auto-set to current user)
 * - 'unclaimed-or-own' (claiming pattern)
 * - 'team' permission (team-scoped access)
 * - Admin-only collection (viewer/member fully denied)
 */

import type { CollectionSchema } from '@spaces/sdk/worker'

/**
 * Notes collection — demonstrates ownership + writableFields
 * 
 * - viewer: read-only
 * - member: create, edit own (title + body only), delete own
 * - admin: full access
 */
export const rbacNotesSchema: CollectionSchema = {
  name: 'rbac-notes',
  fields: {
    title: { type: 'string', required: true },
    body: { type: 'string', default: '' },
    category: { type: 'string', default: 'general' },
    ownerId: { type: 'string', required: true, userBound: true, immutable: true },
  },
  ownerField: 'ownerId',
  permissions: {
    viewer: {
      read: true,
      create: false,
      update: false,
      delete: false,
    },
    member: {
      read: true,
      create: true,
      update: 'own',
      delete: 'own',
      // Can only update title and body — NOT category
      writableFields: ['title', 'body'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * Bounties collection — demonstrates unclaimed-or-own claiming
 * 
 * - viewer: read-only
 * - member: can claim unclaimed bounties, edit own claimed, writable fields restricted
 * - admin: full access
 */
export const rbacBountiesSchema: CollectionSchema = {
  name: 'rbac-bounties',
  fields: {
    title: { type: 'string', required: true },
    reward: { type: 'number', default: 10 },
    claimedById: { type: 'string' },
    status: { type: 'string', default: 'open' },
    submission: { type: 'string' },
    createdById: { type: 'string', required: true, userBound: true, immutable: true },
  },
  ownerField: 'claimedById',
  permissions: {
    viewer: {
      read: true,
      create: false,
      update: false,
      delete: false,
    },
    member: {
      read: true,
      create: true,
      update: 'unclaimed-or-own',
      delete: 'own',
      writableFields: ['claimedById', 'status', 'submission'],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * Team posts collection — demonstrates team-scoped permissions
 * 
 * - viewer: can only read posts from own team
 * - member: can read + create + update own team's posts
 * - admin: full access
 */
export const rbacTeamPostsSchema: CollectionSchema = {
  name: 'rbac-team-posts',
  fields: {
    teamId: { type: 'string', required: true, immutable: true },
    title: { type: 'string', required: true },
    content: { type: 'string', default: '' },
    authorId: { type: 'string', required: true, userBound: true, immutable: true },
  },
  teamField: 'teamId',
  permissions: {
    viewer: {
      read: 'team',
      create: false,
      update: false,
      delete: false,
    },
    member: {
      read: 'team',
      create: true,
      update: 'team',
      delete: false,
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/**
 * Secrets collection — admin-only, completely locked for non-admins
 */
export const rbacSecretsSchema: CollectionSchema = {
  name: 'rbac-secrets',
  fields: {
    key: { type: 'string', required: true },
    value: { type: 'string', required: true },
  },
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/** All RBAC test schemas as an array for easy spreading */
export const rbacTestSchemas = [
  rbacNotesSchema,
  rbacBountiesSchema,
  rbacTeamPostsSchema,
  rbacSecretsSchema,
]

/**
 * Leaderboard Feature - Schema
 *
 * A score-based leaderboard demonstrating:
 * - ownerField for 'own' permission checks
 * - userBound fields that auto-populate with current user ID
 * - Admin override for updating any entry
 */

import type { CollectionSchema } from '@spaces/sdk/worker'

export const leaderboardSchema: CollectionSchema = {
  name: 'leaderboard',
  fields: {
    playerName: { type: 'string', required: true },
    score: { type: 'number', required: true },
    category: { type: 'string', default: 'general' },
    playerId: { type: 'string', required: true, userBound: true, immutable: true },
  },
  ownerField: 'playerId', // Used for 'own' permission checks
  permissions: {
    viewer: {
      read: true,  // Can see the leaderboard
      create: false,
      update: false,
      delete: false,
    },
    member: {
      read: true,
      create: true,
      update: 'own',  // Can only update own scores
      delete: 'own',  // Can only delete own entries
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

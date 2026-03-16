/**
 * App Constants
 *
 * Define roles, status values, and other constants here.
 * Import feature-specific constants from their directories.
 */

import type { BadgeProps } from './components/ui'

// Badge variant type extracted from BadgeProps
type BadgeVariant = NonNullable<BadgeProps['variant']>

// ============================================================================
// User Roles
// ============================================================================

export const ROLES = {
  VIEWER: 'viewer',
  MEMBER: 'member',
  ADMIN: 'admin',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ROLE_CONFIG: Record<Role, { title: string; badgeVariant: BadgeVariant; description: string }> = {
  [ROLES.VIEWER]: {
    title: 'Viewer',
    badgeVariant: 'secondary',
    description: 'Read-only access',
  },
  [ROLES.MEMBER]: {
    title: 'Member',
    badgeVariant: 'default',
    description: 'Can create and edit own content',
  },
  [ROLES.ADMIN]: {
    title: 'Admin',
    badgeVariant: 'warning',
    description: 'Full access to all features',
  },
}

// ============================================================================
// Todo Constants
// ============================================================================

export const PRIORITY = {
  NORMAL: 'normal',
  HIGH: 'high',
} as const

export type Priority = typeof PRIORITY[keyof typeof PRIORITY]

export const FILTER = {
  ALL: 'all',
  ACTIVE: 'active',
  DONE: 'done',
  HIGH: 'high',
} as const

export type Filter = typeof FILTER[keyof typeof FILTER]

// Presence: how long (ms) before a user is considered offline
export const PRESENCE_TIMEOUT_MS = 20000
// How often to write a heartbeat (ms)
export const PRESENCE_HEARTBEAT_MS = 7000

// Palette of colors assigned round-robin to users for presence avatars
export const PRESENCE_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

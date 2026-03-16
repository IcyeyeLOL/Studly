/**
 * Tasks/Challenges Feature - Schema
 * 
 * A claimable task system demonstrating:
 * - 'unclaimed-or-own' permission for claiming unclaimed items
 * - writableFields for restricting which fields users can update
 * - timestampTrigger for automatic timestamp fields
 * - Admin-only grading workflow
 */

import type { CollectionSchema } from '@spaces/sdk/worker'

export const challengesSchema: CollectionSchema = {
  name: 'challenges',
  fields: {
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    difficulty: { type: 'string', default: 'medium' },
    points: { type: 'number', default: 10 },
    // Claim fields
    claimedById: { type: 'string' },
    claimedAt: { type: 'string', timestampTrigger: { field: 'claimedById' } },
    // Submission fields
    submitted: { type: 'boolean', default: false },
    submissionUrl: { type: 'string' },
    submissionNotes: { type: 'string' },
    submittedAt: { type: 'string', timestampTrigger: { field: 'submitted', value: true } },
    // Grading fields (admin only)
    grade: { type: 'string' },
    feedback: { type: 'string' },
    gradedById: { type: 'string' },
    gradedAt: { type: 'string', timestampTrigger: { field: 'grade' } },
    // Creator
    createdById: { type: 'string', required: true, userBound: true, immutable: true },
  },
  ownerField: 'claimedById', // For 'own' and 'unclaimed-or-own' checks
  permissions: {
    viewer: { 
      read: true,  // Can see all challenges
      create: false, 
      update: false, 
      delete: false,
    },
    member: { 
      read: true, 
      create: true,  // Can create new challenges
      update: 'unclaimed-or-own',  // Can claim unclaimed OR update own claimed
      delete: 'own',
      // Members can only update these fields
      writableFields: [
        'claimedById',  // Claim field
        'submitted', 'submissionUrl', 'submissionNotes',  // Submission fields
      ],
    },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

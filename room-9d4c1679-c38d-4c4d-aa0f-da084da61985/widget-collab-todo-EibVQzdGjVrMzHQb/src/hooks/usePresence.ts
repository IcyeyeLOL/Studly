/**
 * usePresence
 *
 * Manages real-time presence for the collaborative todo list.
 *
 * - Writes a heartbeat record for the current user every PRESENCE_HEARTBEAT_MS
 * - Reads all presence records and filters to only those seen within PRESENCE_TIMEOUT_MS
 * - Returns the list of online users and the current user's assigned color
 */

import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutations, useUser } from '@spaces/sdk/storage'
import { PRESENCE_COLORS, PRESENCE_HEARTBEAT_MS, PRESENCE_TIMEOUT_MS } from '../constants'

export interface PresenceUser {
  userId: string
  name: string
  color: string
  lastSeen: string
  isMe: boolean
}

export function usePresence() {
  const { user } = useUser()
  const { records: presenceRecords, status } = useQuery('presence')
  const { create, put } = useMutations('presence')

  // Stable record ID for this user's presence entry — keyed by userId
  const myRecordIdRef = useRef<string | null>(null)

  // Assign a stable color to the current user based on their userId
  const myColor = useMemo(() => {
    if (!user?.id) return PRESENCE_COLORS[0]
    // Hash the userId to pick a color deterministically
    let hash = 0
    for (let i = 0; i < user.id.length; i++) {
      hash = (hash * 31 + user.id.charCodeAt(i)) >>> 0
    }
    return PRESENCE_COLORS[hash % PRESENCE_COLORS.length]
  }, [user?.id])

  // Write/update heartbeat on mount and at each interval
  useEffect(() => {
    if (!user?.id || status !== 'ready') return

    const writeHeartbeat = async () => {
      const now = new Date().toISOString()
      const data = {
        userId: user.id,
        name: user.name ?? 'Unknown',
        color: myColor,
        lastSeen: now,
      }

      if (myRecordIdRef.current) {
        // Update existing record
        put(myRecordIdRef.current, data)
      } else {
        // Check if there's already a record for this user
        const existing = presenceRecords.find(r => r.data.userId === user.id)
        if (existing) {
          myRecordIdRef.current = existing.recordId
          put(existing.recordId, data)
        } else {
          // Create a new presence record
          const id = await create(data)
          myRecordIdRef.current = id
        }
      }
    }

    // Write immediately
    writeHeartbeat()

    // Then write on interval
    const interval = setInterval(writeHeartbeat, PRESENCE_HEARTBEAT_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, myColor, status])

  // Filter to only online users (seen within PRESENCE_TIMEOUT_MS)
  const onlineUsers: PresenceUser[] = useMemo(() => {
    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS
    return presenceRecords
      .filter(r => {
        const lastSeen = new Date(r.data.lastSeen as string).getTime()
        return lastSeen >= cutoff
      })
      .map(r => ({
        userId: r.data.userId as string,
        name: r.data.name as string,
        color: r.data.color as string,
        lastSeen: r.data.lastSeen as string,
        isMe: r.data.userId === user?.id,
      }))
      // Sort: current user first, then others alphabetically
      .sort((a, b) => {
        if (a.isMe) return -1
        if (b.isMe) return 1
        return a.name.localeCompare(b.name)
      })
  }, [presenceRecords, user?.id])

  return { onlineUsers, myColor }
}

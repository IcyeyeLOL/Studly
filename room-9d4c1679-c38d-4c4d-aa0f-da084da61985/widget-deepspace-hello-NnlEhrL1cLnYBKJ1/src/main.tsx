/**
 * Starter Template - Entry Point
 *
 * Platform wiring (auth shells, RecordProvider, screenshot listener,
 * DeepSpacePill, MobileHeader) lives here so App.tsx stays purely
 * app-specific.
 *
 * Uses RecordRoom-based storage with RBAC and real-time sync.
 *
 * When running inside the canvas (iframe), Clerk is skipped entirely —
 * auth is handled via postMessage from the parent frame.
 * When deployed as a standalone site, SpacesAuthProvider wraps the tree
 * so Clerk satellite auth works normally.
 */

import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SpacesAuthProvider, PillCoordinatorProvider, DeepSpaceThemeProvider, MobileBlockerProvider } from '@spaces/sdk'
import { useAuth, DeepSpacePill, GuestBanner, isWidgetContext, getWidgetAuthToken } from '@spaces/sdk/auth'
import { ProfileModalProvider } from '@spaces/sdk/profile'
import { MobileHeader } from '@spaces/sdk/mobile'
import { initScreenshotListener } from '@spaces/sdk/screenshot'
import { getApiUrl } from '@spaces/sdk/config'
import { RecordProvider, type UserProfile } from '@spaces/sdk/storage'
import { schemas } from './schemas'
import ChatMount from './chat-mount'
import App from './App'
import './styles.css'

const WIDGET_BASE = (window as any).__WIDGET_BASE__ ?? ''

const inWidget = isWidgetContext()

/**
 * Get the storage roomId for this widget instance.
 *
 * Canvas widgets receive their canvas roomId via URL search params
 * (injected by the parent canvas into the iframe src). This ensures
 * per-canvas data isolation — each canvas gets its own RecordRoom
 * Durable Object.
 *
 * Standalone mode uses 'default' so all pages share one RecordRoom.
 */
function getRoomId(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('roomId') ?? 'default'
}

/**
 * Fetch user profile using postMessage auth (for canvas widgets).
 * Gets auth token from parent frame, then fetches /api/users/me.
 */
async function fetchUserViaPostMessage(): Promise<UserProfile> {
  const token = await getWidgetAuthToken()
  if (!token) {
    throw new Error('No auth token from parent')
  }

  const apiUrl = getApiUrl()
  const response = await fetch(`${apiUrl}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`)
  }

  return response.json()
}

/**
 * Canvas widget shell — Clerk is NOT in the tree, auth via postMessage.
 *
 * The parent canvas injects `roomId` as a URL search param on the iframe
 * src, so `getRoomId()` resolves it synchronously.
 */
function WidgetShell() {
  useEffect(() => initScreenshotListener(), [])

  return (
    <RecordProvider
      roomId={getRoomId()}
      schemas={schemas}
      fetchUser={fetchUserViaPostMessage}
      allowAnonymous
    >
      <App />
    </RecordProvider>
  )
}

/**
 * Deployed / standalone shell — Clerk is in the tree, full auth flow.
 */
function DeployedShell() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-content-secondary">Authenticating...</div>
      </div>
    )
  }

  return (
    <ProfileModalProvider>
      <DeepSpacePill />
      <GuestBanner />
      <MobileHeader />
      <RecordProvider
        roomId={getRoomId()}
        schemas={schemas}
        allowAnonymous
      >
        <App />
      </RecordProvider>
    </ProfileModalProvider>
  )
}

const tree = (
  <BrowserRouter basename={WIDGET_BASE}>
    <DeepSpaceThemeProvider>
      <MobileBlockerProvider>
        <PillCoordinatorProvider>
          {inWidget ? <WidgetShell /> : <DeployedShell />}
          <ChatMount />
        </PillCoordinatorProvider>
      </MobileBlockerProvider>
    </DeepSpaceThemeProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(
  inWidget ? tree : <SpacesAuthProvider>{tree}</SpacesAuthProvider>,
)

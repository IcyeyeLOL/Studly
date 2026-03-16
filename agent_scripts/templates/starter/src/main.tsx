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
import { BrowserRouter, useLocation } from 'react-router-dom'
import { SpacesAuthProvider, PillCoordinatorProvider, DeepSpaceThemeProvider, MobileBlockerProvider } from '@spaces/sdk'
import {
  useAuth,
  AuthModalProvider,
  AUTH_CALLBACK_PATH,
  AUTH_SIGN_IN_PATH,
  AUTH_SIGN_UP_PATH,
  DeepSpaceAuthCallback,
  DeepSpaceAuthPage,
  DeepSpacePill,
  AuthOverlay,
  GuestBanner,
  isWidgetContext,
  getWidgetAuthToken,
} from '@spaces/sdk/auth'
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

function PreviewRouteReporter() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.parent === window || !window.parent?.postMessage) return

    const pathname = location.pathname && location.pathname.length > 0 ? location.pathname : '/'
    const search = location.search || ''
    const hash = location.hash || ''

    window.parent.postMessage({
      type: 'miyagi-preview-route',
      path: `${pathname}${search}${hash}`,
    }, '*')
  }, [location.hash, location.pathname, location.search])

  return null
}

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
 * Whether this app allows anonymous (non-signed-in) users.
 *
 * - true  → users can browse freely; a soft GuestBanner nudges sign-up.
 * - false → a full-page AuthOverlay blocks access until the user signs in.
 *
 * Set at deploy time via the "Deploy as Website" dialog. The deployer
 * injects window.__DEEPSPACE_ALLOW_ANONYMOUS__ into index.html when enabled.
 * Defaults to false (require auth).
 */
const ALLOW_ANONYMOUS = !!(window as any).__DEEPSPACE_ALLOW_ANONYMOUS__

/**
 * OG screenshot mode: the dispatch worker appends ?_og=1 when taking
 * Puppeteer screenshots for OpenGraph images. Skips auth entirely so
 * the screenshot captures the actual app content instead of the
 * "Authenticating..." loading state or the AuthOverlay.
 */
const IS_OG_SCREENSHOT = new URLSearchParams(window.location.search).has('_og')

/**
 * Deployed / standalone shell — Clerk is in the tree, full auth flow.
 *
 * When ALLOW_ANONYMOUS is false (default), a frosted AuthOverlay blocks
 * interaction until the user signs in. The app still renders behind the
 * overlay so visitors can "peek through the frost" and see what the app
 * looks like — motivating sign-up.
 *
 * When ALLOW_ANONYMOUS is true, the overlay is replaced with a dismissible
 * GuestBanner at the top of the page (soft nudge).
 * 
 */
function DeployedShell() {
  const location = useLocation()
  const { isLoaded, isSignedIn } = useAuth()
  const searchParams = new URLSearchParams(location.search)

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-content-secondary">Authenticating...</div>
      </div>
    )
  }

  if (location.pathname === AUTH_CALLBACK_PATH) {
    return <DeepSpaceAuthCallback />
  }

  if (location.pathname === AUTH_SIGN_IN_PATH) {
    return <DeepSpaceAuthPage mode="sign-in" searchParams={searchParams} />
  }

  if (location.pathname === AUTH_SIGN_UP_PATH) {
    return <DeepSpaceAuthPage mode="sign-up" searchParams={searchParams} />
  }

  return (
    <AuthModalProvider>
      <ProfileModalProvider>
        <DeepSpacePill />
        {!isSignedIn && !ALLOW_ANONYMOUS && <AuthOverlay />}
        {!isSignedIn && ALLOW_ANONYMOUS && <GuestBanner />}
        <MobileHeader />
        <RecordProvider
          roomId={getRoomId()}
          schemas={schemas}
          allowAnonymous
        >
          <App />
        </RecordProvider>
      </ProfileModalProvider>
    </AuthModalProvider>
  )
}

const tree = (
  <BrowserRouter basename={WIDGET_BASE}>
    <DeepSpaceThemeProvider>
      <MobileBlockerProvider>
        <PillCoordinatorProvider>
          <PreviewRouteReporter />
          {inWidget ? <WidgetShell /> : <DeployedShell />}
          <ChatMount />
        </PillCoordinatorProvider>
      </MobileBlockerProvider>
    </DeepSpaceThemeProvider>
  </BrowserRouter>
)

const ogTree = (
  <BrowserRouter basename={WIDGET_BASE}>
    <DeepSpaceThemeProvider>
      <RecordProvider roomId={getRoomId()} schemas={schemas} allowAnonymous>
        <App />
      </RecordProvider>
    </DeepSpaceThemeProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(
  IS_OG_SCREENSHOT
    ? <SpacesAuthProvider>{ogTree}</SpacesAuthProvider>
    : inWidget ? tree : <SpacesAuthProvider>{tree}</SpacesAuthProvider>,
)

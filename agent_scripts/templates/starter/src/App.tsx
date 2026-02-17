/**
 * Main Application
 * 
 * Minimal app shell with:
 * - Authentication (DeepSpacePill)
 * - RecordProvider for storage
 * - Navigation
 * - Protected routes
 * 
 * Add pages by:
 * 1. Creating page component in src/pages/
 * 2. Importing here
 * 3. Adding Route below
 * 4. Adding nav item if needed
 */

import { useCallback, useEffect, type ReactNode } from 'react'
import { useAuth, DeepSpacePill, isWidgetContext, getWidgetAuthToken } from '@spaces/sdk/auth'
import { initScreenshotListener } from '@spaces/sdk/screenshot'
import { NotificationBell } from '@spaces/sdk/notifications'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '@spaces/sdk/config'

// Widget base path (injected at build time for subpath deployments)
declare global {
  interface Window {
    __WIDGET_BASE__?: string
  }
}
const WIDGET_BASE = typeof window !== 'undefined' ? (window.__WIDGET_BASE__ || '') : ''
import { RecordProvider, useUser, type UserProfile } from '@spaces/sdk/storage'

/**
 * Get the storage roomId for this widget instance.
 *
 * Canvas widgets receive their canvas roomId via URL search params
 * (injected by the parent canvas into the iframe src). This ensures
 * per-canvas data isolation — each canvas gets its own RecordRoom
 * Durable Object.
 *
 * Standalone mode (accessed directly, not in an iframe) uses a fallback
 * based on the URL pathname so each deployment has its own storage.
 */
function getWidgetRoomId(): string {
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const canvasRoomId = params.get('roomId')
  if (canvasRoomId) return canvasRoomId
  // Standalone fallback: use the deployment path (unique per widget build)
  return window.location.pathname.replace(/^\/+|\/+$/g, '') || 'default'
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

import { schemas } from './schemas'
import { ROLES, ROLE_CONFIG, type Role } from './constants'
import { Badge } from './components/ui'
import type { Notification } from '@spaces/sdk/notifications'

// Pages
import HomePage from './pages/HomePage'
import PermissionsPage from './pages/PermissionsPage'
// Import more pages here:
// import ItemsPage from './pages/ItemsPage'
// import TasksPage from './pages/TasksPage'
// import TeamsPage from './pages/TeamsPage'

// ============================================================================
// Navigation
// ============================================================================

function Navigation() {
  const { user } = useUser()
  const isAdmin = user?.role === 'admin'
  const location = useLocation()
  const navigate = useNavigate()
  
  const userRole = (user?.role ?? ROLES.VIEWER) as Role
  const roleConfig = ROLE_CONFIG[userRole] ?? ROLE_CONFIG[ROLES.VIEWER]
  
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (notification.link) {
      navigate(notification.link)
    }
  }, [navigate])
  
  // Define navigation items
  // Add more as you create pages
  const navItems: Array<{ path: string; label: string; roles: Role[]; icon: ReactNode }> = [
    { 
      path: '/', 
      label: 'Home', 
      roles: [ROLES.VIEWER, ROLES.MEMBER, ROLES.ADMIN],
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    // Add more nav items here:
    // { path: '/items', label: 'Items', roles: [...], icon: ... },
    // { path: '/tasks', label: 'Tasks', roles: [...], icon: ... },
    // { path: '/teams', label: 'Teams', roles: [ROLES.MEMBER, ROLES.ADMIN], icon: ... },
    {
      path: '/permissions',
      label: 'Permissions',
      roles: [ROLES.VIEWER, ROLES.MEMBER, ROLES.ADMIN],
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    // { path: '/admin', label: 'Admin', roles: [ROLES.ADMIN], icon: ... },
  ]
  
  const visibleNavItems = isAdmin 
    ? navItems 
    : navItems.filter(item => item.roles.includes(userRole))
  
  return (
    <nav className="bg-surface-elevated/80 backdrop-blur-xl border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-muted rounded-lg flex items-center justify-center border border-primary-border">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-content">My App</span>
          </Link>
          
          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {visibleNavItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-2 border ${
                    isActive
                      ? 'bg-primary-muted text-primary border-primary-border'
                      : 'text-content-secondary hover:text-content hover:bg-surface-overlay/60 border-transparent'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Badge color={roleConfig.color} size="sm">
              {roleConfig.title}
            </Badge>
            
            {user?.id && (
              <NotificationBell
                miniappId="starter"
                userId={user.id}
                onNotificationClick={handleNotificationClick}
                pollInterval={30000}
              />
            )}
            
            {user && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-surface-overlay/60 rounded-lg border border-border">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full ring-2 ring-border" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-surface-overlay flex items-center justify-center text-xs text-content-secondary">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-sm text-content-secondary">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ============================================================================
// Protected Route
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: Role[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useUser()
  const isAdmin = user?.role === 'admin'
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-content-secondary">Loading...</div>
      </div>
    )
  }
  
  if (isAdmin) return <>{children}</>
  
  const userRole = (user?.role ?? ROLES.VIEWER) as Role
  
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

// ============================================================================
// App Router
// ============================================================================

function AppRouter() {
  const { user, isLoading } = useUser()
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <div className="text-content-muted">Loading...</div>
        </div>
      </div>
    )
  }
  
  return (
    <BrowserRouter basename={WIDGET_BASE}>
      <div className="h-screen bg-surface overflow-hidden flex flex-col">
        <Navigation />
        
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/permissions" element={<PermissionsPage />} />

            {/* Add more routes here:
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route
              path="/teams"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MEMBER, ROLES.ADMIN]}>
                  <TeamsPage />
                </ProtectedRoute>
              }
            />
            */}
            {/* Admin route added by admin-page feature:
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            */}
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

// ============================================================================
// Main App
// ============================================================================

/**
 * Canvas widget shell — Clerk is NOT in the tree, auth via postMessage.
 */
function WidgetApp() {
  useEffect(() => initScreenshotListener(), [])

  return (
    <RecordProvider
      roomId="starter"
      schemas={schemas}
      fetchUser={fetchUserViaPostMessage}
      allowAnonymous
    >
      <AppRouter />
    </RecordProvider>
  )
}

/**
 * Deployed / standalone shell — Clerk is in the tree, full auth flow.
 */
function DeployedApp() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-content-secondary">Authenticating...</div>
      </div>
    )
  }

  return (
    <>
      <DeepSpacePill />
      <RecordProvider
        roomId={getWidgetRoomId()} 
        schemas={schemas}
        allowAnonymous
      >
        <AppRouter />
      </RecordProvider>
    </>
  )
}

export default function App() {
  return isWidgetContext() ? <WidgetApp /> : <DeployedApp />
}

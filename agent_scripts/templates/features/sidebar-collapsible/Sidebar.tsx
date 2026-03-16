/**
 * Sidebar Component - Standard Collapsible Navigation
 *
 * A simple sidebar with:
 * - Icon + label navigation items
 * - Collapsible (icon-only mode)
 * - Active state styling
 * - Badge counts
 * - User profile at bottom
 *
 * To use: Copy to starter/src/components/ and import in your layout
 */

import React, { useState, type ReactNode } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
  path?: string
  badge?: number | string
  onClick?: () => void
}

export interface NavSection {
  id: string
  title?: string
  items: NavItem[]
}

interface SidebarProps {
  /** Navigation sections */
  sections: NavSection[]
  /** Currently active item ID */
  activeId?: string
  /** Callback when item is clicked */
  onNavigate?: (item: NavItem) => void
  /** Whether sidebar is collapsed (icon-only) */
  collapsed?: boolean
  /** Toggle collapsed state */
  onToggleCollapse?: () => void
  /** Show collapse toggle button */
  showCollapseToggle?: boolean
  /** User info for bottom profile section */
  user?: {
    name?: string
    email?: string
    imageUrl?: string
    role?: string
  }
  /** Custom header content */
  header?: ReactNode
  /** Custom footer content (above user) */
  footer?: ReactNode
  /** Width when expanded */
  width?: number
  /** Width when collapsed */
  collapsedWidth?: number
}

// ============================================================================
// Icons
// ============================================================================

function ChevronLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ============================================================================
// Sidebar Component
// ============================================================================

export default function Sidebar({
  sections,
  activeId,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  showCollapseToggle = true,
  user,
  header,
  footer,
  width = 240,
  collapsedWidth = 64,
}: SidebarProps) {
  const currentWidth = collapsed ? collapsedWidth : width

  return (
    <div
      className="h-full bg-card border-r border-border flex flex-col transition-all duration-200 ease-in-out flex-shrink-0"
      style={{ width: currentWidth }}
    >
      {/* Header */}
      {header && (
        <div className={`border-b border-border ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section, sectionIndex) => (
          <div key={section.id} className={sectionIndex > 0 ? 'mt-4' : ''}>
            {/* Section title */}
            {section.title && !collapsed && (
              <div className="px-4 py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </span>
              </div>
            )}

            {/* Section items */}
            <div className={collapsed ? 'px-2 space-y-1' : 'px-2 space-y-0.5'}>
              {section.items.map((item) => {
                const isActive = activeId === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.onClick?.()
                      onNavigate?.(item)
                    }}
                    className={`
                      w-full flex items-center gap-3 rounded-lg transition-colors
                      ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'}
                      ${isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Icon */}
                    <span className={`flex-shrink-0 ${isActive ? 'text-primary' : ''}`}>
                      {item.icon}
                    </span>

                    {/* Label */}
                    {!collapsed && (
                      <span className={`flex-1 text-sm text-left truncate ${isActive ? 'font-medium' : ''}`}>
                        {item.label}
                      </span>
                    )}

                    {/* Badge */}
                    {!collapsed && item.badge !== undefined && (
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full
                        ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                      `}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      {showCollapseToggle && onToggleCollapse && (
        <div className={`border-t border-border ${collapsed ? 'px-2 py-2' : 'px-2 py-2'}`}>
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className={`border-t border-border ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          {footer}
        </div>
      )}

      {/* User profile */}
      {user && (
        <div className={`border-t border-border ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            {/* Avatar */}
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary">
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}

            {/* Name & role */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user.name || user.email}
                </div>
                {user.role && (
                  <div className="text-xs text-muted-foreground truncate">
                    {user.role}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example Icons (for reference)
// ============================================================================

export const SidebarIcons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Inbox: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

/**
 * Studly Homework Helper Widget
 */

import StudlyPage from './pages/StudlyPage'

export default function App() {
  return (
    <div
      className="bg-surface overflow-hidden flex flex-col"
      style={{
        height: 'calc(100vh - var(--mobile-header-height, 0px))',
        marginTop: 'var(--mobile-header-height, 0px)',
      }}
    >
      <main className="flex-1 overflow-y-auto">
        <StudlyPage />
      </main>
    </div>
  )
}

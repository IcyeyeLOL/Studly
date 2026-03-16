/**
 * Studly Homework Helper — Main widget page.
 * Calls the Studly backend at https://studly-eosin.vercel.app
 * Subject selector → question input → streaming AI answer.
 */

import { useState, useRef, useCallback } from 'react'
import { getWidgetAuthToken } from '@spaces/sdk/auth'

const API_BASE = 'https://studly-eosin.vercel.app'

const SUBJECTS = [
  { id: 'Math', label: 'Math', emoji: '∑' },
  { id: 'Science', label: 'Science', emoji: '⚗' },
  { id: 'English', label: 'English', emoji: '✍' },
  { id: 'History', label: 'History', emoji: '📜' },
  { id: 'Computer Science', label: 'CS', emoji: '💻' },
  { id: 'Business', label: 'Business', emoji: '📊' },
  { id: 'Other', label: 'Other', emoji: '📖' },
]

const EXAMPLE_QUESTIONS: Record<string, string> = {
  Math: 'Two trains 280 miles apart travel toward each other at 80 mph and 60 mph. When do they meet?',
  Science: 'Why do objects fall at the same rate regardless of mass (ignoring air resistance)?',
  English: "What is the difference between 'affect' and 'effect'?",
  History: 'Why did the Roman Empire fall?',
  'Computer Science': 'Explain how binary search works',
  Business: 'Calculate break-even: fixed costs $50,000, selling price $25/unit, variable cost $10/unit',
  Other: 'How does a bill become a law in the United States?',
}

export default function StudlyPage() {
  const [subject, setSubject] = useState('Math')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'ok' | 'error'>('unknown')
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`)
      setBackendStatus(res.ok ? 'ok' : 'error')
    } catch {
      setBackendStatus('error')
    }
  }, [])

  const cancelRequest = useCallback(() => {
    xhrRef.current?.abort()
    setLoading(false)
  }, [])

  const askStudly = useCallback(async () => {
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setAnswer('')

    let token: string | null = null
    try {
      token = await getWidgetAuthToken()
    } catch {
      // no token — will get 401
    }

    const url = `${API_BASE}/api/solve/stream`
    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open('POST', url)
    xhr.setRequestHeader('Content-Type', 'application/json')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    let lastIndex = 0
    let fullText = ''

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3 && xhr.responseText) {
        const newData = xhr.responseText.substring(lastIndex)
        lastIndex = xhr.responseText.length
        const lines = newData.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.error) {
              setError(data.error)
              setLoading(false)
              return
            }
            if (data.t != null) {
              fullText += data.t
              setAnswer(fullText)
            }
            if (data.done === true) {
              setAnswer(data.answerText ?? fullText)
              setLoading(false)
            }
          } catch {
            // partial JSON, ignore
          }
        }
      }
      if (xhr.readyState === 4) {
        if (xhr.status === 401 || xhr.status === 403) {
          setError(
            xhr.status === 403
              ? 'Daily question limit reached. Open the Studly app to upgrade to Pro.'
              : 'Sign in to Studly to use the homework helper. Open the app at studly-eosin.vercel.app'
          )
        } else if (xhr.status !== 200 && xhr.status !== 0) {
          try {
            const json = JSON.parse(xhr.responseText)
            setError(json.error ?? `Request failed (${xhr.status})`)
          } catch {
            setError(`Request failed (${xhr.status})`)
          }
        }
        setLoading(false)
      }
    }

    xhr.onerror = () => {
      setError('Network error — check your connection.')
      setLoading(false)
    }

    xhr.send(
      JSON.stringify({
        question: question.trim(),
        subject,
        output_preference: 'ask',
      })
    )
  }, [question, subject, loading])

  const fillExample = () => {
    setQuestion(EXAMPLE_QUESTIONS[subject] ?? '')
    setAnswer('')
    setError('')
  }

  return (
    <div className="h-full bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm">
            S
          </div>
          <div>
            <h1 className="text-sm font-semibold text-content leading-none">Studly</h1>
            <p className="text-xs text-content-muted mt-0.5">Homework → solutions</p>
          </div>
        </div>
        <button
          onClick={checkHealth}
          title="Check backend status"
          className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content transition-colors px-2 py-1 rounded-md hover:bg-surface-overlay"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendStatus === 'ok'
                ? 'bg-green-500'
                : backendStatus === 'error'
                ? 'bg-red-500'
                : 'bg-content-muted/40'
            }`}
          />
          {backendStatus === 'unknown' ? 'Check backend' : backendStatus === 'ok' ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Subject picker */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSubject(s.id); setAnswer(''); setError('') }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                subject === s.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-elevated text-content-secondary border-border hover:border-primary/40 hover:text-content'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="px-5 pb-3 flex-shrink-0">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) askStudly()
            }}
            placeholder={`Ask a ${subject} question…`}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
          />
          <button
            onClick={fillExample}
            className="absolute bottom-3 right-3 text-[10px] text-content-muted hover:text-primary transition-colors"
            title="Fill example question"
          >
            example
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={askStudly}
            disabled={loading || !question.trim()}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Solving…
              </span>
            ) : (
              '⚡ Get Answer'
            )}
          </button>
          {loading && (
            <button
              onClick={cancelRequest}
              className="px-3 py-2 rounded-xl border border-border text-xs text-content-muted hover:text-content hover:border-content-muted transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        <p className="text-[10px] text-content-muted mt-1 text-right">⌘+Enter to submit</p>
      </div>

      {/* Answer area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            {error.includes('Sign in') && (
              <a
                href="https://studly-eosin.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open Studly →
              </a>
            )}
          </div>
        )}

        {!error && !answer && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-3">
            <div className="text-3xl opacity-40">📚</div>
            <p className="text-xs text-content-muted max-w-[200px]">
              Select a subject, type your question, and get a step-by-step explanation.
            </p>
            <div className="mt-1 grid grid-cols-2 gap-1.5 w-full max-w-xs">
              {['Step-by-step walkthroughs', 'Concept explanations', 'Visual charts', 'Real examples'].map((f) => (
                <div key={f} className="px-2 py-1.5 rounded-lg bg-surface-elevated border border-border text-[10px] text-content-muted text-center">
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {answer && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold text-primary">Studly</span>
              <span className="text-[10px] text-content-muted">· {subject}</span>
              {loading && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-content-muted">
                  <span className="w-2 h-2 border border-primary/40 border-t-primary rounded-full animate-spin" />
                  streaming…
                </span>
              )}
            </div>
            <pre
              className="text-sm text-content leading-relaxed whitespace-pre-wrap font-sans"
              style={{ fontFamily: 'inherit' }}
            >
              {answer}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

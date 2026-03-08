import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const API_URL = 'https://deepspace-backend-basics.vercel.app'

export default function HomePage() {
  const [name, setName] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const callAPI = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await fetch(`${API_URL}/api/hello`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('API request failed')
      const data = await res.json()
      setResult(data.message)
    } catch {
      setError('Failed to reach the API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-10" style={{ boxShadow: 'var(--shadow-card)' }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-1">
              DeepSpace Hello
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your name and say hello to the API.
            </p>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
              Your Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && callAPI()}
              className="h-12 px-4 text-base rounded-xl border-border bg-muted/40 placeholder:text-muted-foreground focus-visible:ring-ring"
            />
          </div>

          {/* Button */}
          <Button
            onClick={callAPI}
            disabled={loading || !name.trim()}
            loading={loading}
            className="w-full h-12 text-sm font-semibold rounded-xl mt-2"
          >
            {loading ? 'Calling API…' : 'Say Hello'}
          </Button>

          {/* Result */}
          {result && (
            <div className="mt-6 p-4 rounded-xl bg-success-muted border border-success-border">
              <p className="text-sm font-medium text-success">{result}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-danger-muted border border-danger-border">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

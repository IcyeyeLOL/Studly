import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

const API_URL = 'https://deepspace-backend-basics.vercel.app'

interface Joke {
  category: string
  setup: string
  punchline: string
}

export default function HomePage() {
  // Hello state
  const [name, setName] = useState('')
  const [greeting, setGreeting] = useState('')
  const [helloLoading, setHelloLoading] = useState(false)
  const [helloError, setHelloError] = useState('')

  // Joke state
  const [joke, setJoke] = useState<Joke | null>(null)
  const [jokeLoading, setJokeLoading] = useState(false)
  const [jokeError, setJokeError] = useState('')
  const [showPunchline, setShowPunchline] = useState(false)

  const callHello = async () => {
    if (!name.trim()) return
    setHelloLoading(true)
    setHelloError('')
    setGreeting('')
    try {
      const res = await fetch(`${API_URL}/api/hello`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGreeting(data.message)
    } catch {
      setHelloError('Failed to reach the API.')
    } finally {
      setHelloLoading(false)
    }
  }

  const fetchJoke = async () => {
    setJokeLoading(true)
    setJokeError('')
    setJoke(null)
    setShowPunchline(false)
    try {
      const res = await fetch(`${API_URL}/api/joke`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setJoke(data)
    } catch {
      setJokeError('Could not fetch a joke right now.')
    } finally {
      setJokeLoading(false)
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
              DeepSpace Widget
            </h1>
            <p className="text-sm text-muted-foreground">
              Say hello or get a random joke from the API.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="hello">
            <TabsList className="w-full mb-8 rounded-xl bg-muted h-11">
              <TabsTrigger value="hello" className="flex-1 rounded-lg text-sm font-medium">
                Say Hello
              </TabsTrigger>
              <TabsTrigger value="joke" className="flex-1 rounded-lg text-sm font-medium">
                Get a Joke
              </TabsTrigger>
            </TabsList>

            {/* Hello Tab */}
            <TabsContent value="hello">
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                  Your Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && callHello()}
                  className="h-12 px-4 text-base rounded-xl border-border bg-muted/40 placeholder:text-muted-foreground"
                />
              </div>

              <Button
                onClick={callHello}
                disabled={helloLoading || !name.trim()}
                loading={helloLoading}
                className="w-full h-12 text-sm font-semibold rounded-xl mt-2"
              >
                {helloLoading ? 'Calling API…' : 'Say Hello'}
              </Button>

              {greeting && (
                <div className="mt-6 p-4 rounded-xl bg-success-muted border border-success-border">
                  <p className="text-sm font-medium text-success">{greeting}</p>
                </div>
              )}
              {helloError && (
                <div className="mt-6 p-4 rounded-xl bg-danger-muted border border-danger-border">
                  <p className="text-sm font-medium text-destructive">{helloError}</p>
                </div>
              )}
            </TabsContent>

            {/* Joke Tab */}
            <TabsContent value="joke">
              <Button
                onClick={fetchJoke}
                disabled={jokeLoading}
                loading={jokeLoading}
                className="w-full h-12 text-sm font-semibold rounded-xl"
              >
                {jokeLoading ? 'Fetching joke…' : 'Get a Random Joke'}
              </Button>

              {joke && (
                <div className="mt-6 p-5 rounded-xl bg-muted border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    {joke.category}
                  </p>
                  <p className="text-base text-foreground mb-4 leading-relaxed">
                    {joke.setup}
                  </p>
                  {showPunchline ? (
                    <p className="text-base font-semibold text-primary leading-relaxed">
                      {joke.punchline}
                    </p>
                  ) : (
                    <button
                      onClick={() => setShowPunchline(true)}
                      className="text-sm font-medium text-muted-foreground border border-border bg-background hover:bg-muted rounded-lg px-4 py-2 transition-colors"
                    >
                      Reveal punchline
                    </button>
                  )}
                </div>
              )}

              {jokeError && (
                <div className="mt-6 p-4 rounded-xl bg-danger-muted border border-danger-border">
                  <p className="text-sm font-medium text-destructive">{jokeError}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

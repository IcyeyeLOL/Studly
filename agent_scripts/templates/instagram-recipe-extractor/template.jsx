import React, { useState } from 'react'

function InstagramRecipeExtractorWidget() {
  // Widget-scoped storage (persists per widget instance)
  const [savedRecipes, setSavedRecipes] = useStorage('recipes', [])
  const [currentUrl, setCurrentUrl] = useStorage('currentUrl', '')

  // Global storage (shared across canvas)
  const [sharedRecipes, setSharedRecipes] = useGlobalStorage('meal-recipes', [])

  // Local state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('') // Progress status message
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [extractedCaption, setExtractedCaption] = useState('') // Show extracted caption

  // Validate Instagram URL
  const isValidInstagramUrl = (url) => {
    return /instagram\.com\/(p|reel|reels|tv)\//.test(url)
  }

  // Extract recipe from Instagram post
  const extractRecipe = async () => {
    if (!currentUrl) {
      setError('Please enter an Instagram URL')
      return
    }

    if (!isValidInstagramUrl(currentUrl)) {
      setError('Invalid Instagram URL. Must contain /p/, /reel/, or /tv/')
      return
    }

    setLoading(true)
    setError(null)
    setStatus('Fetching Instagram post...')

    try {
      // Step 1: Get Instagram content (caption)
      setStatus('Extracting content from Instagram...')
      const igResult = await miyagiAPI.post('instagram-extract-content', {
        url: currentUrl,
        includeMedia: true
      })

      if (!igResult.success) {
        throw new Error(igResult.error || 'Failed to fetch Instagram content')
      }

      const igContent = igResult.data

      // Check if we have caption text
      const recipeText = igContent.caption

      if (!recipeText.trim()) {
        throw new Error('No caption found in Instagram post')
      }

      // Display the full extracted caption
      setExtractedCaption(recipeText)
      setStatus('Caption extracted - review below before extracting recipe')
      await new Promise(resolve => setTimeout(resolve, 2000)) // Pause to show caption

      // Step 2: Extract recipe from content using AI
      setStatus('Extracting recipe with AI...')
      const recipeResult = await miyagiAPI.post('generate-text', {
        prompt: `Extract the complete recipe from this Instagram post content:\n\n${recipeText}`,
        system_prompt: RECIPE_EXTRACTION_PROMPT,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.3
      })

      if (!recipeResult.success) {
        throw new Error(recipeResult.error || 'Failed to extract recipe')
      }

      // Debug: Log the entire response object
      console.log('=== FULL RECIPE RESULT ===')
      console.log(JSON.stringify(recipeResult, null, 2))
      console.log('=== END FULL RESULT ===')

      // Parse the JSON response
      let recipe
      try {
        // Check different possible response fields
        const responseText = recipeResult.text || recipeResult.data?.text || recipeResult.content || recipeResult.message

        console.log('=== AI RESPONSE TEXT ===')
        console.log(responseText)
        console.log('=== END AI RESPONSE ===')

        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          recipe = JSON.parse(jsonMatch[0])
        } else {
          recipe = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.error('Parse error:', parseError)
        console.error('Raw AI response:', recipeResult)
        throw new Error(`Could not parse recipe from AI response: ${parseError.message}`)
      }

      // If no ingredients or directions were found, show what we got anyway
      if (!recipe.ingredients) recipe.ingredients = []
      if (!recipe.directions) recipe.directions = []
      if (!recipe.title) recipe.title = 'Untitled Recipe'

      // Add metadata
      recipe.sourceUrl = igContent.permalink
      recipe.extractedAt = new Date().toISOString()
      recipe.author = igContent.author
      recipe.mediaUrls = igContent.mediaUrls

      // Step 3: Save recipe
      setSavedRecipes([recipe, ...savedRecipes])
      setSelectedRecipe(recipe)
      setStatus('Recipe extracted successfully!')
      setCurrentUrl('') // Clear input
      setExtractedCaption('') // Clear caption display

    } catch (err) {
      console.error('Extraction failed:', err)
      setError(err.message || 'Failed to extract recipe')
      setStatus('')
      setExtractedCaption('') // Clear caption on error
    } finally {
      setLoading(false)
    }
  }

  // Share recipe to global storage
  const shareRecipe = (recipe) => {
    if (!sharedRecipes.find(r => r.sourceUrl === recipe.sourceUrl)) {
      setSharedRecipes([...sharedRecipes, recipe])
      alert('Recipe shared to meal planner!')
    } else {
      alert('Recipe already shared')
    }
  }

  // Delete recipe
  const deleteRecipe = (index) => {
    if (confirm('Delete this recipe?')) {
      const updated = savedRecipes.filter((_, i) => i !== index)
      setSavedRecipes(updated)
      if (selectedRecipe === savedRecipes[index]) {
        setSelectedRecipe(null)
      }
    }
  }

  // Copy recipe to clipboard
  const copyRecipe = (recipe) => {
    const text = formatRecipeAsText(recipe)
    navigator.clipboard.writeText(text)
      .then(() => alert('Recipe copied to clipboard!'))
      .catch(() => alert('Failed to copy recipe'))
  }

  // Format recipe as plain text
  const formatRecipeAsText = (recipe) => {
    let text = `${recipe.title}\n\n`

    if (recipe.description) {
      text += `${recipe.description}\n\n`
    }

    if (recipe.prepTime || recipe.cookTime || recipe.servings) {
      const times = []
      if (recipe.prepTime) times.push(`Prep: ${recipe.prepTime}`)
      if (recipe.cookTime) times.push(`Cook: ${recipe.cookTime}`)
      if (recipe.servings) times.push(`Serves: ${recipe.servings}`)
      text += `${times.join(' | ')}\n\n`
    }

    text += 'INGREDIENTS:\n'
    recipe.ingredients.forEach(ing => {
      const quantity = ing.quantity || ''
      const unit = ing.unit || ''
      const notes = ing.notes ? ` (${ing.notes})` : ''
      text += `• ${quantity} ${unit} ${ing.item}${notes}\n`
    })

    text += '\nDIRECTIONS:\n'
    recipe.directions.forEach((dir, i) => {
      const duration = dir.duration ? ` (${dir.duration})` : ''
      text += `${i + 1}. ${dir.instruction}${duration}\n`
    })

    if (recipe.tips && recipe.tips.length > 0) {
      text += '\nTIPS:\n'
      recipe.tips.forEach(tip => text += `• ${tip}\n`)
    }

    text += `\nSource: ${recipe.sourceUrl}\n`
    return text
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Instagram Recipe Extractor</h2>
        <p style={styles.subtitle}>Paste an Instagram post or reel URL to extract the recipe</p>
      </div>

      {/* URL Input Section */}
      <div style={styles.inputSection}>
        <input
          type="text"
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && extractRecipe()}
          placeholder="https://instagram.com/p/..."
          style={styles.input}
          disabled={loading}
        />
        <button
          onClick={extractRecipe}
          disabled={loading || !currentUrl}
          style={{...styles.button, ...styles.extractButton}}
        >
          {loading ? 'Extracting...' : 'Extract Recipe'}
        </button>
      </div>

      {/* Status Message */}
      {status && (
        <div style={styles.status}>
          {loading && <span style={styles.spinner}>⏳</span>}
          {status}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Extracted Caption Display */}
      {extractedCaption && !selectedRecipe && (
        <div style={styles.captionDisplay}>
          <h3 style={styles.captionTitle}>📝 Extracted Caption</h3>
          <div style={styles.captionText}>{extractedCaption}</div>
        </div>
      )}

      {/* Recipe Display */}
      {selectedRecipe && (
        <div style={styles.recipeDisplay}>
          <div style={styles.recipeHeader}>
            <h3 style={styles.recipeTitle}>{selectedRecipe.title}</h3>
            <button
              onClick={() => setSelectedRecipe(null)}
              style={{...styles.button, ...styles.closeButton}}
            >
              ✕
            </button>
          </div>

          {selectedRecipe.description && (
            <p style={styles.description}>{selectedRecipe.description}</p>
          )}

          {(selectedRecipe.prepTime || selectedRecipe.cookTime || selectedRecipe.servings) && (
            <div style={styles.metaInfo}>
              {selectedRecipe.prepTime && <span>⏱️ Prep: {selectedRecipe.prepTime}</span>}
              {selectedRecipe.cookTime && <span>🔥 Cook: {selectedRecipe.cookTime}</span>}
              {selectedRecipe.servings && <span>👥 Serves: {selectedRecipe.servings}</span>}
            </div>
          )}

          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>🥗 Ingredients</h4>
            <ul style={styles.list}>
              {selectedRecipe.ingredients.map((ing, i) => (
                <li key={i} style={styles.listItem}>
                  {ing.quantity && <strong>{ing.quantity} </strong>}
                  {ing.unit && <span>{ing.unit} </span>}
                  {ing.item}
                  {ing.notes && <em style={styles.notes}> ({ing.notes})</em>}
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>👨‍🍳 Directions</h4>
            <ol style={styles.list}>
              {selectedRecipe.directions.map((dir, i) => (
                <li key={i} style={styles.listItem}>
                  {dir.instruction}
                  {dir.duration && <em style={styles.duration}> ({dir.duration})</em>}
                </li>
              ))}
            </ol>
          </div>

          {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>💡 Tips</h4>
              <ul style={styles.list}>
                {selectedRecipe.tips.map((tip, i) => (
                  <li key={i} style={styles.listItem}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={styles.actions}>
            <button
              onClick={() => copyRecipe(selectedRecipe)}
              style={{...styles.button, ...styles.actionButton}}
            >
              📋 Copy
            </button>
            <button
              onClick={() => shareRecipe(selectedRecipe)}
              style={{...styles.button, ...styles.actionButton}}
            >
              🔗 Share
            </button>
            <a
              href={selectedRecipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{...styles.button, ...styles.actionButton, textDecoration: 'none', textAlign: 'center'}}
            >
              🔍 View Original
            </a>
          </div>
        </div>
      )}

      {/* Saved Recipes List */}
      {!selectedRecipe && savedRecipes.length > 0 && (
        <div style={styles.recipesList}>
          <h3 style={styles.listTitle}>Saved Recipes ({savedRecipes.length})</h3>
          {savedRecipes.map((recipe, index) => (
            <div key={index} style={styles.recipeCard} onClick={() => setSelectedRecipe(recipe)}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>{recipe.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteRecipe(index)
                  }}
                  style={{...styles.button, ...styles.deleteButton}}
                >
                  🗑️
                </button>
              </div>
              {recipe.author && (
                <div style={styles.cardMeta}>
                  <span>by @{recipe.author.username}</span>
                </div>
              )}
              <div style={styles.cardMeta}>
                <span>{recipe.ingredients.length} ingredients</span>
                <span>•</span>
                <span>{recipe.directions.length} steps</span>
                {recipe.servings && (
                  <>
                    <span>•</span>
                    <span>Serves {recipe.servings}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!selectedRecipe && savedRecipes.length === 0 && !loading && !error && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🍳</div>
          <p style={styles.emptyText}>No recipes yet</p>
          <p style={styles.emptyHint}>Paste an Instagram recipe URL above to get started</p>
        </div>
      )}
    </div>
  )
}

// AI Prompt for recipe extraction
const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction expert. Given content from an Instagram post, extract recipe information in valid JSON format.

Return ONLY valid JSON with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief description (optional)",
  "ingredients": [
    { "item": "ingredient name", "quantity": "1", "unit": "cup", "notes": "optional prep notes" }
  ],
  "directions": [
    { "step": 1, "instruction": "Step description", "duration": "optional time" }
  ],
  "prepTime": "10 minutes (optional)",
  "cookTime": "20 minutes (optional)",
  "totalTime": "30 minutes (optional)",
  "servings": "4 (optional)",
  "tips": ["optional tip 1", "optional tip 2"]
}

Important:
- Extract ALL ingredients and steps you can find, even if incomplete
- If ingredients or directions are missing, use empty arrays []
- If the title isn't clear, create one based on the content
- Add a description explaining what information was found or missing
- Preserve exact quantities and units when available
- If no recipe information is found at all, set description to "No recipe information found in this post"
- Only return valid JSON, no markdown or extra text
- NEVER return an error field - always return a valid recipe object with whatever info you can extract`

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#fafafa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden'
  },
  header: {
    padding: '20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#333'
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#666'
  },
  inputSection: {
    padding: '16px 20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none'
  },
  button: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  extractButton: {
    backgroundColor: '#e84855',
    color: 'white'
  },
  status: {
    padding: '12px 20px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  spinner: {
    fontSize: '16px'
  },
  error: {
    padding: '12px 20px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    fontSize: '13px'
  },
  captionDisplay: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    backgroundColor: '#fff'
  },
  captionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  captionText: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#333',
    whiteSpace: 'pre-wrap',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  },
  recipeDisplay: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    backgroundColor: '#fff'
  },
  recipeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  recipeTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '600',
    color: '#333'
  },
  closeButton: {
    backgroundColor: 'transparent',
    color: '#999',
    padding: '4px 8px',
    fontSize: '16px'
  },
  description: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6'
  },
  metaInfo: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    fontSize: '13px',
    color: '#666'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  list: {
    margin: 0,
    paddingLeft: '20px'
  },
  listItem: {
    marginBottom: '8px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333'
  },
  notes: {
    color: '#999',
    fontSize: '13px'
  },
  duration: {
    color: '#999',
    fontSize: '13px'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    color: '#333'
  },
  recipesList: {
    flex: 1,
    overflow: 'auto',
    padding: '20px'
  },
  listTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  recipeCard: {
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#333'
  },
  deleteButton: {
    backgroundColor: 'transparent',
    color: '#999',
    padding: '4px 8px',
    fontSize: '14px'
  },
  cardMeta: {
    fontSize: '12px',
    color: '#999',
    display: 'flex',
    gap: '8px',
    marginTop: '4px'
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyText: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666'
  },
  emptyHint: {
    margin: 0,
    fontSize: '14px',
    color: '#999'
  }
}

export default InstagramRecipeExtractorWidget

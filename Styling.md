# Widget Styling Rules

This document defines rules for when and how the agent should modify widget styling.

---

## When to Apply Styling

### New Widgets or Blank Styling

If a widget does not have a `styling.md` file, or if `styling.md` exists but is empty/blank:

- **Apply the currently selected style** to the widget automatically

### Existing Styled Widgets

If a widget already has a `styling.md` file with content (non-blank):

- **DO NOT change the widget's styling** unless the user explicitly asks

---

## Explicit Styling Requests

Only modify a widget's `styling.md` when the user explicitly requests a style change. Examples:

- "change the style to..."
- "update the styling..."
- "apply [style name] style..."
- "restyle this widget..."
- "make this widget [style] style"

---

## When in Doubt

If you're unsure whether the user wants a style change, **ask for clarification** before modifying `styling.md`.

---

## How to Implement Styling

### Use the `@theme` block in `src/styles.css` for design tokens

All style-specific colors, shadows, and visual properties belong in the `@theme` block in `src/styles.css` as CSS variables. When applying a style, modify the theme variables — not the JSX.

For example, a neumorphic style should modify the `@theme` block:
```css
@theme {
  --color-surface: #e0e5ec;
  --color-surface-elevated: #e8edf4;
  --color-content: #5a6a7a;
  --color-content-secondary: #8a9aaa;
  --shadow-card: 8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff;
  --shadow-pressed: inset 3px 3px 6px #a3b1c6, inset -3px -3px 6px #ffffff;
}
```

Then use semantic classes in JSX: `bg-surface`, `text-content`, `shadow-card`, `shadow-pressed`.

### Never use inline `style={}` for theming

Do NOT do this:
```jsx
<div style={{ background: '#e0e5ec', boxShadow: '8px 8px 16px #a3b1c6' }}>
```

Do this instead:
```jsx
<div className="bg-surface shadow-card rounded-2xl">
```

Inline styles make it impossible to restyle a widget later — every component has hardcoded values. Semantic Tailwind tokens mean you swap the config and everything updates.

### Use `styles.css` for what `@theme` can't do

Add custom CSS inside `@layer base { ... }` in `styles.css`:
- Pseudo-element rules: `::-webkit-scrollbar`, `::selection`
- Global rules: `*:focus-visible`
- Complex `@keyframes` animations
- Custom component classes that combine many utilities via `@apply`

**Important:** Custom CSS must be inside `@layer base` so Tailwind utility classes can override it. Never add unlayered CSS — it will override all utility classes.

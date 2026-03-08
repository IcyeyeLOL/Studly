# Widget Styling Rules

This document defines rules for when and how the agent should modify widget styling, and provides a comprehensive design reference for producing polished, purposeful widgets.

---

## When to Apply Styling

### New Widgets — Explicit Style Selected

If `styling.md` contains a style ID other than `none` and has a style prompt:

- **Apply that style** to the widget, using the Design Reference below to adapt it to the widget's purpose and category

### New Widgets — No Style Selected (Auto-Design)

If `styling.md` shows `id: none` or is blank, the command will include a `[STYLE INSTRUCTION]` asking you to design a style. Use the Design Reference below — identify the widget's category, then make concrete token decisions.

After designing, update `styling.md` with your style (id: `auto-<descriptor>`, name, one-line prompt).

### Existing Styled Widgets

If a widget already has a `styling.md` file with a non-`none` style ID and content:

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

## Design Reference

This reference applies to ALL styling work — whether you're applying a user-selected style, auto-designing from scratch, or modifying an existing widget's look. Use it to make informed decisions about how a style should be adapted to the widget's specific purpose.

### Token Mapping

The @theme block in styles.css defines shadcn tokens. The JSX uses SDK alias class names. You only change @theme values — the aliases propagate automatically:

| @theme token | Tailwind class | Purpose |
|---|---|---|
| `--color-background` | `bg-surface` | Main canvas |
| `--color-foreground` | `text-content` | Primary text |
| `--color-card` | `bg-surface-elevated` | Cards, panels |
| `--color-card-foreground` | — | Card text |
| `--color-primary` | `bg-primary`, `text-primary` | Accent color |
| `--color-primary-foreground` | — | Text on accent |
| `--color-muted` | `bg-surface-overlay` | Subtle backgrounds |
| `--color-muted-foreground` | `text-content-secondary` | Secondary text |
| `--color-border` | `border-border` | Borders |
| `--color-ring` | `border-border-focus` | Focus rings |
| `--radius` | `rounded-*` | Corner radius base |
| `--shadow-card` | `shadow-card` | Card elevation |

For fonts: set `font-family` on the `body` rule inside `@layer base`. Only system font stacks are available (no external font imports). Use system sans-serif, system serif (Georgia, 'Times New Roman'), or system monospace ('SF Mono', Menlo, Monaco, Consolas).

### Widget Categories

Identify what kind of widget you're building. Each category below provides concrete CSS values — use them as starting points, then adjust for the specific widget. When applying a user-selected style, use the category to inform layout, density, and typography choices that complement the style.

---

### Data & Analytics
*Dashboards, charts, metrics, scorecards, trackers, leaderboards*

Use a neutral canvas that lets data speak. Structure with a grid of isolated cards, each with a subtle drop shadow and rounded corners. Typography hierarchy is critical: bold metric numbers should dominate, with smaller muted labels.

- **`--color-background`**: White (#fafafa) or dark slate (#0f172a) — choose based on whether data benefits from brightness (financial, health) or immersion (real-time monitoring)
- **`--color-card`**: White (#ffffff) on light, or slightly elevated dark (#1e293b) on dark
- **`--color-border`**: Extremely subtle — #e5e7eb on light, rgba(51,65,85,0.3) on dark. Or transparent, relying on shadow alone
- **`--shadow-card`**: Subtle y-offset only — `0 1px 3px rgba(0,0,0,0.08)` for light, `0 2px 8px rgba(0,0,0,0.3)` for dark
- **`--color-primary`**: A single functional color (blue #3b82f6 for neutral, or contextual: green #10b981 for growth)
- **Typography**: System sans-serif at 14px base. Metric numbers large (24-36px, font-weight 700). Labels small (11-12px, uppercase, letter-spacing 0.05em, muted-foreground color)
- **`--radius`**: 0.5rem for cards, slightly smaller for inner elements
- **Feel**: Utilitarian, information-dense, scannable at a glance

---

### Games & Entertainment
*Games, quizzes, interactive toys, simulations, music, creative experiments*

Bold and expressive. The UI should feel like an experience, not a tool. Use saturated colors, visible borders, and obvious interactive feedback. Dark backgrounds work well here because they make colors pop and create atmosphere.

- **`--color-background`**: Deep and saturated — dark purple (#1a0533), rich navy (#0a1628), deep teal (#0d3d3d), or jet black (#0a0a0a). Avoid neutral grays — pick a hue
- **`--color-card`**: Slightly lighter than background with a colored tint — e.g., rgba(139,92,246,0.08) over a purple theme, rgba(6,182,212,0.06) over teal
- **`--color-border`**: Visible and characterful — accent color at medium opacity. Pair with glow: `--shadow-card: 0 0 12px rgba(accent,0.3)`
- **`--shadow-card`**: Colored glow shadows rather than neutral — `0 4px 20px rgba(accent,0.25)` to create atmosphere
- **`--color-primary`**: Vivid and warm — coral (#ff6b6b), electric purple (#a855f7), hot pink (#ec4899), cyan (#06b6d4), or lime (#84cc16). Should feel alive
- **Typography**: Bold weights (600-800). Use the system sans-serif at large sizes — bold system fonts feel playful enough at 20px+. Generous size for key interactive elements (18-24px). Labels can be informal
- **`--radius`**: Large — 1rem-1.5rem base. Fully rounded (9999px) for buttons and badges
- **Interactive states**: Scale on hover (transform: scale(1.05)), brightness on active, smooth transitions (150-200ms). Interactions should feel physical and satisfying
- **Feel**: Energetic, tactile, immersive. The widget should feel fun to use

---

### Tools & Utilities
*Calculators, converters, planners, timers, generators, form-heavy apps*

Clarity and speed above all. Every element should be immediately understandable. No decoration — every pixel serves a function. Users are here to accomplish a task quickly.

- **`--color-background`**: White (#ffffff) or very light gray (#f9fafb)
- **`--color-card`**: White (#ffffff). Use border for grouping rather than elevation
- **`--color-border`**: Definite and structural — #d1d5db on inputs, #e5e7eb between sections
- **`--shadow-card`**: Minimal or `none`. Depth through borders, not shadows
- **`--color-primary`**: A single strong action color — blue (#2563eb) for primary buttons, keeping everything else neutral. Secondary actions in outline or ghost style
- **Typography**: System sans-serif (no need for custom fonts). 14px base. Input labels at 13px medium weight. Placeholder text in `--color-muted-foreground` (#9ca3af)
- **`--radius`**: Moderate — 0.375rem to 0.5rem. Nothing too rounded (feels unserious) or too sharp (feels dated)
- **Layout**: Compact padding (8-12px within groups), clear visual separation between sections. Inputs should be standard height (36-40px)
- **Feel**: Fast, professional, no-nonsense. Like a well-made physical tool

---

### Creative & Social
*Feeds, posts, portfolios, mood boards, profiles, messaging, communities*

Content-forward design. The UI is a frame for user-generated content — it should enhance without competing. Rounded, warm, and personal.

- **`--color-background`**: Warm neutral — soft ivory (#f8f7f4), pale rose (#fdf2f8), light slate (#f1f5f9), or warm dark (#1c1917)
- **`--color-card`**: White (#ffffff) on light backgrounds, or slightly elevated warm dark (#292524) on dark
- **`--color-border`**: Subtle (rgba(0,0,0,0.06)) or transparent — use shadow and whitespace for separation
- **`--shadow-card`**: Soft and large — `0 4px 16px rgba(0,0,0,0.06)` on light, warm-tinted shadows on dark
- **`--color-primary`**: Warm and inviting — coral (#f97316), rose (#f43f5e), warm purple (#8b5cf6), sky blue (#0ea5e9). Should feel friendly, not corporate
- **Typography**: System sans-serif with generous sizes for names/titles (16-18px bold). Timestamps and metadata small (12px) in `--color-muted-foreground`
- **`--radius`**: Large — 1rem+ base. Circular for avatars. Pill-shaped (9999px) for tags/badges
- **Layout**: Cards centered in a column, generous vertical spacing (16-24px gaps). Images should be full-width within cards
- **Feel**: Personal, curated, app-like. Like scrolling a well-designed mobile app

---

### Reading & Reference
*Articles, docs, wikis, notes, journals, recipe viewers*

Typography-first. Every decision should optimize for comfortable reading over extended time. The UI fades away; the content fills the space.

- **`--color-background`**: Warm off-white (#fdfbf7 or #faf8f5) to reduce glare. Avoid pure white — it causes eye strain on long reads
- **`--color-card`**: Same as background or very slightly elevated (#ffffff)
- **`--color-border`**: Warm and subtle (#e8e5e0). Use thin horizontal rules between sections, not boxes
- **`--shadow-card`**: `none` or barely perceptible
- **`--color-primary`**: Understated — dark blue (#1e40af), warm brown (#92400e), or muted teal (#0d9488). Used sparingly for links and highlights only
- **Typography**: This is critical. Use system serif (Georgia, 'Times New Roman') for headings. Readable system sans-serif for body (16px on a 65-75 character measure). Set line-height 1.65-1.8 in `@layer base`. Generous paragraph spacing. Code blocks need system monospace (Menlo, Monaco, Consolas) with a tinted background (#f5f2eb)
- **`--radius`**: Minimal — 0.25rem. Rounded elements distract from text
- **Layout**: Single column, max-width 680px, generous horizontal padding. Sticky navigation as a sidebar or top bar
- **Feel**: Calm, focused, book-like. Like reading a Kindle or a well-typeset magazine

---

### Monitoring & Technical
*Logs, system status, API dashboards, network monitors, dev tools, terminals*

Dark is mandatory. Dense layout, monospaced fonts, status colors. The UI should feel like a control room — always on, always scanning.

- **`--color-background`**: Dark — true black (#0a0a0a) for terminal feel, or dark navy (#0f172a) for softer technical
- **`--color-card`**: Slightly elevated dark (#1a1a2e or #1e293b)
- **`--color-border`**: Accent at low opacity. Thin (1px) with subtle glow for active elements
- **`--shadow-card`**: Minimal or none. Use color-coded left borders (3px) on cards via Tailwind `border-l-4 border-success` to indicate status instead
- **`--color-primary`**: Cyan (#22d3ee) or electric blue (#3b82f6) for primary actions. Set status tokens: `--color-success: #4ade80`, `--color-warning: #fbbf24`, `--color-destructive: #f87171`
- **Typography**: System monospace throughout ('SF Mono', Menlo, Monaco, Consolas, monospace) set on body in `@layer base`. Small base size (12-13px). Dense line-height (1.4). Headers can be sans-serif but small and uppercase
- **`--radius`**: Small — 0.25rem maximum. Sharp corners feel more technical
- **Layout**: Dense — minimal padding (6-8px), packed rows, multi-column where possible. Status indicators as small colored dots (8px circles) or left-border accents
- **Feel**: Precise, technical, always-on. Like an ops dashboard or terminal

---

### Blended / Unique Widgets

If the widget doesn't fit neatly into one category, pick the **closest category** and start there. Then adjust individual tokens to fit the specific use case. Do NOT try to average multiple categories — pick one dominant aesthetic and adjust details.

For truly novel widgets (art installations, experimental UIs, creative tools), you have full freedom. But still commit to ONE coherent visual language — decide on light vs dark, sharp vs rounded, dense vs spacious, and execute consistently.

---

### Design Principles (Always Apply)

1. **One accent color.** Never use more than one saturated accent in the primary palette. Additional colors should be functional (success/warning/error status colors only).
2. **Contrast matters.** All body text must achieve 4.5:1 contrast ratio against its background. Large headings (18px+ bold) need 3:1 minimum. If you're making text subtle, reduce font-weight or size — not contrast.
3. **Consistent radius.** Pick one radius scale and use it everywhere. Don't mix 4px buttons with 20px cards.
4. **Shadows OR borders, rarely both.** Choose one depth strategy. Cards either float (shadow, no border) or sit (border, no shadow). Using both looks indecisive.
5. **Match function, not topic.** A weather widget needs clear data hierarchy — not sky-blue colors. A finance widget doesn't need green. Color serves readability and hierarchy, not literal subject representation.

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

# DuckMSI Design Directives

This document defines the visual design language for the DuckMSI application. Reference this when building or modifying UI components to maintain consistency.

## Design Philosophy

**Cyberpunk-inspired, privacy-focused data tool.** The aesthetic communicates:
- Technical sophistication (for data professionals)
- Privacy/security (dark theme, contained panels)
- Modern and sleek (neon accents, clean lines)

## Color Palette

### CSS Variables (use these in all components)

```css
:root {
  /* Backgrounds */
  --bg-dark: #0a0a0f;         /* Main page background */
  --bg-panel: #12121a;        /* Panel/card backgrounds */
  --bg-hover: #1a1a2e;        /* Hover states */
  --bg-selected: #16213e;     /* Selected/active states */

  /* Neon Accents */
  --neon-cyan: #00f5ff;       /* Primary accent, links, borders */
  --neon-magenta: #ff00ff;    /* Secondary accent, CTAs, aliases */
  --neon-pink: #ff2a6d;       /* Danger/destructive actions */
  --neon-green: #05ffa1;      /* Success, loaded status, row counts */
  --neon-yellow: #f9f871;     /* Warnings, column counts */
  --neon-orange: #ff6b35;     /* File sizes, tertiary data */

  /* Text */
  --text-primary: #e0e0e0;    /* Main text */
  --text-secondary: #808090;  /* Secondary/helper text */
  --text-muted: #505060;      /* Disabled, placeholder text */

  /* Borders */
  --border-color: #2a2a3a;    /* Panel borders, dividers */

  /* Glows (for box-shadow) */
  --glow-cyan: 0 0 10px rgba(0, 245, 255, 0.5), 0 0 20px rgba(0, 245, 255, 0.3);
  --glow-magenta: 0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.3);
  --glow-green: 0 0 10px rgba(5, 255, 161, 0.5), 0 0 20px rgba(5, 255, 161, 0.3);
}
```

### Color Usage Rules

| Purpose | Color | Variable |
|---------|-------|----------|
| Primary actions, links | Cyan | `--neon-cyan` |
| Call-to-action buttons (Add, Upload) | Magenta | `--neon-magenta` |
| Success states, loaded indicators | Green | `--neon-green` |
| Destructive actions (Delete, Remove) | Pink | `--neon-pink` |
| Warnings, loading states | Yellow | `--neon-yellow` |
| Supplementary data | Orange | `--neon-orange` |

## Typography

### Fonts

```css
/* Headers, labels, stats */
font-family: 'Orbitron', sans-serif;

/* Body text, code, data */
font-family: 'Share Tech Mono', monospace;
```

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

### Text Styles

- **Panel titles**: Orbitron, 12px, uppercase, letter-spacing: 2px, `--neon-cyan`
- **Section headers**: Orbitron, 24px, weight 700, gradient text (cyan → magenta)
- **File names**: Share Tech Mono, 14px, weight 500, `--text-primary`
- **Metadata values**: Share Tech Mono, 11px, use semantic colors (green for rows, yellow for cols, etc.)
- **Muted text**: Share Tech Mono, `--text-muted`

## Component Patterns

### Panels

```css
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow:
    0 0 30px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  /* NOTE: Avoid overflow:hidden - it clips tooltips */
}

/* Apply border-radius to inner elements instead */
.panel-header {
  border-radius: 12px 12px 0 0;
}
.panel-footer {
  border-radius: 0 0 12px 12px;
}
```

Optional: Add corner decorations (20px L-shaped borders in `--neon-cyan`)

### Buttons

**Standard button:**
```css
.btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  border-color: var(--neon-cyan);
  color: var(--neon-cyan);
  box-shadow: var(--glow-cyan);
}
```

**Accent button (CTAs):**
```css
.btn.accent {
  border-color: var(--neon-magenta);
  color: var(--neon-magenta);
  background: rgba(255, 0, 255, 0.1);
}

.btn.accent:hover {
  box-shadow: var(--glow-magenta);
  background: rgba(255, 0, 255, 0.2);
}
```

**Danger button:**
```css
.btn.danger:hover {
  border-color: var(--neon-pink);
  color: var(--neon-pink);
}
```

### Status Indicators

```css
.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--neon-green);
  box-shadow: var(--glow-green);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

States:
- **Loaded**: `--neon-green` with pulse animation
- **Loading**: `--neon-yellow`, no animation
- **Error**: `--neon-pink`, no animation

### List Items (File Explorer Style)

```css
.list-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.list-item:hover {
  background: var(--bg-hover);
  border-left-color: var(--neon-cyan);
}

.list-item.selected {
  background: var(--bg-selected);
  border-left-color: var(--neon-magenta);
}
```

### Badges/Tags

```css
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 0, 255, 0.15);
  border: 1px solid rgba(255, 0, 255, 0.3);
  color: var(--neon-magenta);
}
```

### Tooltips

Tooltips appear on hover for icon-only buttons. Position them below the button by default to avoid clipping issues.

```css
.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--bg-dark);
  border: 1px solid var(--neon-cyan);
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 100;
}

.tooltip:hover::after {
  opacity: 1;
}
```

**Edge positioning variants:**

```css
/* For buttons near right edge - align tooltip to the right */
.tooltip.tooltip-left::after {
  left: auto;
  right: 0;
  transform: none;
}

/* For tooltips that must appear above (e.g., near bottom of viewport) */
.tooltip.tooltip-above::after {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 8px;
}
```

**Important:** Do NOT use `overflow: hidden` on panels that contain tooltips - it will clip them. Apply `border-radius` directly to header/footer elements instead.

### Command Palette

For features requiring many options (100+ items), use a searchable command palette instead of inline buttons. Triggered via keyboard shortcut (Cmd/Ctrl+K) or button click.

```css
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 2000;
}

.command-palette {
  width: 100%;
  max-width: 550px;
  background: var(--bg-panel);
  border: 1px solid var(--neon-cyan);
  border-radius: 12px;
  box-shadow:
    0 0 40px rgba(0, 245, 255, 0.3),
    0 25px 50px rgba(0, 0, 0, 0.5);
}
```

**Structure:**
- **Header**: Search input with icon, keyboard hints
- **Results**: Categorized items with sticky category headers, icons, titles, descriptions
- **Footer**: Result count, action hints

**Interaction:**
- `Cmd/Ctrl+K` to open
- Type to filter (searches title and description)
- `↑↓` to navigate, `Enter` to select, `Esc` to close
- Highlight matching text with `<mark>` tags in `--neon-magenta`

**Selected item styling:**
```css
.palette-item.selected {
  background: var(--bg-hover);
  border-left: 3px solid var(--neon-magenta);
}
```

## Visual Effects

### Background Grid

```css
body {
  background-image:
    linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}
```

### Scanline Overlay (optional, subtle)

```css
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
  z-index: 1000;
}
```

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## Responsive Design

### Breakpoints

- **Mobile**: `max-width: 600px`
- **Tablet**: `max-width: 900px`

### Mobile Adaptations

1. **Reduce padding**: 15px instead of 20px
2. **Wrap metadata**: Allow flex-wrap on file meta items
3. **Always show actions**: Set opacity: 1 on action buttons (no hover reveal on touch)
4. **Stack footer stats**: Use flex-direction: column

## Accessibility Notes

- Maintain sufficient contrast between text and backgrounds
- Glow effects are decorative; don't rely on them for meaning
- Pulse animations should be subtle (opacity only, not scale)
- Provide tooltips for icon-only buttons

## Reference

See `mock-designs/cyberpunk-file-explorer.html` for a complete implementation example.

# SQL Template UI Options Analysis

This document evaluates 5 approaches for handling 100+ SQL templates in DuckMSI. The **Command Palette** was selected and implemented.

---

## Option 1: Command Palette (Selected)

**Implementation**: `mock-designs/cyberpunk-full-app.html`

A modal overlay triggered by keyboard shortcut (Cmd/Ctrl+K) or button click. Features searchable list with categorized results.

### Pros
- Scales infinitely (search-first design)
- Zero screen footprint when closed
- Familiar UX pattern (VS Code, Slack, Notion, Raycast)
- Keyboard-friendly for power users
- Works well on mobile with full-screen modal
- Categories help browsing when search term unknown

### Cons
- Extra click/keystroke to access (not always visible)
- Requires JavaScript for full functionality
- Users must know the shortcut or find the trigger button

### Best For
- Large template libraries (50-500+ items)
- Power users who prefer keyboard
- Apps where screen space is limited

---

## Option 2: Categorized Dropdown Menu

A single "Templates" button that opens a hierarchical dropdown with expandable category sections.

### Design Concept
```
[Templates ▾]
    ├─ Basics ►
    │    ├─ SELECT * FROM table
    │    ├─ SELECT columns
    │    └─ SELECT with WHERE
    ├─ Aggregations ►
    │    ├─ COUNT rows
    │    ├─ SUM / AVG / MIN / MAX
    │    └─ GROUP BY
    ├─ Joins ►
    └─ Window Functions ►
```

### Pros
- Familiar menu pattern
- Categories always visible
- No search required for browsing
- Works without JavaScript (CSS-only possible)

### Cons
- Deeply nested menus are awkward on mobile
- Limited to ~5-7 categories before becoming unwieldy
- No search capability (must browse)
- Hover states don't work on touch devices
- Screen edge clipping with wide submenus

### Best For
- Moderate template count (20-50 items)
- Well-defined categories (5-7 max)
- Desktop-primary applications

---

## Option 3: Searchable Sidebar Panel

A collapsible panel (left or right side) with search input and accordion-style category sections.

### Design Concept
```
┌──────────────────────────────────────────────────┐
│  [SQL Editor]                 │ TEMPLATES    [×] │
│                               │ ┌─────────────┐  │
│  SELECT * FROM sales          │ │ 🔍 Search   │  │
│  WHERE region = 'NA'          │ └─────────────┘  │
│  LIMIT 100                    │                  │
│                               │ ▼ Basics         │
│                               │   SELECT *       │
│                               │   SELECT cols    │
│                               │                  │
│  [Execute]                    │ ► Aggregations   │
│                               │ ► Joins          │
└──────────────────────────────────────────────────┘
```

### Pros
- Always visible when open (no re-triggering)
- Search + browse in one view
- Accordion keeps categories organized
- Can show template previews on hover

### Cons
- Consumes permanent screen space when open
- Requires responsive handling (collapse on mobile)
- Competes with other panels for space
- May feel overwhelming if always visible

### Best For
- Frequent template usage
- Users who browse more than search
- Wide-screen desktop displays
- Applications with existing sidebar patterns

---

## Option 4: Inline Autocomplete

Templates appear as suggestions while typing in the SQL editor, similar to IDE autocomplete.

### Design Concept
```
┌────────────────────────────────────────┐
│ SELECT                                 │
│    ┌────────────────────────────┐      │
│    │ SELECT * FROM table       │      │
│    │ SELECT columns FROM table │      │
│    │ SELECT with WHERE         │      │
│    │ SELECT DISTINCT           │      │
│    └────────────────────────────┘      │
└────────────────────────────────────────┘
```

### Pros
- Most integrated experience (feels like IDE)
- Context-aware (can filter by what's typed)
- No separate UI to navigate
- Teaches SQL syntax while using

### Cons
- Complex to implement well
- Requires parsing cursor position
- May conflict with actual SQL keywords
- Hard to browse all templates
- Mobile keyboards interfere

### Best For
- Advanced SQL editors
- Users familiar with IDE autocomplete
- When templates are SQL snippets, not full queries
- Applications with existing code editor (Monaco, CodeMirror)

---

## Option 5: Floating Quick-Access + Full Browser

Hybrid approach: Keep 4-5 most-used templates always visible as buttons, with a "More..." button that opens a full searchable modal.

### Design Concept
```
┌─────────────────────────────────────────────────┐
│ [Execute] [Clear]                               │
│                                                 │
│ Quick: [SELECT *] [COUNT] [JOIN] [GROUP] [More…]│
└─────────────────────────────────────────────────┘
```

### Pros
- Most common templates are one-click
- Full library still accessible
- Can track usage and surface popular templates
- Reduces cognitive load for common tasks

### Cons
- "Quick" templates need curation/configuration
- Still requires full browser for rest
- May become cluttered if quick-access grows
- Usage tracking adds complexity

### Best For
- Mix of novice and power users
- When 80% of usage is 20% of templates
- Applications that can track template usage
- Onboarding-focused experiences

---

## Recommendation Matrix

| Criteria | Cmd Palette | Dropdown | Sidebar | Autocomplete | Hybrid |
|----------|:-----------:|:--------:|:-------:|:------------:|:------:|
| 100+ templates | ★★★ | ★ | ★★ | ★★ | ★★★ |
| Mobile friendly | ★★★ | ★ | ★★ | ★ | ★★ |
| Keyboard power | ★★★ | ★ | ★★ | ★★★ | ★★ |
| Discoverability | ★★ | ★★★ | ★★★ | ★ | ★★★ |
| Implementation | ★★ | ★★★ | ★★ | ★ | ★★ |
| Screen efficiency | ★★★ | ★★ | ★ | ★★★ | ★★ |

**Legend**: ★ = Poor, ★★ = Good, ★★★ = Excellent

---

## Conclusion

The **Command Palette** was selected because:
1. It handles 100+ templates gracefully
2. It works well on both desktop and mobile
3. It's familiar to developers (the target audience)
4. It fits the cyberpunk aesthetic perfectly
5. It leaves screen space for the editor and results

For applications with different requirements, consider the Hybrid approach (Option 5) for better discoverability, or the Sidebar (Option 3) for browse-heavy workflows.

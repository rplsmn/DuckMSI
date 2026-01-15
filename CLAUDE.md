# DuckMSI - Privacy-First Parquet Explorer

## Getting Started

**IMPORTANT**: Before starting any work on this project, always read the documents in the `agents/` folder if they exist:

1. **`agents/plan.md`** - Full development roadmap and phase requirements
2. **`agents/implementation-log.md`** - Implementation state, learnings, and what's next

**Token-saving tips**:

- **Completed work**: Don't re-read completed phase plans unless debugging. Check `agents/plan.md` for phase status.
- **Current focus**: Always read `agents/implementation-log.md` first - it has the current task and next steps.

## Project Overview

A static HTML page for privacy-preserving parquet file exploration using DuckDB WASM. Users can upload, explore, and export data entirely in-browser without sending sensitive data to any server.

**Key Features**:
- Parquet file upload and exploration via DuckDB WASM
- SELECT-only SQL statements (no data modification)
- Pre-made SQL query templates
- Export to CSV (and images for visualizations)

**Core Files**:
- `index.html` - Main UI structure and styling
- `src/main.js` - DuckDB initialization and database operations
- `src/app.js` - File upload handling and query execution

## Build & Test Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Production build
npm run build

# Preview production build
npm run preview
```

## LLM Agent Workflow

**Critical**: These documents go in EVERY context window. Keep them compact, clear, and unambiguous.

### The Development Loop

```
┌─────────────────────────────────────────────────────────┐
│ 1. READ DOCS (if exist)                                 │
│    └─ agents/plan.md → implementation-log.md            │
├─────────────────────────────────────────────────────────┤
│ 2. CREATE BRANCH                                        │
│    └─ git checkout -b feature/description               │
├─────────────────────────────────────────────────────────┤
│ 3. CREATE PHASE PLAN                                    │
│    └─ plans/phase-X.X-name.md (detailed tasks, tests)   │
├─────────────────────────────────────────────────────────┤
│ 4. IMPLEMENT (TDD)                                      │
│    └─ Write tests first → code → npm test → verify      │
├─────────────────────────────────────────────────────────┤
│ 5. COMMIT & PUSH                                        │
│    └─ Clear commit messages → push to feature branch    │
├─────────────────────────────────────────────────────────┤
│ 6. CREATE PR                                            │
│    └─ Open PR → wait for human review                   │
├─────────────────────────────────────────────────────────┤
│ 7. UPDATE DOCS (after human approval)                   │
│    ├─ Update implementation-log.md (keep <100 lines)    │
│    ├─ Mark phase complete in plan.md                    │
│    └─ Merge PR                                          │
└─────────────────────────────────────────────────────────┘
        │                                        │
        └────────── Loop back to step 1 ─────────┘
```

### Document Maintenance Rules

**`agents/plan.md`** (Can be longer, ~500 lines):

- Full roadmap, all phases, exit criteria
- Update when: phase completes, requirements change, major architectural shift
- Mark phases with status indicators
- Keep technical details and specifications

**`agents/implementation-log.md`** (MUST stay <100 lines):

- **Purpose**: Prime LLM on current state and boundaries only
- **NOT a detailed plan** - that goes in `plans/phase-X.X-name.md`
- Update when: phase completes, boundaries change
- Remove: completed phase details (keep only status table)
- Keep: current phase pointer, boundaries (what NOT to do), critical learnings

**After each phase completion**:

1. Update implementation-log.md: mark phase done, update current phase, check line count
2. Update plan.md: mark phase complete, update status table if needed
3. Archive detailed work in git commits (don't bloat the log)

#### Why These Documents Matter

- **`plan.md`** is your north star - it prevents scope creep and ensures each phase has clear completion criteria
- **`implementation-log.md`** is institutional memory - it captures what worked, what didn't, and why decisions were made
- Together they enable any developer (human or AI) to pick up the project and continue effectively

#### Maintaining These Documents

**When to compact:**
- When documents exceed ~500 lines and become hard to scan
- When major architectural decisions invalidate earlier plans
- When starting a new major phase
- When multiple sessions have added incremental updates that can be consolidated

### Quick Development Steps

1. Read phase requirements from `agents/plan.md`

**IF `plans/phase-X.X-name.md` for the current phase DOESN'T EXIST:**

1. Create detailed implementation plan in `plans/phase-X.X-name.md`
2. Commit with detailed message to feature branch (never to main)
3. Push branch and create PR
4. After human approval: update docs (keep log <100 lines), merge PR

**IF `plans/phase-X.X-name.md` for the current phase ALREADY EXISTS:**

1. Create TodoWrite list with specific tasks
2. Write unit tests for core functionality first
3. Implement code, run `npm test` continuously
4. Verify all exit criteria met
5. Commit with detailed message (never to main)
6. Push branch and create PR
7. After human approval: update docs (keep log <100 lines), merge PR

### Long-Running Tasks

For any task that blocks progress (e.g., deployment, long builds):

1. **Do NOT run it yourself** - it will timeout or block progress
2. **Provide the command** to the human with clear instructions
3. **Wait for feedback** - the human will run it and report results
4. **Complete all your other independent work before handing off**
5. **Continue based on results** - adjust approach if needed

Example:

```
I've committed and pushed the changes. Please deploy by running:

    ./deploy.sh

And let me know when it's complete.
```

### Completion Protocol

- When working on a new phase/task independent of the previous one, create a new dedicated branch
- The human in the loop is responsible for reviewing your work through the PRs
- Always push to feature branches, never directly to main

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (ES Modules)
- **Database**: DuckDB WASM for in-browser SQL
- **Build**: Vite
- **Testing**: Vitest with jsdom
- **Deployment**: GitHub Pages via `deploy.sh`

## Architecture Notes

**Privacy-First Design**: All data processing happens client-side. No data leaves the user's browser.

**Future Considerations**:
- Quarto can be used for initial MVP (static site generation with interactive elements)
- Migration to Svelte for more complex interactivity when needed

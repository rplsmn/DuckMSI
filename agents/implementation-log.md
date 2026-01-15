# DuckMSI Implementation Log

**Last Updated**: 2026-01-15
**Current Phase**: Phase 1 - Multi-File Management

---

## Phase Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | ✅ DONE | Basic DuckDB WASM working with single file upload |
| Phase 1 | 🔄 NEXT | Multi-file management - ready to start |
| Phase 2-8 | 📋 PLANNED | See plan.md for details |

---

## Current State

### What's Working
- Single parquet file upload (drag & drop + file picker)
- DuckDB WASM initialization and connection
- SQL query execution with results table display
- Basic diagnostics: row count, column count, unique rows
- Test suite with Vitest + jsdom
- Deployed to GitHub Pages

### Key Files & Structure
```
src/
├── app.js          # DuckDB operations, core business logic
├── main.js         # UI event handlers, DOM manipulation
├── app.test.js     # Unit tests for app.js
└── main.test.js    # Unit tests for main.js
index.html          # Single-page app UI
```

### Architecture Decisions
- **No Framework**: Vanilla JS for simplicity and small bundle size
- **ES Modules**: Modern import/export, tree-shakeable
- **DuckDB WASM**: All data processing client-side, no backend needed
- **Vite**: Fast dev server, optimized production builds
- **Vitest**: Fast unit testing with jsdom for DOM testing

---

## What's Next: Phase 1

### Goal
Enable users to upload and manage multiple parquet files with meaningful table names.

### Key Requirements
1. Upload multiple files at once (batch upload)
2. Auto-generate table names from filenames (sanitize special chars)
3. Handle duplicate filenames (append _2, _3, etc.)
4. Display all loaded files with metadata
5. Allow renaming tables after upload
6. Remove individual files or clear all

### Implementation Approach
- Modify file upload handlers to accept multiple files
- Add `loadedFiles` array to track table metadata
- Implement `sanitizeTableName()` for filename → table name conversion
- Add UI component for file list management
- Update `getFileStatistics()` to work with multiple files

### Before You Start
1. Create detailed plan in `plans/phase-1.1-multi-file-management.md`
2. Commit and push plan for review
3. After approval, implement with TDD approach

---

## Boundaries & Constraints

### What NOT to Do (Yet)
- ❌ **No persistence** - Phase 5 handles cache/storage
- ❌ **No schema validation** - Phase 6 handles hospital claims schemas
- ❌ **No file size limits** - Phase 7 handles UX polish and warnings
- ❌ **No export functionality** - Phase 4 handles CSV export
- ❌ **No query templates** - Phase 3 handles pre-made queries
- ❌ **No framework migration** - Keep vanilla JS until complexity demands it

### Out of Scope Entirely
- ❌ Backend/server-side processing (privacy requirement)
- ❌ Authentication/authorization (local-only app)
- ❌ Real-time collaboration
- ❌ Mobile app (web-only for now)

---

## Critical Learnings

### DuckDB WASM Gotchas
- File buffers must be registered before querying: `db.registerFileBuffer(name, buffer)`
- Table names in queries must match registered filename exactly
- Use single quotes for file references: `SELECT * FROM 'file.parquet'`
- Async operations throughout - always await

### Testing Insights
- Mock DuckDB in tests by providing fake `conn.query()` responses
- Use jsdom for DOM testing without browser
- Test file operations with Blob objects
- Separate unit tests (pure functions) from integration tests (DuckDB + DOM)

### UI/UX Lessons
- Users expect drag & drop for files
- Show immediate feedback on file upload success
- Display table names in monospace font (they're SQL identifiers)
- Disable execute button until DuckDB initialized

---

## Open Questions

### For Phase 1
- Should we limit number of simultaneous files? (suggest 10 max initially)
- Should table renaming be inline editable or via modal?
- What happens if user uploads 2 files with same name? (auto-append _2)

### For Future Phases
- Actual schema definitions for `fixe`, `diag`, `acte`, `um`, `fixe_2`? (need user input)
- Should persistence be opt-in or automatic? (suggest automatic with clear cache button)
- Which query templates are most valuable? (need user feedback)

---

## Git Workflow Reminder

1. **Never commit to main directly**
2. **Always work in feature branches**: `feature/phase-X-description`
3. **Create PR for all changes** (plans and code)
4. **Wait for human review** before merging
5. **Update this log** after each phase completion (keep <100 lines!)

---

## Quick Reference

### Run Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run build        # Production build
npm run preview      # Preview production build
```

### Useful DuckDB Queries
```sql
-- List all loaded tables
SHOW TABLES;

-- Get table schema
DESCRIBE SELECT * FROM 'file.parquet';

-- Count rows
SELECT COUNT(*) FROM 'file.parquet';
```

---

**Remember**: Read this file AND plan.md before starting any work!

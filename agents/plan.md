# DuckMSI Development Plan

## Project Vision

A privacy-first, client-side parquet file explorer for hospital claims data analysis using DuckDB WASM. All data processing happens in-browser - no data leaves the user's device.

## Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ COMPLETE | Foundation: Basic DuckDB WASM, single file upload, SQL execution, basic diagnostics |
| Phase 1 | 🔄 NEXT | Multi-file management with naming and table management |
| Phase 2 | 📋 PLANNED | Enhanced diagnostics (skimr-style) with type-specific summaries |
| Phase 3 | 📋 PLANNED | Pre-registered query templates for hospital claims |
| Phase 4 | 📋 PLANNED | Export functionality (CSV) |
| Phase 5 | 📋 PLANNED | Cache persistence across sessions |
| Phase 6 | 📋 PLANNED | Hospital claims schema integration |
| Phase 7 | 📋 PLANNED | UX enhancements and polish |
| Phase 8 | 💡 FUTURE | Advanced features (optional) |

---

## Phase 0: Foundation ✅ COMPLETE

### What Was Built
- DuckDB WASM initialization and connection management
- Single parquet file upload (drag & drop + file picker)
- SQL query execution with results table display
- Basic diagnostics dashboard (row count, column count, unique rows)
- Error handling and status indicators
- Vite build setup with Vitest testing

### Key Files
- `src/app.js` - DuckDB operations and core logic
- `src/main.js` - UI bindings and event handlers
- `index.html` - Single-page application layout
- Tests: `src/app.test.js`, `src/main.test.js`

### Exit Criteria Met
- [x] DuckDB WASM initializes successfully
- [x] Can upload and query single parquet file
- [x] SQL results display correctly
- [x] Basic statistics (rows, columns, distinct) calculate correctly
- [x] All tests pass
- [x] Deployed to GitHub Pages

---

## Phase 1: Multi-File Management 🔄 NEXT

### Overview
Enable users to upload and manage multiple parquet files simultaneously, with meaningful table names for SQL queries.

### Requirements

#### 1.1 Multiple File Upload
- **File Selection**: Users can select multiple files at once (batch upload)
- **Sequential Upload**: Files upload one at a time with progress indication
- **Drag & Drop**: Support dropping multiple files simultaneously
- **File List**: Display all uploaded files with their table names

#### 1.2 Table Naming Strategy
- **Auto-naming**: Strip `.parquet` extension, use filename as table name
- **Sanitization**: Convert spaces/special chars to underscores (e.g., `my file.parquet` → `my_file`)
- **Duplicate Handling**: Append `_2`, `_3`, etc. for duplicate names
- **User Renaming**: Add UI to rename tables after upload (optional text input per file)

#### 1.3 File Management UI
- **File List Display**: Show all loaded files with:
  - Table name (editable)
  - Original filename
  - Row count
  - Column count
  - Remove button (unload from DuckDB)
- **Clear All**: Button to remove all files at once
- **Example Query**: Update example query to show all table names

#### 1.4 DuckDB Integration
- **Multiple Tables**: Track all registered file buffers
- **Table Listing**: Query `SHOW TABLES` to verify loaded tables
- **Unload Support**: Implement table dropping/file deregistration
- **Memory Management**: Consider file size limits and memory usage

### Technical Design

#### Data Structure
```javascript
// Track loaded files with metadata
loadedFiles = [
  {
    tableName: 'fixe',           // Name used in SQL queries
    originalName: 'fixe.parquet', // Original filename
    rowCount: 50000,
    columnCount: 25,
    uploadedAt: timestamp
  },
  // ...
]
```

#### Key Functions to Add/Modify
- `app.js`:
  - `loadMultipleParquetFiles(files)` - Batch upload handler
  - `renameTable(oldName, newName)` - Rename table in DuckDB
  - `unloadTable(tableName)` - Remove table and file buffer
  - `getAllTables()` - Return all loaded table metadata
  - `sanitizeTableName(filename)` - Convert filename to valid table name
- `main.js`:
  - Update file upload handlers for multiple files
  - Add file management UI components
  - Handle rename and remove actions

#### UI Changes
```html
<!-- New file management section -->
<div class="section">
  <div class="section-title">Loaded Files</div>
  <div id="file-list-container">
    <!-- Dynamic list of files with controls -->
  </div>
  <button id="clear-all-btn">Clear All Files</button>
</div>
```

### Testing Strategy

#### Unit Tests
- ✅ Sanitize table names correctly (spaces → underscores, special chars)
- ✅ Handle duplicate table names (append _2, _3)
- ✅ Load multiple files sequentially
- ✅ Rename table updates internal tracking
- ✅ Unload table removes from DuckDB and tracking
- ✅ Query multiple tables in single SQL statement

#### Integration Tests
- ✅ Upload 3 files, verify all queryable
- ✅ Rename table, verify old name fails, new name works
- ✅ Remove table, verify query fails with clear error
- ✅ Upload duplicate filename, verify auto-naming

#### Manual Testing Checklist
- [ ] Upload 5+ files at once (drag & drop)
- [ ] Rename each file's table name
- [ ] Execute queries joining multiple tables
- [ ] Remove individual files and verify queries update
- [ ] Clear all files and re-upload
- [ ] Upload file with spaces/special chars in name
- [ ] Upload same file twice, verify duplicate handling

### Exit Criteria
- [x] Users can upload multiple parquet files (1-10+)
- [x] Each file gets a sanitized, unique table name
- [x] All files display in a managed list with metadata
- [x] Users can rename tables after upload
- [x] Users can remove individual files or clear all
- [x] SQL queries can reference all loaded tables
- [x] All unit tests pass (100% coverage on new functions)
- [x] Manual testing checklist complete

### Non-Goals (Out of Scope)
- ❌ File size validation/limits (handle in Phase 7)
- ❌ Schema validation (handle in Phase 6)
- ❌ Persistence across sessions (handle in Phase 5)
- ❌ Automatic file type detection (handle in Phase 6)

---

## Phase 2: Enhanced Diagnostics 📋 PLANNED

### Overview
Provide comprehensive, skimr-style statistics for each table with type-aware summaries.

### Requirements

#### 2.1 Type Detection
- **Auto-detect Column Types**: Query DuckDB schema to identify:
  - Numeric types: INTEGER, BIGINT, DOUBLE, DECIMAL, FLOAT
  - Character types: VARCHAR, TEXT
  - Date/Time types: DATE, TIMESTAMP, TIME
  - Boolean: BOOLEAN
  - Other: JSON, ARRAY, etc.
- **Type-Based Grouping**: Group columns by type for separate summaries

#### 2.2 Numeric Column Statistics
For each numeric column, calculate:
- Count of values (n)
- Missing count (null values)
- Mean, median, standard deviation
- Min, max
- Quartiles (Q1, Q2/median, Q3)
- Histogram/distribution (optional: 5-bin)

#### 2.3 Character Column Statistics
For each character/text column, calculate:
- Count of values (n)
- Missing count (null values)
- Unique count (distinct values)
- Most common value (mode) with count
- Min/max length
- Empty string count

#### 2.4 Date/Time Column Statistics
For each date/time column, calculate:
- Count of values (n)
- Missing count (null values)
- Min date, max date
- Date range (max - min)

#### 2.5 Diagnostics UI
- **Per-Table View**: Select a table to view its diagnostics
- **Tabbed Interface**: Tabs for different column types (Numeric, Character, Date/Time)
- **Expandable Sections**: Collapse/expand each column's detailed stats
- **Export Diagnostics**: Download full diagnostics report as CSV

### Technical Design

#### SQL Queries for Statistics
```sql
-- Numeric column summary
SELECT
  COUNT(*) as n,
  COUNT(*) - COUNT(column_name) as missing,
  AVG(column_name) as mean,
  MEDIAN(column_name) as median,
  STDDEV(column_name) as stddev,
  MIN(column_name) as min,
  MAX(column_name) as max,
  QUANTILE(column_name, 0.25) as q1,
  QUANTILE(column_name, 0.75) as q3
FROM table_name;

-- Character column summary
SELECT
  COUNT(*) as n,
  COUNT(*) - COUNT(column_name) as missing,
  COUNT(DISTINCT column_name) as unique_count,
  MODE(column_name) as most_common,
  MIN(LENGTH(column_name)) as min_length,
  MAX(LENGTH(column_name)) as max_length,
  SUM(CASE WHEN LENGTH(column_name) = 0 THEN 1 ELSE 0 END) as empty_count
FROM table_name;
```

#### Key Functions to Add
- `app.js`:
  - `getDetailedStatistics(tableName)` - Return full stats object
  - `getColumnStatsByType(tableName, columnName, dataType)` - Type-specific stats
  - `exportDiagnostics(tableName)` - Generate CSV of diagnostics
- `main.js`:
  - Table selector dropdown
  - Type-tabbed statistics display
  - Expandable column details

### Testing Strategy

#### Unit Tests
- ✅ Correctly identify column types from schema
- ✅ Calculate numeric statistics accurately (mean, median, stddev)
- ✅ Calculate character statistics (unique, mode, lengths)
- ✅ Handle null values in statistics calculations
- ✅ Export diagnostics to valid CSV format

#### Integration Tests
- ✅ Generate full diagnostics for table with mixed column types
- ✅ Switch between tables and verify stats update
- ✅ Export and verify CSV content matches displayed stats

### Exit Criteria
- [x] Each table has detailed, type-specific statistics
- [x] Statistics are grouped by column type (numeric, character, date)
- [x] UI allows viewing diagnostics per table
- [x] Can export diagnostics report to CSV
- [x] All tests pass
- [x] Performance acceptable for tables with 100k+ rows

---

## Phase 3: Pre-Registered Query Templates 📋 PLANNED

### Overview
Provide pre-built SQL query templates tailored for hospital claims data analysis.

### Requirements

#### 3.1 Query Template System
- **Template Definition**: Define queries with:
  - Name/title
  - Description (what it does)
  - SQL template with placeholders
  - Required tables
  - Parameters (if any)
- **Template Categories**: Organize by analysis type:
  - Data Quality (duplicates, missing values)
  - Claims Analysis (counts by type, date ranges)
  - Patient Analysis (unique patients, demographics)
  - Cost Analysis (totals, averages by category)

#### 3.2 Hospital Claims Specific Templates
Based on 5 expected files: `fixe`, `diag`, `acte`, `um`, `fixe_2`

**Example Templates**:
1. **Total Claims Count**: `SELECT COUNT(*) FROM fixe`
2. **Claims by Month**: `SELECT MONTH(date_column), COUNT(*) FROM fixe GROUP BY 1`
3. **Unique Patients**: `SELECT COUNT(DISTINCT patient_id) FROM fixe`
4. **Missing Diagnostic Codes**: `SELECT COUNT(*) FROM diag WHERE code IS NULL`
5. **Top 10 Procedures**: `SELECT acte, COUNT(*) FROM acte GROUP BY acte ORDER BY 2 DESC LIMIT 10`
6. **Cross-Table Join**: Join `fixe` with `diag` for combined analysis

#### 3.3 Template UI
- **Template Browser**: Display available templates in sidebar or modal
- **Template Preview**: Show SQL before execution
- **Parameter Inputs**: For templates with parameters (e.g., date ranges)
- **Execute Template**: Run and display results
- **Edit in SQL Editor**: Load template SQL into main editor for customization

#### 3.4 Template Management
- **Template Storage**: Define in JSON/JS configuration file
- **User Templates**: Allow users to save custom queries as templates (localStorage)
- **Template History**: Track recently used templates

### Technical Design

#### Template Data Structure
```javascript
const queryTemplates = [
  {
    id: 'total_claims',
    name: 'Total Claims Count',
    description: 'Count all records in the claims table',
    category: 'basic',
    requiredTables: ['fixe'],
    sql: `SELECT COUNT(*) as total_claims FROM fixe`,
    parameters: []
  },
  {
    id: 'claims_by_date_range',
    name: 'Claims in Date Range',
    description: 'Filter claims between two dates',
    category: 'claims_analysis',
    requiredTables: ['fixe'],
    sql: `SELECT * FROM fixe WHERE date_column BETWEEN {{start_date}} AND {{end_date}}`,
    parameters: [
      { name: 'start_date', type: 'date', label: 'Start Date' },
      { name: 'end_date', type: 'date', label: 'End Date' }
    ]
  }
];
```

#### Key Functions to Add
- `templates.js` (new file):
  - `getAllTemplates()` - Return all available templates
  - `getTemplatesByCategory(category)` - Filter by category
  - `getTemplateById(id)` - Get specific template
  - `renderTemplate(template, params)` - Replace placeholders with values
  - `validateTemplateRequirements(template, loadedTables)` - Check required tables
- `app.js`:
  - `saveUserTemplate(name, sql)` - Save to localStorage
  - `getUserTemplates()` - Load user templates
- `main.js`:
  - Template browser UI
  - Parameter input forms
  - Template execution handler

### Testing Strategy

#### Unit Tests
- ✅ Parse template definitions correctly
- ✅ Replace template parameters with values
- ✅ Validate required tables present before execution
- ✅ Save and load user templates from localStorage
- ✅ Group templates by category

#### Integration Tests
- ✅ Execute each predefined template successfully
- ✅ Templates with parameters render SQL correctly
- ✅ Error when required table not loaded
- ✅ User can save and re-execute custom template

### Exit Criteria
- [x] At least 10 predefined templates for hospital claims data
- [x] Templates organized by category
- [x] UI to browse and execute templates
- [x] Support for parameterized templates
- [x] Users can save custom queries as templates
- [x] All tests pass

---

## Phase 4: Export Functionality 📋 PLANNED

### Overview
Allow users to export query results and diagnostics to CSV format.

### Requirements

#### 4.1 Query Results Export
- **Export Button**: Add "Export to CSV" button below results table
- **CSV Generation**: Convert results to RFC 4180 compliant CSV
- **Filename**: Auto-generate filename (e.g., `query_results_YYYYMMDD_HHMMSS.csv`)
- **Large Results**: Handle exports of 10k+ rows efficiently
- **Encoding**: UTF-8 with BOM for Excel compatibility

#### 4.2 Diagnostics Export
- **Export Diagnostics**: Button in diagnostics dashboard
- **Multiple Formats**:
  - Single CSV with all statistics
  - Separate CSVs per column type
- **Comprehensive Data**: Include all calculated statistics

#### 4.3 Batch Export
- **Export All Tables**: Export each loaded table to separate CSV
- **Zip Archive**: Package multiple CSVs into single download (optional)

### Technical Design

#### CSV Generation
```javascript
function exportToCSV(data, filename) {
  // Convert data to CSV string with proper escaping
  // Handle null values, quotes, commas
  // Add UTF-8 BOM for Excel
  // Trigger download via blob URL
}
```

#### Key Functions to Add
- `export.js` (new file):
  - `convertToCSV(data)` - Generate CSV string from array of objects
  - `downloadCSV(csvString, filename)` - Trigger browser download
  - `exportQueryResults(results, filename)` - Export query results
  - `exportTableDiagnostics(tableName, stats)` - Export diagnostics
- `main.js`:
  - Export button event handlers
  - Filename generation with timestamps

### Testing Strategy

#### Unit Tests
- ✅ Generate valid CSV from data array
- ✅ Properly escape quotes, commas, newlines
- ✅ Handle null/undefined values
- ✅ UTF-8 BOM added for Excel compatibility
- ✅ Generate unique filenames with timestamps

#### Integration Tests
- ✅ Export query results and verify CSV content
- ✅ Export diagnostics and verify all stats included
- ✅ Large export (50k+ rows) completes successfully

#### Manual Testing
- [ ] Open exported CSV in Excel - formatting correct
- [ ] Open exported CSV in LibreOffice - formatting correct
- [ ] Special characters (accents, quotes) preserved
- [ ] Large file (100k+ rows) downloads and opens correctly

### Exit Criteria
- [x] Can export query results to CSV
- [x] Can export diagnostics to CSV
- [x] CSV files are RFC 4180 compliant
- [x] Excel opens exports correctly (UTF-8 BOM)
- [x] Large exports (100k+ rows) work without freezing browser
- [x] All tests pass

---

## Phase 5: Cache Persistence Across Sessions 📋 PLANNED

### Overview
Persist DuckDB data across browser sessions using IndexedDB or OPFS (Origin Private File System).

### Requirements

#### 5.1 Persistence Strategy
- **Storage Backend**: Use DuckDB WASM's built-in persistence with OPFS (preferred) or IndexedDB fallback
- **Automatic Saving**: Periodically save database state
- **Automatic Loading**: Restore previous session on page load
- **Storage Limits**: Monitor and warn when approaching browser storage limits

#### 5.2 Cache Management UI
- **Cache Status**: Display cache size and last saved time
- **Manual Save**: Button to explicitly save current state
- **Clear Cache**: Button to reset/clear all cached data
- **Confirmation Dialog**: Warn before clearing cache

#### 5.3 Session Restoration
- **Auto-restore**: On page load, check for cached session and restore
- **Restore Feedback**: Show which tables were restored
- **Corruption Handling**: Gracefully handle corrupted cache

### Technical Design

#### DuckDB WASM Persistence
```javascript
// Initialize with persistence
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

// Register filesystem (OPFS preferred)
await db.registerFileSystem(duckdb.createOpfsFileSystem());

// Use persistent database file
await db.open({
  path: ':duckdb:',
  query: {
    access_mode: 'read_write'
  }
});
```

#### Key Functions to Add
- `persistence.js` (new file):
  - `initializePersistence()` - Setup OPFS/IndexedDB
  - `saveSession()` - Save current database state
  - `loadSession()` - Restore from cache
  - `clearCache()` - Delete all cached data
  - `getCacheInfo()` - Return size, last modified
- `app.js`:
  - Update initialization to enable persistence
  - Add hooks for auto-save triggers
- `main.js`:
  - Cache management UI
  - Clear cache confirmation dialog

### Testing Strategy

#### Unit Tests
- ✅ Initialize persistence storage successfully
- ✅ Save and restore single table
- ✅ Save and restore multiple tables
- ✅ Clear cache removes all data
- ✅ Get accurate cache size information

#### Integration Tests
- ✅ Upload files, close tab, reopen - data restored
- ✅ Run queries, close browser, reopen - results consistent
- ✅ Clear cache, verify all data removed
- ✅ Handle cache corruption gracefully (no crashes)

#### Manual Testing
- [ ] Upload 5 files with data
- [ ] Close browser completely (not just tab)
- [ ] Reopen browser, navigate to app
- [ ] Verify all 5 tables restored and queryable
- [ ] Clear cache, verify fresh start

### Exit Criteria
- [x] Database persists across browser sessions
- [x] All loaded files restored on page reload
- [x] Cache size displayed to user
- [x] Clear cache button works with confirmation
- [x] Graceful handling of storage quota exceeded
- [x] All tests pass
- [x] Works in Chrome, Firefox, Safari (OPFS or IndexedDB fallback)

### Known Limitations
- Browser storage limits (typically 1-10GB depending on browser)
- OPFS only available in modern browsers (fallback to IndexedDB)
- Private browsing may have different storage rules

---

## Phase 6: Hospital Claims Schema Integration 📋 PLANNED

### Overview
Pre-define schemas for the 5 expected hospital claims files and provide validation/guidance.

### Requirements

#### 6.1 Schema Definitions
Define expected schema for each file type:
- **fixe**: Main claims table (structure TBD with user)
- **diag**: Diagnosis codes table (structure TBD)
- **acte**: Procedure/act codes table (structure TBD)
- **um**: Medical units table (structure TBD)
- **fixe_2**: Secondary claims table (structure TBD)

Each schema includes:
- Column names
- Data types
- Required vs. optional columns
- Sample data format

#### 6.2 Schema Validation
- **Upload-time Validation**: Compare uploaded file schema to expected schema
- **Mismatch Handling**:
  - Warn about missing columns
  - Warn about extra columns
  - Warn about type mismatches
- **Flexible Mode**: Allow proceeding despite mismatches (with warnings)

#### 6.3 Auto-Detection
- **File Type Detection**: Suggest file type based on:
  - Filename matching (e.g., `fixe.parquet` → fixe schema)
  - Column name matching (fuzzy match against known schemas)
- **Smart Defaults**: Pre-fill table name based on detected type

#### 6.4 Schema Documentation
- **Help Panel**: Display expected schema for each file type
- **Example Queries**: Update templates to reference schema columns
- **Data Dictionary**: Describe what each column represents

### Technical Design

#### Schema Definition Format
```javascript
const hospitalClaimsSchemas = {
  fixe: {
    name: 'Main Claims',
    description: 'Primary hospital claims data',
    columns: [
      { name: 'patient_id', type: 'VARCHAR', required: true, description: 'Unique patient identifier' },
      { name: 'claim_date', type: 'DATE', required: true, description: 'Date of claim' },
      { name: 'amount', type: 'DECIMAL', required: true, description: 'Claim amount' },
      // ... more columns
    ]
  },
  // ... other schemas
};
```

#### Key Functions to Add
- `schemas.js` (new file):
  - `getSchema(fileType)` - Return schema definition
  - `validateFileSchema(fileName, actualColumns)` - Compare against expected
  - `detectFileType(fileName, columns)` - Auto-detect based on name/columns
  - `generateSchemaReport(validation)` - Format validation results
- `app.js`:
  - Schema validation during file upload
  - Store validation results with file metadata
- `main.js`:
  - Display validation warnings/errors
  - Schema help panel

### Testing Strategy

#### Unit Tests
- ✅ Schema definitions cover all 5 file types
- ✅ Validate file matches schema correctly
- ✅ Detect missing required columns
- ✅ Detect type mismatches
- ✅ Auto-detect file type from name
- ✅ Auto-detect file type from columns (fuzzy match)

#### Integration Tests
- ✅ Upload file matching schema - no warnings
- ✅ Upload file with missing column - show warning
- ✅ Upload file with extra columns - show warning
- ✅ Upload file with wrong type - show warning
- ✅ Proceed despite warnings, file still queryable

### Exit Criteria
- [x] All 5 hospital claims schemas defined
- [x] Schema validation on file upload
- [x] Auto-detection of file type
- [x] Clear warnings for schema mismatches
- [x] Schema documentation accessible in UI
- [x] All tests pass

### Dependencies
- Requires user input to finalize actual schema definitions
- Coordinate with Phase 3 to update query templates with real column names

---

## Phase 7: UX Enhancements and Polish 📋 PLANNED

### Overview
Improve user experience with better feedback, loading states, keyboard shortcuts, and error handling.

### Requirements

#### 7.1 Loading States
- **Initialization**: Better DuckDB loading indicator (progress, not just spinner)
- **File Upload**: Progress bar for large files
- **Query Execution**: Progress indicator for long queries
- **Export**: Progress indicator for large exports

#### 7.2 Error Handling
- **Friendly Error Messages**: Convert SQL errors to user-friendly language
- **Error Recovery**: Suggestions for common errors (e.g., table not found)
- **Error Logging**: Console logs for debugging (dev mode only)
- **Validation**: Client-side validation before sending to DuckDB

#### 7.3 Keyboard Shortcuts
- **Execute Query**: Ctrl+Enter (already exists)
- **New Query**: Ctrl+N (clear SQL editor)
- **Focus SQL Editor**: Ctrl+L
- **Help Modal**: ? or F1
- **Shortcut Reference**: Visible help overlay

#### 7.4 Performance Optimization
- **Lazy Loading**: Only load diagnostic stats when requested
- **Query Debouncing**: Prevent accidental double-execution
- **Memory Management**: Monitor and warn about large file uploads
- **Web Worker**: Offload heavy operations to worker thread (if not already)

#### 7.5 Accessibility
- **ARIA Labels**: Add semantic labels for screen readers
- **Keyboard Navigation**: Full keyboard navigation support
- **Focus Management**: Proper focus states and tab order
- **Color Contrast**: Ensure WCAG AA compliance

#### 7.6 Mobile Responsiveness
- **Responsive Layout**: Works on tablets (mobile optional)
- **Touch Gestures**: File upload via touch-friendly controls
- **Reduced UI**: Simplified layout for smaller screens

### Technical Design

#### Progress Indicators
```javascript
// File upload progress
function uploadWithProgress(file, progressCallback) {
  const reader = new FileReader();
  reader.onprogress = (e) => {
    if (e.lengthComputable) {
      progressCallback(e.loaded / e.total);
    }
  };
  // ...
}
```

#### Keyboard Shortcuts Manager
```javascript
// Global keyboard handler
const shortcuts = {
  'Ctrl+Enter': executeQuery,
  'Ctrl+N': clearQuery,
  'Ctrl+L': focusSQLEditor,
  '?': showHelp
};
```

### Testing Strategy

#### Unit Tests
- ✅ Keyboard shortcuts trigger correct actions
- ✅ Progress calculations accurate
- ✅ Error messages friendly and helpful

#### Manual Testing
- [ ] Upload 100MB file - progress indicator works
- [ ] Execute slow query - loading state visible
- [ ] Test all keyboard shortcuts
- [ ] Verify accessibility with screen reader
- [ ] Test on tablet device
- [ ] Check all error scenarios have friendly messages

### Exit Criteria
- [x] Loading indicators for all async operations
- [x] Friendly error messages for common SQL errors
- [x] All keyboard shortcuts documented and working
- [x] Accessible to screen readers (ARIA labels)
- [x] Works on desktop and tablet (mobile optional)
- [x] Performance acceptable with large files (100MB+)
- [x] All tests pass

---

## Phase 8: Advanced Features 💡 FUTURE

Optional enhancements for future consideration:

### 8.1 Query Builder UI
- Visual query builder (no SQL required)
- Drag & drop columns to SELECT, WHERE, GROUP BY
- Preview results as you build

### 8.2 Data Visualization
- Chart generation from query results
- Chart types: bar, line, pie, histogram
- Export charts as PNG/SVG
- Interactive charts (zoom, filter)

### 8.3 Advanced Export
- Export to JSON, Excel (XLSX), Parquet
- Export visualizations
- Batch export multiple queries

### 8.4 Query History & Bookmarks
- Persist query history (last 100 queries)
- Bookmark frequently used queries
- Search through query history
- Re-execute historical queries

### 8.5 Collaboration Features
- Export/import application state (tables + queries)
- Share configuration via JSON file
- Load demo datasets for exploration

### 8.6 Advanced SQL Features
- SQL syntax highlighting in editor
- Auto-complete for table/column names
- Query validation before execution
- Explain query plan visualization

### Exit Criteria
TBD - depends on user feedback and priorities

---

## Technical Architecture

### Core Technologies
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Database**: DuckDB WASM (client-side SQL engine)
- **Build Tool**: Vite (fast dev server, optimized builds)
- **Testing**: Vitest + jsdom (unit & integration tests)
- **Deployment**: GitHub Pages (static hosting)

### File Structure
```
DuckMSI/
├── index.html              # Main UI
├── src/
│   ├── app.js              # DuckDB operations, core logic
│   ├── main.js             # UI bindings, event handlers
│   ├── templates.js        # Query templates (Phase 3)
│   ├── export.js           # CSV export logic (Phase 4)
│   ├── persistence.js      # Cache/storage (Phase 5)
│   ├── schemas.js          # Schema definitions (Phase 6)
│   └── *.test.js           # Test files
├── agents/
│   ├── plan.md             # This file
│   └── implementation-log.md # Current state & learnings
├── plans/
│   └── phase-X.X-*.md      # Detailed implementation plans
├── drafts/                 # Project notes, not for production
├── package.json
└── vite.config.js
```

### Design Principles
1. **Privacy First**: No data leaves the browser, ever
2. **Test-Driven**: Write tests before implementation
3. **Incremental**: Small, focused phases with clear exit criteria
4. **User-Centric**: Design for actual hospital claims analysts
5. **Performance**: Handle 100k+ row tables smoothly
6. **Accessibility**: Usable by all, including keyboard/screen reader users

---

## Development Workflow

### For Each Phase

1. **Read Documentation**:
   - Read `agents/plan.md` (this file) to understand phase goals
   - Read `agents/implementation-log.md` for current state
   - Check if `plans/phase-X.X-name.md` exists

2. **Create Branch**:
   ```bash
   git checkout -b feature/phase-X-description
   ```

3. **Create Detailed Plan** (if not exists):
   - Write `plans/phase-X.X-name.md` with:
     - Specific tasks (numbered)
     - Test cases
     - Edge cases to handle
     - Files to modify/create
   - Commit plan to feature branch
   - Push and create PR for plan review

4. **Implement (TDD)**:
   - Write failing tests first
   - Implement to pass tests
   - Refactor for clarity
   - Run `npm test` continuously

5. **Commit & Push**:
   - Clear, descriptive commit messages
   - Push to feature branch (never directly to main)

6. **Create PR**:
   - Open PR with summary and test results
   - Wait for human review

7. **Update Documentation** (after approval):
   - Mark phase complete in `agents/plan.md`
   - Update `agents/implementation-log.md` (keep <100 lines)
   - Merge PR

---

## Known Constraints & Considerations

### Browser Compatibility
- **DuckDB WASM**: Requires modern browser with WebAssembly support
  - Chrome 89+, Firefox 89+, Safari 15+, Edge 89+
- **OPFS (Persistence)**: Chrome 102+, Edge 102+ (fallback to IndexedDB for others)
- **File Upload**: 100MB+ files may require chunked reading

### Performance Limits
- **Browser Memory**: Typically 2-4GB for tab
- **DuckDB WASM**: Generally handles 1M+ rows efficiently
- **Large Files**: 500MB+ parquet files may be slow to load

### Storage Limits
- **OPFS**: Typically 1-10GB depending on browser and disk space
- **IndexedDB**: ~50MB to unlimited (depends on browser)
- **User Prompt**: Some browsers prompt for permission >50MB

### Security Considerations
- **No Backend**: Can't validate file contents server-side
- **Client-Side Only**: No authentication or access control
- **XSS Risk**: Sanitize any user input displayed in UI
- **SQL Injection**: DuckDB WASM is sandboxed, but validate queries

---

## Success Metrics

### Phase 0-2 (MVP)
- Users can upload and query multiple parquet files
- Basic diagnostics provide useful insights
- 90%+ test coverage

### Phase 3-5 (Full Feature Set)
- Hospital claims analysts can perform common analyses without writing SQL
- Data persists across sessions
- Export results for reporting

### Phase 6-7 (Production Ready)
- Schema validation prevents common data errors
- Professional UX with helpful error messages
- Accessible and responsive design

### Phase 8 (Advanced)
- Power users leverage advanced features
- Low barrier to entry for non-SQL users (query builder)
- Visualization aids data understanding

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DuckDB WASM performance insufficient | Low | High | Profile early, optimize queries, add progress indicators |
| Browser storage limits too restrictive | Medium | Medium | Warn users, add file size limits, document constraints |
| Schema mismatches break queries | High | Medium | Phase 6 schema validation, flexible matching |
| File uploads fail for large files | Medium | High | Chunked reading, progress indicators, size warnings |
| Persistence API unstable across browsers | Medium | Medium | Fallback to IndexedDB, test all major browsers |

---

## Future Considerations

### Migration to Framework
If complexity grows, consider migrating to:
- **Svelte**: Lightweight, reactive, good fit for data apps
- **React**: More ecosystem, but heavier bundle
- **Vue**: Middle ground

Criteria for migration:
- State management becomes unwieldy
- Need complex component reusability
- Team preference for typed languages (TypeScript)

### Backend Integration (if requirements change)
If privacy requirements relax:
- Backend API for authentication/authorization
- Shared query templates across organization
- Usage analytics and monitoring
- Pre-processed/cached data

### Desktop App (Electron)
If browser limitations become problematic:
- Native file system access
- No storage limits
- Better performance for huge files
- Offline-first by design

---

## Contact & Questions

For questions about this plan or project direction:
- Create issue in GitHub repository
- Tag @rsimon in relevant discussions
- Update `agents/implementation-log.md` with learnings and questions

---

**Last Updated**: 2026-01-15
**Status**: Phase 0 complete, Phase 1 next
**Maintainer**: Human in the loop (rsimon)

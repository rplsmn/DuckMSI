# Phase 1.1: Multi-File Management

**Status**: In Progress
**Created**: 2026-01-15
**Branch**: feature/phase1-multi-file-management

---

## Overview

Enable users to upload and manage multiple parquet files simultaneously with meaningful, sanitized table names for SQL queries. This phase transforms DuckMSI from a single-file tool to a multi-file workspace.

### Goals

1. **Multiple File Upload**: Users can upload 2+ files at once (drag & drop or file picker)
2. **Smart Table Naming**: Auto-generate SQL-safe table names from filenames
3. **Duplicate Handling**: Prevent naming conflicts with intelligent suffixes
4. **File Management UI**: Display, rename, and remove loaded files
5. **Multi-Table Queries**: Execute SQL queries across all loaded tables

### Success Criteria

- [x] Upload 5+ files simultaneously without errors
- [x] Each file gets a unique, sanitized table name
- [x] File list displays with row/column metadata
- [x] Users can rename tables through UI
- [x] Users can remove individual files or clear all
- [x] SQL queries can JOIN multiple tables
- [x] All unit tests pass (100% coverage on new functions)
- [x] All integration tests pass

---

## Technical Design

### Data Structures

#### File Metadata Tracking

```javascript
// Updated DuckDBApp.loadedFiles structure
loadedFiles = [
  {
    tableName: 'fixe',           // SQL-safe name for queries
    originalName: 'fixe.parquet', // Original filename
    rowCount: 50000,              // Statistics
    columnCount: 25,
    uploadedAt: 1705324800000     // Timestamp for ordering
  },
  {
    tableName: 'my_file',
    originalName: 'my file.parquet',
    rowCount: 12000,
    columnCount: 15,
    uploadedAt: 1705324900000
  }
]
```

### Table Name Sanitization Rules

1. **Strip Extension**: Remove `.parquet` suffix
2. **Replace Spaces**: Convert spaces to underscores (`my file` → `my_file`)
3. **Remove Special Chars**: Keep only alphanumeric and underscores (`file@123.parquet` → `file_123`)
4. **Lowercase**: Convert to lowercase for consistency (`MyFile` → `myfile`)
5. **Deduplicate**: Append `_2`, `_3`, etc. for duplicates

**Examples**:
- `fixe.parquet` → `fixe`
- `my file.parquet` → `my_file`
- `Acte-2024.parquet` → `acte_2024`
- `fixe.parquet` (duplicate) → `fixe_2`

### DuckDB Integration

#### Current Limitation
- DuckDB requires querying files with full filename: `SELECT * FROM 'file.parquet'`

#### Phase 1 Approach
- Continue using registered file buffers with original filenames
- Create SQL VIEWs for each file with sanitized table names
- Users query views: `SELECT * FROM fixe` instead of `SELECT * FROM 'fixe.parquet'`

**Implementation**:
```javascript
// After registering file buffer
await db.registerFileBuffer('my file.parquet', buffer);

// Create view with sanitized name
await conn.query(`CREATE VIEW my_file AS SELECT * FROM 'my file.parquet'`);
```

---

## Implementation Tasks

### Task 1: Add Table Name Sanitization Function

**File**: `src/app.js`

**Function**: `sanitizeTableName(filename)`

**Requirements**:
- Strip `.parquet` extension
- Convert to lowercase
- Replace non-alphanumeric chars (except underscores) with underscores
- Handle edge cases: empty strings, special chars only

**Test Cases**:
```javascript
sanitizeTableName('fixe.parquet')           // → 'fixe'
sanitizeTableName('my file.parquet')        // → 'my_file'
sanitizeTableName('Acte-2024.parquet')      // → 'acte_2024'
sanitizeTableName('file@#$%.parquet')       // → 'file'
sanitizeTableName('123_data.parquet')       // → '123_data'
```

---

### Task 2: Add Duplicate Name Handling

**File**: `src/app.js`

**Function**: `generateUniqueTableName(baseName, existingNames)`

**Requirements**:
- Check if `baseName` exists in `existingNames` array
- If exists, append `_2`, `_3`, etc. until unique
- Return unique name

**Test Cases**:
```javascript
generateUniqueTableName('fixe', [])                    // → 'fixe'
generateUniqueTableName('fixe', ['fixe'])              // → 'fixe_2'
generateUniqueTableName('fixe', ['fixe', 'fixe_2'])    // → 'fixe_3'
generateUniqueTableName('test', ['other', 'names'])    // → 'test'
```

---

### Task 3: Update File Metadata Structure

**File**: `src/app.js`

**Changes to `DuckDBApp` class**:
- Change `loadedFiles` from `string[]` to `object[]` with metadata
- Update `loadParquetFile()` to store metadata and create view
- Add `getTableMetadata(tableName)` to retrieve file info
- Add `getAllTablesMetadata()` to list all loaded files

**New/Updated Methods**:

```javascript
// Updated loadParquetFile signature
async loadParquetFile(fileName, buffer) {
  // Sanitize table name
  const baseName = sanitizeTableName(fileName);
  const existingNames = this.loadedFiles.map(f => f.tableName);
  const tableName = generateUniqueTableName(baseName, existingNames);

  // Register file buffer
  await this.db.registerFileBuffer(fileName, new Uint8Array(buffer));

  // Create view with sanitized name
  await this.conn.query(`CREATE VIEW ${tableName} AS SELECT * FROM '${fileName}'`);

  // Get statistics
  const stats = await this.getFileStatistics(fileName);

  // Store metadata
  this.loadedFiles.push({
    tableName,
    originalName: fileName,
    rowCount: stats.rowCount,
    columnCount: stats.columnCount,
    uploadedAt: Date.now()
  });

  return tableName;
}

// New method
getAllTablesMetadata() {
  return [...this.loadedFiles];
}

// New method
getTableMetadata(tableName) {
  return this.loadedFiles.find(f => f.tableName === tableName);
}
```

**Test Cases**:
- Upload single file, verify metadata stored
- Upload multiple files, verify all metadata stored
- Verify view creation (query by table name works)
- Verify original filename queries still work

---

### Task 4: Add Rename Table Functionality

**File**: `src/app.js`

**Method**: `renameTable(oldName, newName)`

**Requirements**:
- Validate `oldName` exists in loaded files
- Sanitize `newName` (same rules as auto-naming)
- Check `newName` doesn't conflict with existing tables
- Drop old view, create new view with new name
- Update metadata

**Implementation**:
```javascript
async renameTable(oldName, newName) {
  // Validate old name exists
  const fileIndex = this.loadedFiles.findIndex(f => f.tableName === oldName);
  if (fileIndex === -1) {
    throw new Error(`Table '${oldName}' not found`);
  }

  // Sanitize new name
  const sanitizedNewName = sanitizeTableName(newName + '.parquet');

  // Check for conflicts (excluding current table)
  const existingNames = this.loadedFiles
    .filter((_, i) => i !== fileIndex)
    .map(f => f.tableName);

  if (existingNames.includes(sanitizedNewName)) {
    throw new Error(`Table name '${sanitizedNewName}' already exists`);
  }

  // Get original filename
  const originalName = this.loadedFiles[fileIndex].originalName;

  // Drop old view and create new view
  await this.conn.query(`DROP VIEW IF EXISTS ${oldName}`);
  await this.conn.query(`CREATE VIEW ${sanitizedNewName} AS SELECT * FROM '${originalName}'`);

  // Update metadata
  this.loadedFiles[fileIndex].tableName = sanitizedNewName;

  return sanitizedNewName;
}
```

**Test Cases**:
- Rename table to new unique name
- Attempt to rename to existing name (should fail)
- Rename and verify old name query fails
- Rename and verify new name query succeeds
- Rename with special chars (should sanitize)

---

### Task 5: Add Remove Table Functionality

**File**: `src/app.js`

**Method**: `removeTable(tableName)`

**Requirements**:
- Validate table exists
- Drop view from DuckDB
- Remove from metadata
- Note: File buffer remains registered (DuckDB WASM limitation)

**Implementation**:
```javascript
async removeTable(tableName) {
  const fileIndex = this.loadedFiles.findIndex(f => f.tableName === tableName);
  if (fileIndex === -1) {
    throw new Error(`Table '${tableName}' not found`);
  }

  // Drop view
  await this.conn.query(`DROP VIEW IF EXISTS ${tableName}`);

  // Remove from metadata
  this.loadedFiles.splice(fileIndex, 1);
}
```

**Method**: `clearAllTables()`

**Requirements**:
- Drop all views
- Clear metadata array

**Implementation**:
```javascript
async clearAllTables() {
  // Drop all views
  for (const file of this.loadedFiles) {
    await this.conn.query(`DROP VIEW IF EXISTS ${file.tableName}`);
  }

  // Clear metadata
  this.loadedFiles = [];
}
```

**Test Cases**:
- Remove single table, verify it's no longer queryable
- Remove table and verify others still work
- Clear all tables, verify none queryable
- Attempt to remove non-existent table (should fail)

---

### Task 6: Update UI for Multiple Files

**File**: `src/main.js`

**Changes**:
- Update file input to accept multiple files: `<input multiple>`
- Update drop zone to handle multiple files
- Process files sequentially (not in parallel to avoid race conditions)
- Update `updateLoadedFiles()` to show detailed file list

**New UI Elements** (to add to `index.html`):

```html
<!-- File List Table -->
<div id="file-list-container">
  <table class="file-list-table">
    <thead>
      <tr>
        <th>Table Name</th>
        <th>Original File</th>
        <th>Rows</th>
        <th>Columns</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="file-list-body">
      <!-- Dynamic rows -->
    </tbody>
  </table>
</div>

<button id="clear-all-btn" class="btn-danger">Clear All Files</button>
```

**Updated `processFile()` function**:
```javascript
async function processFiles(files) {
  // Process files sequentially
  for (const file of files) {
    try {
      const { name, buffer } = await handleFileUpload(file);
      const tableName = await app.loadParquetFile(name, buffer);

      // Show success for this file
      console.log(`Loaded ${name} as ${tableName}`);
    } catch (error) {
      displayError(error);
    }
  }

  // Update UI after all files loaded
  updateFileListDisplay();
  updateExampleQuery();
}
```

**New `updateFileListDisplay()` function**:
```javascript
function updateFileListDisplay() {
  const files = app.getAllTablesMetadata();
  const tbody = document.getElementById('file-list-body');

  if (files.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-message">No files loaded</td></tr>';
    return;
  }

  tbody.innerHTML = files.map(file => `
    <tr>
      <td class="table-name">${file.tableName}</td>
      <td>${file.originalName}</td>
      <td>${file.rowCount.toLocaleString()}</td>
      <td>${file.columnCount}</td>
      <td>
        <button class="btn-small btn-rename" data-table="${file.tableName}">Rename</button>
        <button class="btn-small btn-danger" data-table="${file.tableName}" onclick="removeFile('${file.tableName}')">Remove</button>
      </td>
    </tr>
  `).join('');

  // Attach rename button handlers
  document.querySelectorAll('.btn-rename').forEach(btn => {
    btn.addEventListener('click', () => handleRename(btn.dataset.table));
  });
}
```

**New functions for UI actions**:
```javascript
async function handleRename(tableName) {
  const newName = prompt(`Rename table "${tableName}" to:`, tableName);
  if (!newName || newName === tableName) return;

  try {
    const sanitizedName = await app.renameTable(tableName, newName);
    displaySuccess(`Renamed "${tableName}" to "${sanitizedName}"`);
    updateFileListDisplay();
    updateExampleQuery();
  } catch (error) {
    displayError(error);
  }
}

async function removeFile(tableName) {
  if (!confirm(`Remove table "${tableName}"?`)) return;

  try {
    await app.removeTable(tableName);
    displaySuccess(`Removed table "${tableName}"`);
    updateFileListDisplay();
    updateExampleQuery();
  } catch (error) {
    displayError(error);
  }
}

async function clearAllFiles() {
  if (!confirm('Remove all loaded files?')) return;

  try {
    await app.clearAllTables();
    displaySuccess('All files cleared');
    updateFileListDisplay();
    diagnosticsDashboard.classList.remove('visible');
    resultsBox.innerHTML = '<p class="message">Results will appear here after executing a query.</p>';
  } catch (error) {
    displayError(error);
  }
}

function updateExampleQuery() {
  const files = app.getAllTablesMetadata();
  if (files.length === 0) {
    sqlInput.placeholder = "SELECT * FROM 'your_file.parquet' LIMIT 10";
    return;
  }

  if (files.length === 1) {
    sqlInput.value = `SELECT * FROM ${files[0].tableName} LIMIT 10`;
  } else {
    // Show example of multi-table query
    sqlInput.value = `-- Available tables: ${files.map(f => f.tableName).join(', ')}\nSELECT * FROM ${files[0].tableName} LIMIT 10`;
  }
}
```

---

### Task 7: Update HTML Structure

**File**: `index.html`

**Changes**:
- Add `multiple` attribute to file input
- Add file list table container
- Add "Clear All" button
- Update CSS for new table layout

**New CSS Styles**:
```css
/* File List Table */
.file-list-table {
  width: 100%;
  margin-top: 15px;
  border-collapse: collapse;
  font-size: 14px;
}

.file-list-table th {
  background: #e9ecef;
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #ccc;
}

.file-list-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #ddd;
}

.file-list-table .table-name {
  font-family: monospace;
  font-weight: 600;
  color: #007bff;
}

.file-list-table .empty-message {
  text-align: center;
  color: #999;
  font-style: italic;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  margin-right: 4px;
}

.btn-rename {
  background: #007bff;
  color: white;
}

.btn-rename:hover {
  background: #0056b3;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

#clear-all-btn {
  margin-top: 10px;
  padding: 8px 16px;
  font-size: 14px;
}
```

---

### Task 8: Update Diagnostics Dashboard

**File**: `src/main.js`

**Changes**:
- Update diagnostics to show stats for all files (not just last uploaded)
- Add table selector dropdown if multiple files loaded

**Options**:
1. **Option A**: Show aggregated stats (total rows across all files)
2. **Option B**: Show stats for selected table (use dropdown)

**Recommended: Option B** (consistent with Phase 0, allows per-file inspection)

**Implementation**:
- Add dropdown above diagnostics dashboard
- Populate with loaded table names
- On selection change, update stats display
- Default to most recently uploaded file

---

## Testing Strategy

### Unit Tests (`src/app.test.js`)

#### Test Suite: `sanitizeTableName`
```javascript
describe('sanitizeTableName', () => {
  it('should remove .parquet extension', () => {
    expect(sanitizeTableName('fixe.parquet')).toBe('fixe');
  });

  it('should convert to lowercase', () => {
    expect(sanitizeTableName('MyFile.parquet')).toBe('myfile');
  });

  it('should replace spaces with underscores', () => {
    expect(sanitizeTableName('my file.parquet')).toBe('my_file');
  });

  it('should replace special characters with underscores', () => {
    expect(sanitizeTableName('file@2024.parquet')).toBe('file_2024');
  });

  it('should handle multiple consecutive special chars', () => {
    expect(sanitizeTableName('file@@##.parquet')).toBe('file');
  });

  it('should preserve numbers and underscores', () => {
    expect(sanitizeTableName('data_123.parquet')).toBe('data_123');
  });
});
```

#### Test Suite: `generateUniqueTableName`
```javascript
describe('generateUniqueTableName', () => {
  it('should return base name if no conflicts', () => {
    expect(generateUniqueTableName('fixe', [])).toBe('fixe');
  });

  it('should append _2 for first duplicate', () => {
    expect(generateUniqueTableName('fixe', ['fixe'])).toBe('fixe_2');
  });

  it('should append _3 for second duplicate', () => {
    expect(generateUniqueTableName('fixe', ['fixe', 'fixe_2'])).toBe('fixe_3');
  });

  it('should handle non-sequential existing names', () => {
    expect(generateUniqueTableName('test', ['test', 'test_3'])).toBe('test_2');
  });
});
```

#### Test Suite: `DuckDBApp.loadParquetFile` (updated)
```javascript
describe('loadParquetFile', () => {
  it('should create view with sanitized table name', async () => {
    const buffer = new ArrayBuffer(8);
    const tableName = await app.loadParquetFile('my file.parquet', buffer);

    expect(tableName).toBe('my_file');
    expect(mockConn.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE VIEW my_file")
    );
  });

  it('should store file metadata', async () => {
    await app.loadParquetFile('test.parquet', new ArrayBuffer(8));
    const metadata = app.getAllTablesMetadata();

    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toMatchObject({
      tableName: 'test',
      originalName: 'test.parquet',
      rowCount: expect.any(Number),
      columnCount: expect.any(Number),
      uploadedAt: expect.any(Number)
    });
  });

  it('should handle duplicate filenames', async () => {
    await app.loadParquetFile('test.parquet', new ArrayBuffer(8));
    await app.loadParquetFile('test.parquet', new ArrayBuffer(8));

    const tables = app.getAllTablesMetadata();
    expect(tables[0].tableName).toBe('test');
    expect(tables[1].tableName).toBe('test_2');
  });
});
```

#### Test Suite: `DuckDBApp.renameTable`
```javascript
describe('renameTable', () => {
  beforeEach(async () => {
    await app.loadParquetFile('test.parquet', new ArrayBuffer(8));
  });

  it('should rename table and update metadata', async () => {
    await app.renameTable('test', 'renamed');
    const metadata = app.getTableMetadata('renamed');

    expect(metadata).toBeDefined();
    expect(metadata.tableName).toBe('renamed');
  });

  it('should sanitize new name', async () => {
    await app.renameTable('test', 'New Name!');
    const metadata = app.getAllTablesMetadata()[0];

    expect(metadata.tableName).toBe('new_name');
  });

  it('should throw error for non-existent table', async () => {
    await expect(app.renameTable('nonexistent', 'new'))
      .rejects.toThrow("Table 'nonexistent' not found");
  });

  it('should throw error for duplicate name', async () => {
    await app.loadParquetFile('other.parquet', new ArrayBuffer(8));
    await expect(app.renameTable('test', 'other'))
      .rejects.toThrow("already exists");
  });
});
```

#### Test Suite: `DuckDBApp.removeTable`
```javascript
describe('removeTable', () => {
  beforeEach(async () => {
    await app.loadParquetFile('test.parquet', new ArrayBuffer(8));
    await app.loadParquetFile('test2.parquet', new ArrayBuffer(8));
  });

  it('should remove table from metadata', async () => {
    await app.removeTable('test');
    const tables = app.getAllTablesMetadata();

    expect(tables).toHaveLength(1);
    expect(tables[0].tableName).toBe('test2');
  });

  it('should drop view in DuckDB', async () => {
    await app.removeTable('test');

    expect(mockConn.query).toHaveBeenCalledWith(
      expect.stringContaining("DROP VIEW IF EXISTS test")
    );
  });

  it('should throw error for non-existent table', async () => {
    await expect(app.removeTable('nonexistent'))
      .rejects.toThrow("not found");
  });
});
```

#### Test Suite: `DuckDBApp.clearAllTables`
```javascript
describe('clearAllTables', () => {
  beforeEach(async () => {
    await app.loadParquetFile('test1.parquet', new ArrayBuffer(8));
    await app.loadParquetFile('test2.parquet', new ArrayBuffer(8));
    await app.loadParquetFile('test3.parquet', new ArrayBuffer(8));
  });

  it('should clear all tables', async () => {
    await app.clearAllTables();
    const tables = app.getAllTablesMetadata();

    expect(tables).toHaveLength(0);
  });

  it('should drop all views', async () => {
    await app.clearAllTables();

    expect(mockConn.query).toHaveBeenCalledWith(
      expect.stringContaining("DROP VIEW IF EXISTS test1")
    );
    expect(mockConn.query).toHaveBeenCalledWith(
      expect.stringContaining("DROP VIEW IF EXISTS test2")
    );
    expect(mockConn.query).toHaveBeenCalledWith(
      expect.stringContaining("DROP VIEW IF EXISTS test3")
    );
  });
});
```

### Integration Tests (`src/integration.test.js` - new file)

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DuckDBApp } from './app.js';

describe('Multi-File Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = new DuckDBApp();
    await app.initialize();
  });

  afterAll(async () => {
    await app.terminate();
  });

  it('should load and query multiple files', async () => {
    // Create mock parquet buffers (would use real parquet files in actual test)
    const buffer1 = createMockParquetBuffer([{ id: 1, name: 'A' }]);
    const buffer2 = createMockParquetBuffer([{ id: 2, name: 'B' }]);

    await app.loadParquetFile('file1.parquet', buffer1);
    await app.loadParquetFile('file2.parquet', buffer2);

    // Query both tables
    const result1 = await app.executeQuery('SELECT * FROM file1');
    const result2 = await app.executeQuery('SELECT * FROM file2');

    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(1);
  });

  it('should handle join queries across tables', async () => {
    // Load two related tables
    // Query with JOIN
    // Verify results
  });

  it('should maintain independence after removing one table', async () => {
    // Load 3 tables
    // Remove middle table
    // Verify other 2 still queryable
  });
});
```

### Manual Testing Checklist

After implementation, manually verify:

- [ ] **Upload 5+ files at once** via drag & drop
  - All files appear in file list
  - Each has unique table name
  - Statistics display correctly

- [ ] **Upload files with special characters in names**
  - `my file.parquet` → displays as `my_file`
  - `data@2024.parquet` → displays as `data_2024`

- [ ] **Upload duplicate filenames**
  - Second `test.parquet` → displays as `test_2`
  - Third `test.parquet` → displays as `test_3`

- [ ] **Rename tables**
  - Click rename button
  - Enter new name with spaces/special chars
  - Verify sanitization applied
  - Old queries fail, new queries succeed

- [ ] **Remove individual files**
  - Click remove on middle file
  - Confirm dialog appears
  - File removed from list
  - Queries to removed table fail
  - Other tables still work

- [ ] **Clear all files**
  - Click "Clear All" button
  - Confirm dialog appears
  - All files removed
  - File list shows "No files loaded"
  - All queries fail with clear error

- [ ] **Execute multi-table queries**
  - Load `fixe.parquet` and `diag.parquet`
  - Execute: `SELECT * FROM fixe f JOIN diag d ON f.id = d.patient_id LIMIT 10`
  - Verify JOIN works correctly

- [ ] **Diagnostics dashboard updates**
  - Select different tables from dropdown
  - Verify stats update for selected table

---

## Edge Cases and Error Handling

### Edge Cases

1. **Empty Filename**: Filename is only `.parquet`
   - Sanitization produces empty string
   - **Solution**: Use fallback name `table_1`, `table_2`, etc.

2. **Very Long Filenames**: Filename > 100 characters
   - **Solution**: Truncate to 50 chars after sanitization

3. **Non-ASCII Characters**: Filenames with accents, emojis, etc.
   - **Solution**: Replace with underscores (conservative approach)

4. **All Special Characters**: `@#$%.parquet`
   - Sanitization produces empty string
   - **Solution**: Use fallback name

5. **Reserved SQL Keywords**: `select.parquet`, `table.parquet`
   - Could conflict with SQL syntax
   - **Solution**: Append underscore prefix: `_select`, `_table`

6. **10+ Duplicate Files**: `test.parquet` uploaded many times
   - **Solution**: Continue incrementing: `test_11`, `test_12`, etc.

### Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Upload non-parquet file | Display error: "Only .parquet files supported" |
| Upload corrupted parquet | DuckDB error, display: "Failed to load file" |
| Rename to existing name | Display error: "Table name already exists" |
| Query removed table | DuckDB error, display: "Table 'X' not found" |
| Upload while DuckDB not initialized | Display error: "Please wait for initialization" |
| Browser storage full | DuckDB may throw error, display: "Storage limit reached" |

---

## Files to Modify/Create

### Modified Files

1. **`src/app.js`**
   - Add `sanitizeTableName()` function
   - Add `generateUniqueTableName()` function
   - Update `DuckDBApp.loadedFiles` structure
   - Update `DuckDBApp.loadParquetFile()` to create views and store metadata
   - Add `DuckDBApp.getAllTablesMetadata()`
   - Add `DuckDBApp.getTableMetadata(tableName)`
   - Add `DuckDBApp.renameTable(oldName, newName)`
   - Add `DuckDBApp.removeTable(tableName)`
   - Add `DuckDBApp.clearAllTables()`

2. **`src/main.js`**
   - Update file input to accept multiple files
   - Update drop zone handler for multiple files
   - Add `updateFileListDisplay()` function
   - Add `handleRename(tableName)` function
   - Add `removeFile(tableName)` function
   - Add `clearAllFiles()` function
   - Add `updateExampleQuery()` function
   - Update `processFile()` → `processFiles()` for batch handling

3. **`index.html`**
   - Add `multiple` attribute to `<input type="file">`
   - Add file list table structure
   - Add "Clear All Files" button
   - Add CSS for file list table and action buttons

### New Files

4. **`src/app.test.js`** (update with new tests)
   - Test suites for new functions and methods

5. **`src/integration.test.js`** (new)
   - End-to-end tests with real DuckDB WASM instance
   - Multi-file load and query scenarios

---

## Implementation Order

Follow TDD approach:

1. **Write tests for `sanitizeTableName()`** → Implement function
2. **Write tests for `generateUniqueTableName()`** → Implement function
3. **Write tests for updated `loadParquetFile()`** → Update method
4. **Write tests for `renameTable()`** → Implement method
5. **Write tests for `removeTable()` and `clearAllTables()`** → Implement methods
6. **Update UI components** → Test manually
7. **Integration tests** → Verify end-to-end workflows
8. **Run full test suite** → Fix any failures
9. **Manual testing checklist** → Verify all scenarios

---

## Performance Considerations

### Expected Performance

- **File Upload**: Sequential upload of 5 files (~10MB each) should complete in <10 seconds
- **View Creation**: Creating views is fast (milliseconds per view)
- **Query Execution**: No performance degradation vs Phase 0
- **UI Updates**: File list re-render should be <50ms (even with 20 files)

### Potential Bottlenecks

1. **Large Number of Files**: 50+ files may slow UI rendering
   - **Mitigation**: Use virtual scrolling if needed (Phase 7)

2. **Duplicate Name Checking**: O(n) lookup for each file
   - **Mitigation**: Use Set for O(1) lookups if >100 files

3. **Statistics Calculation**: Querying stats for each file on upload
   - **Mitigation**: Already async, sequential processing prevents overwhelming DuckDB

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| View creation fails for special filenames | High | Medium | Escape table names in SQL (use backticks if needed) |
| Memory usage grows with many files | Medium | Low | Phase 0 had single file, now multiple - monitor but unlikely to be an issue |
| User confusion with sanitized names | Low | Medium | Show both original and table names in file list |
| Rename conflicts with existing tables | Medium | High | Validate before rename, show clear error message |

---

## Open Questions

1. **Should we limit the number of simultaneous files?**
   - Recommendation: No hard limit initially, add warning at 20+ files if needed

2. **Should table names be editable inline or via modal?**
   - Recommendation: Use `prompt()` for Phase 1 simplicity, inline editing in Phase 7

3. **Should we support dropping files via folder drag & drop?**
   - Recommendation: No, file picker handles this. Folders not needed for Phase 1.

4. **What happens to diagnostics with multiple files?**
   - Recommendation: Use dropdown to select table (similar to Phase 0, per-file stats)

---

## Success Metrics

### Quantitative

- 100% test coverage on new functions
- All 8 test suites pass
- Manual testing checklist 100% complete
- No performance regression vs Phase 0

### Qualitative

- Users can intuitively upload and manage multiple files
- Table names are predictable and SQL-safe
- Error messages are clear and actionable
- UI feels responsive and professional

---

## Next Steps After Completion

1. Update `agents/implementation-log.md` with learnings
2. Mark Phase 1 complete in `agents/plan.md`
3. Deploy to GitHub Pages for user testing
4. Gather feedback for Phase 2 (Enhanced Diagnostics)

---

**Estimated Effort**: 4-6 hours (implementation + testing)
**Complexity**: Medium (multiple moving parts, but well-defined scope)

# SQL Templates & Macros Architecture

This document describes how SQL templates integrate with DuckDB table macros in DuckMSI.

## Overview

Templates in the command palette don't just insert raw SQL - they call **DuckDB table macros** that encapsulate reusable query logic. This provides:

- **Maintainability**: Update the macro once, all template calls use the new logic
- **Reusability**: Same macro callable from templates, ad-hoc queries, or other macros
- **Testability**: Macros can be tested independently
- **Separation**: SQL logic in `.sql` files, not embedded in JavaScript

## Architecture

```
src/
├── modules/
│   └── templates/
│       ├── macros/                    # SQL macro definitions
│       │   ├── casemix.sql           # One file per macro
│       │   ├── top_ghm.sql
│       │   └── ...
│       │
│       ├── macro-loader.js           # Registers macros at startup
│       ├── templates.js              # Template registry
│       ├── categories.js             # Category definitions
│       │
│       └── data/                     # Template metadata (calls macros)
│           ├── casemix-templates.js
│           └── ...
```

## Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. App Startup                                                  │
│    └─ macro-loader.js reads all .sql files from macros/        │
│    └─ Registers each as a DuckDB table macro                   │
├─────────────────────────────────────────────────────────────────┤
│ 2. User Opens Command Palette                                   │
│    └─ templates.js provides list of available templates        │
│    └─ Each template knows which macro it calls                 │
├─────────────────────────────────────────────────────────────────┤
│ 3. User Selects Template                                        │
│    └─ Template inserts: SELECT * FROM macro_name(args)         │
│    └─ User can modify args before executing                    │
├─────────────────────────────────────────────────────────────────┤
│ 4. Query Execution                                              │
│    └─ DuckDB resolves macro and runs the underlying SQL        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: Casemix Template

### 1. Define the Macro SQL

```sql
-- src/modules/templates/macros/casemix.sql

-- Macro: get_casemix
-- Description: Count GHM codes excluding severity 90 (CMD 90 = error codes)
-- Returns: Table with ghm2 counts ordered by GHM code

CREATE OR REPLACE MACRO get_casemix() AS TABLE
SELECT
  ghm2,
  COUNT(*) as count
FROM fixe
WHERE SUBSTR(ghm2, 1, 2) != '90'
GROUP BY ghm2
ORDER BY ghm2;
```

### 2. Register Macro at Startup

```javascript
// src/modules/templates/macro-loader.js

const MACRO_FILES = [
  'casemix.sql',
  // Add more macro files here
];

/**
 * Load and register all SQL macros with DuckDB
 * Called once during app initialization
 */
export async function registerMacros(connection) {
  const macroDir = '/modules/templates/macros/';

  for (const file of MACRO_FILES) {
    try {
      const response = await fetch(macroDir + file);
      const sql = await response.text();
      await connection.query(sql);
      console.log(`Registered macro from ${file}`);
    } catch (error) {
      console.error(`Failed to register macro ${file}:`, error);
    }
  }
}

/**
 * Alternative: Auto-discover .sql files (requires file listing API)
 */
export async function registerMacrosFromDirectory(connection, macroFiles) {
  for (const { name, sql } of macroFiles) {
    try {
      await connection.query(sql);
      console.log(`Registered macro: ${name}`);
    } catch (error) {
      console.error(`Failed to register macro ${name}:`, error);
    }
  }
}
```

### 3. Define the Template Metadata

```javascript
// src/modules/templates/data/casemix-templates.js

export const casemixTemplates = [
  {
    id: 'casemix',
    title: 'Casemix (GHM Distribution)',
    description: 'Count GHM codes excluding CMD 90 error codes',
    icon: '📊',
    category: 'casemix',

    // The macro this template calls
    macro: 'get_casemix',

    // SQL inserted into editor when selected
    sql: `SELECT * FROM get_casemix()`,

    // No placeholders - this macro takes no arguments
    placeholders: []
  },

  // Example with parameters
  {
    id: 'casemix-by-year',
    title: 'Casemix by Year',
    description: 'GHM distribution filtered by year',
    icon: '📅',
    category: 'casemix',
    macro: 'get_casemix_by_year',
    sql: `SELECT * FROM get_casemix_by_year({year})`,
    placeholders: ['year']
  }
];
```

### 4. Register in Template Registry

```javascript
// src/modules/templates/templates.js

import { casemixTemplates } from './data/casemix-templates.js';
// ... other imports

const ALL_TEMPLATES = [
  ...casemixTemplates.map(t => ({ ...t, category: 'casemix' })),
  // ... other template categories
];
```

### 5. Add Category

```javascript
// src/modules/templates/categories.js

export const CATEGORIES = [
  { id: 'casemix', label: 'Casemix', icon: '🏥' },
  // ... other categories
];
```

---

## Integration with App Startup

```javascript
// src/main.js (or app initialization)

import { registerMacros } from './modules/templates/macro-loader.js';

async function initializeApp() {
  // 1. Initialize DuckDB
  const db = await initDuckDB();
  const connection = await db.connect();

  // 2. Register all SQL macros
  await registerMacros(connection);

  // 3. Continue with rest of app initialization
  // ...
}
```

---

## Adding New Templates

### Quick Reference

| Task | File(s) to Edit |
|------|-----------------|
| Add new macro | Create `macros/your_macro.sql` |
| Register macro | Add filename to `macro-loader.js` |
| Add template | Add object to `data/your-category.js` |
| New category | Add to `categories.js` + create data file |

### Step-by-Step: Adding a New Macro + Template

1. **Create the SQL macro file**
   ```sql
   -- src/modules/templates/macros/top_ghm.sql
   CREATE OR REPLACE MACRO get_top_ghm(n) AS TABLE
   SELECT ghm2, COUNT(*) as count
   FROM fixe
   GROUP BY ghm2
   ORDER BY count DESC
   LIMIT n;
   ```

2. **Register in macro-loader.js**
   ```javascript
   const MACRO_FILES = [
     'casemix.sql',
     'top_ghm.sql',  // Add this
   ];
   ```

3. **Add template metadata**
   ```javascript
   // In data/casemix-templates.js
   {
     id: 'top-ghm',
     title: 'Top N GHM Codes',
     description: 'Most frequent GHM codes',
     icon: '🔝',
     macro: 'get_top_ghm',
     sql: `SELECT * FROM get_top_ghm({n})`,
     placeholders: ['n']
   }
   ```

---

## Macro Naming Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| `get_*` | `get_casemix()` | Returns data (table macro) |
| `calc_*` | `calc_dms(sejour_id)` | Computes derived values |
| `filter_*` | `filter_by_cmd(cmd)` | Subset of data |
| `agg_*` | `agg_monthly_stays()` | Aggregated statistics |

---

## Testing Macros

Macros can be tested independently in any DuckDB session:

```sql
-- Register the macro
CREATE OR REPLACE MACRO get_casemix() AS TABLE
SELECT ghm2, COUNT(*) as count
FROM fixe
WHERE SUBSTR(ghm2, 1, 2) != '90'
GROUP BY ghm2
ORDER BY ghm2;

-- Test it
SELECT * FROM get_casemix();

-- Verify expected results
SELECT COUNT(*) FROM get_casemix() WHERE count > 100;
```

---

## File Locations Summary

```
src/modules/templates/
├── macros/              ← SQL files (you maintain these)
│   ├── casemix.sql
│   ├── top_ghm.sql
│   └── ...
│
├── macro-loader.js      ← Registers macros at startup
├── categories.js        ← Category definitions
├── templates.js         ← Template registry + search
│
└── data/                ← Template metadata (calls macros)
    ├── casemix-templates.js
    └── ...
```

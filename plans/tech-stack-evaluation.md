# Tech Stack Evaluation Report: DuckMSI

**Date**: 2026-01-16
**Purpose**: Comprehensive evaluation of technology alternatives for the DuckMSI privacy-first parquet explorer

---

## Executive Summary

This report evaluates technology alternatives across five dimensions: data processing engine, frontend framework, build tooling, testing, and deployment. Based on the project's requirements (privacy-first, client-side only, scalable to production) and the developer's background (strong R, learning Rust, limited frontend JS experience), the recommended stack is:

| Layer | Current | Recommended | Rationale |
|-------|---------|-------------|-----------|
| Data Engine | DuckDB WASM | **Keep DuckDB WASM** | Best-in-class for browser SQL, excellent Parquet support, active development |
| Frontend | Vanilla JS | **Migrate to Svelte 5** | Better DX, small bundles, data viz ecosystem, gentler learning curve |
| Build | Vite | **Keep Vite** | Fast, modern, excellent Svelte integration |
| Testing | Vitest | **Keep Vitest** | Fast, Vite-native, good jsdom support |
| Deployment | GitHub Pages | **Keep GitHub Pages** (consider Cloudflare later) | Simple, free, fits current needs |
| SQL Editor | Basic textarea | **CodeMirror 6 + DuckDB autocomplete** | Lightweight, schema-aware completions, syntax highlighting |

**Key Insight**: The current stack is well-chosen. The main opportunity for improvement is adopting Svelte 5 for better component management as complexity grows—but this can wait until Phase 2-3 when UI complexity warrants it.

---

## 1. Project Requirements Recap

### Core Requirements
- **Privacy-first**: All data processing must happen client-side; no data leaves the browser
- **Parquet support**: Must handle hospital claims data in Parquet format
- **SQL interface**: Users need to write/run SQL queries
- **Scalability**: Should handle tables with 100k+ rows smoothly
- **Production-ready**: Will eventually be deployed as an official company tool

### Developer Context
- **Strengths**: Fluent in R, knows DuckDB well, comfortable with Shiny/Quarto patterns
- **Learning**: Rust (registered for training), wants practical project experience
- **Gaps**: Limited JS/TS experience, prefers frameworks that generate HTML/CSS
- **Preference**: Stack that can grow with the project

---

## 2. Data Processing Layer

### Option A: DuckDB WASM (Current)

**What it is**: The DuckDB analytical database compiled to WebAssembly, running entirely in-browser.

**Strengths**:
- **Mature & battle-tested**: Same vectorized engine as desktop DuckDB
- **First-class Parquet**: Native support with column pruning, predicate pushdown, and HTTP range reads
- **Full SQL**: Window functions, joins, aggregations—all work as expected
- **Active development**: December 2025 added Iceberg support; AWS re:Invent demo showed S3 access from browser
- **Sweet spot alignment**: "Most dashboards need 100-200 MB of data, tight filters, sub-second answers—that's the sweet spot for DuckDB-WASM"
- **Your expertise**: You know DuckDB well, reducing learning curve

**Limitations**:
- No spatial extension support in WASM (not relevant for this project)
- ~30MB initial download for WASM bundle
- Memory limited by browser (~2-4GB per tab)

**Sources**: [MotherDuck Blog](https://motherduck.com/blog/duckdb-wasm-in-browser/), [DuckDB Iceberg in Browser](https://duckdb.org/2025/12/16/iceberg-in-the-browser), [GitHub - DuckDB WASM](https://github.com/duckdb/duckdb-wasm)

---

### Option B: Polars WASM

**What it is**: The Polars DataFrame library (Rust-based) compiled to WebAssembly.

**Strengths**:
- **Rust-based**: Aligns with your Rust learning goals
- **Fast**: Zero-copy Arrow interop, lazy evaluation
- **DataFrame API**: More familiar if coming from R/pandas patterns

**Limitations**:
- **WASM support is immature**: GitHub issue #16729 notes "enabling parquet feature also enables compression deps that are hard to cross-compile to wasm32-unknown-unknown"
- **No SQL interface**: Would need to learn Polars API instead of SQL
- **Bundle size concerns**: "supporting all compression schemes bloats up the WASM bundle"
- **Less documentation**: Fewer browser-specific examples compared to DuckDB

**Verdict**: **Not recommended** for this project. WASM support is experimental, you'd lose SQL interface, and it doesn't leverage your DuckDB expertise.

**Sources**: [Polars WASM Issue #16729](https://github.com/pola-rs/polars/issues/16729), [Polars Website](https://pola.rs/)

---

### Option C: Apache DataFusion WASM

**What it is**: Apache DataFusion SQL query engine compiled to WebAssembly.

**Strengths**:
- **Rust-based**: Good for learning Rust internals
- **SQL support**: Full SQL query engine
- **Published to npm**: Available at `datafusion-wasm` package
- **Recent improvements**: DataFusion 47.0.0 (April 2025) added better WASM support with u64 API changes

**Limitations**:
- **Early experimental**: Playground is "early experimental stage"
- **Larger bundle**: ~30MB artifact after optimization, <10MB compressed
- **Smaller community**: Less documentation and examples than DuckDB
- **Less Parquet optimization**: DuckDB's Parquet handling is more mature

**Verdict**: **Interesting for Rust learning, but not for production**. If you want to contribute to an open-source Rust project, DataFusion is excellent. For shipping a product, DuckDB is more battle-tested.

**Sources**: [DataFusion WASM Playground](https://github.com/datafusion-contrib/datafusion-wasm-playground), [DataFusion WASM Bindings](https://github.com/datafusion-contrib/datafusion-wasm-bindings), [DataFusion 47.0.0 Release](https://datafusion.apache.org/blog/2025/07/11/datafusion-47.0.0/)

---

### Option D: Custom WASM (Rust/C++)

**What it is**: Build your own data processing library compiled to WASM.

**Strengths**:
- **Maximum control**: Tailor exactly to your needs
- **Learning opportunity**: Deep Rust + WASM experience

**Limitations**:
- **Massive undertaking**: You'd be reimplementing what DuckDB already does
- **Time to production**: Months to years vs. days with DuckDB
- **Maintenance burden**: You own all the bugs

**Verdict**: **Not recommended**. This is a "build-vs-buy" decision where "buy" (DuckDB) clearly wins unless you have very unusual requirements.

---

### Data Layer Recommendation: **Keep DuckDB WASM**

**Rationale**:
1. You already know DuckDB—leverage this expertise
2. Best-in-class browser SQL with mature Parquet support
3. Active development with recent Iceberg/S3 additions
4. Aligns perfectly with project requirements
5. Large community and documentation

**Future consideration**: If you want Rust experience, consider contributing to DuckDB's Rust bindings or DataFusion as a side project, not as the production stack.

---

## 3. Frontend Framework

### Option A: Vanilla JavaScript (Current)

**What it is**: Plain HTML/CSS/JS with ES Modules, no framework.

**Strengths**:
- **No dependencies**: Nothing to update or break
- **Small bundle**: Zero framework overhead
- **Simple**: Easy to understand, no magic
- **Current state**: Already working, Phase 0 complete

**Limitations**:
- **State management**: Gets complex with multi-file management (Phase 1)
- **Component reuse**: Manual DOM manipulation becomes tedious
- **Reactivity**: No automatic UI updates when data changes
- **Developer experience**: More boilerplate as app grows

**When to stick with it**: If the app stays simple (1-2 views, minimal interactivity).

---

### Option B: Svelte 5

**What it is**: A compiler-based framework that produces vanilla JS at build time.

**Strengths**:
- **Compiler-first**: No virtual DOM, compiles to efficient vanilla JS
- **Small bundles**: "As small as 3KB for simple apps"; 30% faster loads in 2025 benchmarks
- **Gentle learning curve**: Closest to writing plain HTML/CSS/JS
- **Data viz ecosystem**: "Svelte is a favorite among data journalists building rich, interactive dashboards"
- **Layer Cake**: Excellent charting library specifically for Svelte
- **Runes system**: Svelte 5's `$state`, `$derived`, `$effect` make reactivity explicit and predictable
- **SvelteKit**: Supports SSR, SSG, static hosting—perfect for GitHub Pages

**Limitations**:
- **Learning curve**: Still a framework to learn (though gentler than React/Vue)
- **Smaller ecosystem**: Fewer plugins than React, though growing fast
- **Migration effort**: Would need to refactor existing code

**When to choose**: When UI complexity grows (Phase 2+), when you need reactive updates, when building reusable components.

**Sources**: [Svelte 5 & SvelteKit Guide](https://naturaily.com/blog/why-svelte-is-next-big-thing-javascript-development), [Svelte Performance Deep Dive](https://dev.to/krish_kakadiya_5f0eaf6342/why-svelte-5-is-redefining-frontend-performance-in-2025-a-deep-dive-into-reactivity-and-bundle-5200), [Svelte December 2025 Update](https://svelte.dev/blog/whats-new-in-svelte-december-2025)

---

### Option C: HTMX

**What it is**: A library that extends HTML with attributes for AJAX, SSE, WebSockets.

**Strengths**:
- **Tiny**: Only 14KB
- **Progressive enhancement**: Works without JS, enhances with it
- **Server-driven**: Great for traditional server-rendered apps
- **Simple mental model**: HTML attributes instead of JavaScript

**Limitations**:
- **Requires server**: Designed for server-rendered HTML responses
- **Not for SPAs**: "HTMX is not ideal if you are building a complex single-page application"
- **No client-side state**: Poor fit for client-side data processing
- **Fundamental mismatch**: Your app is client-only; HTMX is server-centric

**Verdict**: **Not recommended**. HTMX solves a different problem (server-rendered apps with progressive enhancement). Your app is fully client-side with DuckDB WASM—there's no server to return HTML fragments.

**Sources**: [HTMX Documentation](https://htmx.org/docs/), [HTMX vs React Comparison](https://dualite.dev/blog/htmx-vs-react)

---

### Option D: Shinylive (R or Python)

**What it is**: Shiny apps compiled to WASM via webR (R) or Pyodide (Python), running in-browser.

**Strengths**:
- **Familiar**: You know Shiny very well
- **Full R/Python**: Access to tidyverse, dplyr, etc.
- **Reactive model**: Shiny's reactivity is well-designed
- **Quarto integration**: Can embed in Quarto documents

**Limitations**:
- **Performance overhead**: webR is "about 1.5-3x slower than native R" in benchmarks; Pyodide similar
- **Package limitations**: "Not all packages immediately available"; "not possible to install packages from source in webR"
- **Large downloads**: Full R/Python runtime + packages = significant initial load
- **Memory constraints**: "Mobile browsers may place restrictive limits on RAM provided to WebAssembly... allocating more than ~300MB not reliable on Chrome Android"
- **No secrets**: "All code and data is fully accessible to end users"
- **DuckDB integration complexity**: Would need to bridge R/Python ↔ DuckDB WASM

**Verdict**: **Not recommended for primary development**. While tempting given your R expertise, the performance overhead and package limitations make it less suitable than direct JS + DuckDB WASM. However, Shinylive could be excellent for **prototyping** or **internal demo versions**.

**Sources**: [Shinylive GitHub](https://github.com/posit-dev/shinylive), [R Shinylive Package](https://posit-dev.github.io/r-shinylive/), [webR Performance Analysis](https://renkun.me/2023/03/12/webr-performance/)

---

### Option E: Quarto with Observable JS

**What it is**: Quarto documents with interactive OJS cells that can use DuckDB.

**Strengths**:
- **Familiar workflow**: You've used Quarto before
- **DuckDB integration**: Native DuckDB client in Observable
- **Literate programming**: Mix narrative with code
- **Multiple outputs**: Can render to HTML, PDF, etc.

**Limitations**:
- **Document-focused**: "Quarto is ideal for static reports, scientific articles, or books... when it comes to interactive dashboards, Quarto requires more effort"
- **Full client-side load**: "The data is fully loaded by the web browser every time the web page is opened"
- **Limited interactivity**: Good for exploration, less for app-like UX
- **HTTP range read issues**: "Testing on GitHub Pages and CloudFlare Pages all fell back to a full read" for Parquet files

**Verdict**: **Good for documentation/demos, not for primary app**. Consider Quarto for creating a companion "how to use this tool" guide, but not for the main application.

**Sources**: [Quarto + DuckDB Observable](https://observablehq.com/@rlesur/quarto-duckdb), [Observable Framework vs Quarto](https://www.appsilon.com/post/observable-framework-data-science-dashboards)

---

### Frontend Recommendation: **Migrate to Svelte 5 (When Complexity Warrants)**

**Immediate action**: Keep vanilla JS for Phase 1 (multi-file management is manageable without a framework).

**Migration trigger**: Consider Svelte when:
- Phase 2 diagnostics UI becomes complex (multiple tabs, expandable sections)
- State management across components becomes error-prone
- You find yourself writing repetitive DOM manipulation code

**Why Svelte over React/Vue**:
1. **Compiler-first**: Feels closer to vanilla JS, gentler learning curve
2. **Data viz affinity**: Strong ecosystem for dashboards and charts
3. **Small bundles**: Aligns with your current lightweight approach
4. **Growing adoption**: "Significant enterprise adoption expected by 2026"

**Migration path**:
1. Learn Svelte basics with a small side project
2. Rewrite one component (e.g., file list) in Svelte
3. Gradually migrate remaining components
4. Use SvelteKit for routing if needed later

---

## 4. Build Tooling

### Option A: Vite (Current)

**What it is**: Modern build tool using esbuild for dev, Rollup for production.

**Strengths**:
- **Fast dev server**: Cold start ~1.2s vs Webpack's ~7s
- **Instant HMR**: 10-20ms vs Webpack's 500ms-1.6s
- **ES modules native**: No bundling during development
- **Svelte plugin**: First-class support via `@sveltejs/vite-plugin-svelte`
- **Simple config**: Sensible defaults, minimal configuration needed

**Limitations**:
- **Rollup for production**: Advanced tweaks require Rollup plugin knowledge
- **Smaller plugin ecosystem**: Though growing rapidly

---

### Option B: Webpack

**What it is**: The original powerful, configurable bundler.

**Strengths**:
- **Massive ecosystem**: Plugin for everything
- **Battle-tested**: Handles any complexity
- **Fine-grained control**: Configure everything

**Limitations**:
- **Slow**: 7s cold start, 500ms+ HMR
- **Complex configuration**: Notorious learning curve
- **Overkill**: Your project doesn't need this complexity

---

### Option C: esbuild

**What it is**: Extremely fast Go-based bundler.

**Strengths**:
- **Blazing fast**: 10-100x faster than alternatives
- **Simple API**: Minimal configuration

**Limitations**:
- **Still beta** (v0.21.1): API may change
- **Limited plugin ecosystem**: Fewer out-of-box features
- **No HMR**: Would need additional tooling

**Verdict**: Vite already uses esbuild under the hood for the speed benefits.

---

### Build Recommendation: **Keep Vite**

**Rationale**:
1. Already configured and working
2. Best-in-class developer experience
3. Perfect Svelte integration if you migrate
4. No reason to change

**Sources**: [Vite vs Webpack 2026](https://dev.to/pockit_tools/vite-vs-webpack-in-2026-a-complete-migration-guide-and-deep-performance-analysis-5ej5), [Why Vite](https://vite.dev/guide/why)

---

## 5. Testing

### Option A: Vitest (Current)

**What it is**: Vite-native test runner, API-compatible with Jest.

**Strengths**:
- **Vite integration**: Shares config, uses same transforms
- **Fast**: Leverages Vite's speed
- **Jest-compatible**: Familiar API
- **jsdom support**: DOM testing works well

**Limitations**:
- **Vite-centric**: Less portable if you change build tools (unlikely)

---

### Option B: Jest

**What it is**: The most popular JavaScript testing framework.

**Strengths**:
- **Huge ecosystem**: Most examples use Jest
- **Mature**: Battle-tested, well-documented

**Limitations**:
- **Slower**: Doesn't leverage Vite's transforms
- **Configuration overhead**: Need separate config for ES modules

---

### Option C: Playwright/Cypress

**What it is**: End-to-end testing frameworks.

**Strengths**:
- **Real browser testing**: Catches integration issues
- **Visual testing**: Screenshot comparisons

**When to add**: Phase 7 (UX polish) for comprehensive testing.

---

### Testing Recommendation: **Keep Vitest, Add Playwright Later**

**Rationale**:
1. Vitest is working well
2. Vite-native = faster feedback loops
3. Add Playwright in Phase 7 for E2E tests

---

## 6. Deployment

### Option A: GitHub Pages (Current)

**What it is**: Free static hosting from GitHub.

**Strengths**:
- **Free**: No cost for public repos
- **Simple**: `deploy.sh` already working
- **Git integration**: Deploys on push
- **Custom domains**: Supported

**Limitations**:
- **Static only**: No server-side logic (fine for this project)
- **Bandwidth limits**: 100GB/month soft limit
- **Build limits**: 10 builds per hour

---

### Option B: Cloudflare Workers/Pages

**What it is**: Edge hosting with optional serverless functions.

**Strengths**:
- **Fast edge network**: Global CDN
- **Generous free tier**: 100,000 requests/day free
- **Vite plugin**: First-class Vite integration
- **Future flexibility**: Can add Workers for server logic later

**Limitations**:
- **Migration effort**: Need to set up Wrangler, configure deployment
- **Pages deprecated**: April 2025 deprecation, migrating to Workers
- **Learning curve**: New deployment workflow

---

### Option C: Self-hosted (Your Website Subdomain)

**What it is**: Hosting on your own infrastructure.

**Strengths**:
- **Full control**: Your domain, your rules
- **Company branding**: Official company subdomain

**Limitations**:
- **Maintenance burden**: You manage uptime, SSL, etc.
- **Overkill for MVP**: Adds complexity without benefit

---

### Deployment Recommendation: **Keep GitHub Pages, Consider Cloudflare for Production**

**For development/MVP**: GitHub Pages is perfect—free, simple, working.

**For production deployment**: When ready for company-official deployment, consider:
1. **Cloudflare Workers** for edge performance + future serverless options
2. **Your company subdomain** pointed at Cloudflare

**Sources**: [Cloudflare Workers Static Sites](https://developers.cloudflare.com/workers/static-assets/), [Deploy to Cloudflare Workers 2025](https://vibecodingwithfred.com/blog/cloudflare-workers-deployment/)

---

## 7. Decision Matrix

| Criterion | Weight | DuckDB | Polars | DataFusion | Custom |
|-----------|--------|--------|--------|------------|--------|
| Browser maturity | 25% | 5 | 2 | 3 | 1 |
| Parquet support | 20% | 5 | 4 | 4 | 2 |
| SQL interface | 20% | 5 | 1 | 5 | 2 |
| Your expertise | 15% | 5 | 2 | 2 | 3 |
| Documentation | 10% | 5 | 3 | 3 | 1 |
| Active development | 10% | 5 | 4 | 4 | 3 |
| **Weighted Score** | | **4.85** | **2.35** | **3.35** | **1.85** |

| Criterion | Weight | Vanilla JS | Svelte 5 | HTMX | Shinylive | Quarto |
|-----------|--------|------------|----------|------|-----------|--------|
| Learning curve (for you) | 20% | 5 | 4 | 2 | 5 | 4 |
| Bundle size | 15% | 5 | 4 | 5 | 2 | 3 |
| Scalability | 20% | 2 | 5 | 1 | 3 | 2 |
| Data viz ecosystem | 15% | 2 | 5 | 1 | 4 | 4 |
| Client-side fit | 20% | 5 | 5 | 1 | 4 | 4 |
| Long-term maintainability | 10% | 2 | 4 | 2 | 3 | 2 |
| **Weighted Score** | | **3.55** | **4.55** | **1.75** | **3.55** | **3.20** |

---

## 8. Final Recommendations

### Immediate (Phase 1)
- **Keep everything as-is**: The current stack is well-suited for Phase 1
- **No changes needed**: Vanilla JS can handle multi-file management

### Short-term (Phase 2-3)
- **Learn Svelte basics**: Spend a few hours with the Svelte tutorial
- **Evaluate migration**: If UI complexity feels painful, start migrating to Svelte
- **Keep DuckDB WASM**: It's the right choice

### Medium-term (Phase 4-7)
- **Complete Svelte migration**: If started, finish it
- **Add Playwright E2E tests**: Phase 7 polish
- **Consider Cloudflare**: When approaching production deployment

### Long-term (Production)
- **Cloudflare Workers deployment**: Edge performance, company domain
- **Monitor DuckDB WASM updates**: Stay current with new features

---

## 9. Rust Learning Path (Side Recommendation)

Since you want to learn Rust on a practical project, here are options that don't jeopardize DuckMSI:

1. **Contribute to DataFusion**: Open issues, documentation, small features
2. **Build a CLI tool**: Parquet file inspector in Rust (complements DuckMSI)
3. **WASM experiment**: Small Rust → WASM library for a specific feature (e.g., custom data validation)
4. **DuckDB Rust bindings**: Contribute to the ecosystem you're using

This separates "learning Rust" from "shipping DuckMSI" while still being relevant to the project domain.

---

## 10. SQL Console/Editor Options

**Question**: Should you add an enhanced SQL editor with autocompletion and syntax highlighting? Should you leverage webR + dplyr/dbplyr for an R-like experience instead?

### Option A: CodeMirror 6

**What it is**: A modular, extensible code editor for the web.

**Strengths**:
- **Lightweight**: Much smaller than Monaco (~150KB vs ~2MB)
- **SQL support**: `@codemirror/lang-sql` provides syntax highlighting and basic completions
- **Flexible autocomplete**: `@codemirror/autocomplete` can be configured with custom completions
- **Proven in production**: Turso Shell uses CodeMirror for browser-based SQL editing
- **DuckDB dialect**: Can configure for DuckDB-specific syntax

**Limitations**:
- **Schema-aware completion requires work**: Need to query DuckDB for table/column names and wire them to CodeMirror
- **Not out-of-box**: More assembly required than Monaco

**Implementation approach**:
```javascript
import { sql, DuckDBDialect } from "@codemirror/lang-sql";
import { autocompletion } from "@codemirror/autocomplete";

// Custom completion source from DuckDB schema
const schemaCompletion = (context) => {
  // Query DuckDB: SHOW TABLES, DESCRIBE table_name
  // Return completions for tables, columns
};
```

**Sources**: [CodeMirror](https://codemirror.net/), [Turso Shell Architecture](https://turso.tech/blog/how-we-built-the-turso-shell-in-the-browser)

---

### Option B: Monaco Editor

**What it is**: The VS Code editor extracted as a library.

**Strengths**:
- **Full IDE experience**: Intellisense, error squiggles, go-to-definition
- **Built-in SQL support**: Some SQL languages supported by default
- **Familiar**: Same editor as VS Code

**Limitations**:
- **Heavy**: ~2-3MB bundle, 3+ seconds to load
- **Overkill**: Most features irrelevant for single-query SQL editing
- **Complex API**: Steeper learning curve

**Verdict**: **Consider only if you want VS Code-level experience**. For a lightweight parquet explorer, CodeMirror is better suited.

**Sources**: [Monaco SQL Editor](https://www.accessforever.org/post/monaco-sql-editor), [Monaco Customization Guide](https://www.checklyhq.com/blog/customizing-monaco/)

---

### Option C: DuckDB Native Autocomplete

**What it is**: DuckDB WASM can autoload its `autocomplete` extension.

**Strengths**:
- **Zero extra dependencies**: Uses DuckDB's built-in autocomplete
- **Schema-aware by default**: Knows your tables and columns
- **Context-aware**: Understands SQL grammar

**Limitations**:
- **CLI-style**: Designed for terminal, not rich text editor
- **No syntax highlighting**: Only completion, not visual editing
- **Integration work**: Need to bridge to textarea/editor component

**Implementation approach**:
```javascript
// DuckDB WASM autoloads autocomplete extension
const completions = await conn.query(`
  SELECT * FROM sql_auto_complete('SELECT * FROM my_t')
`);
```

**Verdict**: **Use as completion source for CodeMirror**. DuckDB provides the intelligence; CodeMirror provides the UI.

**Sources**: [DuckDB Autocomplete Docs](https://duckdb.org/docs/stable/clients/cli/autocomplete)

---

### Option D: Duck-UI / DuckDB Local UI

**What it is**: Pre-built browser SQL IDE for DuckDB.

**Strengths**:
- **Ready to use**: Syntax highlighting, autocomplete, results table
- **Maintained by DuckDB team**: Local UI is official (March 2025)
- **Demo available**: https://demo.duckui.com

**Limitations**:
- **Separate tool**: Not integrated into your app
- **May not fit your UX**: Less control over design
- **Dependency**: Relying on external project

**Verdict**: **Good for inspiration or as alternative tool**. Look at how Duck-UI implements features, but build your own for full control.

**Sources**: [Duck-UI Demo](https://demo.duckui.com), [DuckDB Local UI Blog](https://duckdb.org/2025/03/12/duckdb-ui)

---

### Option E: webR + dplyr/dbplyr/duckplyr

**What it is**: Run R in the browser via webR, using dplyr syntax that translates to DuckDB.

**Strengths**:
- **Familiar for you**: You're fluent in R and dplyr
- **duckplyr magic**: "Translates dplyr operations to DuckDB's relational API directly, bypassing SQL parser"
- **Working example exists**: [duckdb-flights-shinylive](https://github.com/georgestagg/duckdb-flights-shinylive) demonstrates Parquet + duckplyr in browser
- **Improved load times**: "Complex Shinylive app load time decreased from over a minute to 15 seconds"

**Limitations**:
- **Additional complexity**: Now running two WASM runtimes (webR + DuckDB WASM)
- **Can't install DuckDB extensions in webR**: "You can't yet install a DuckDB extension that would allow directly querying over HTTP without downloading the whole file"
- **Package limitations**: Not all R packages work in webR
- **Larger download**: R runtime + packages on top of DuckDB WASM
- **Two mental models**: Users switching between R console and SQL console
- **Maintenance burden**: More moving parts to break

**Architecture implications**:
```
Current: Browser → DuckDB WASM → Parquet files
With webR: Browser → webR → duckplyr → DuckDB (inside R) → Parquet files
                   ↘ also → DuckDB WASM → Parquet files (for direct SQL)
```

**Verdict**: **Not recommended as primary interface, but interesting as optional feature**.

The complexity doesn't justify the benefit for this project:
1. Your users need to write SQL for hospital claims analysis—that's the core use case
2. Adding an R console doubles the complexity without doubling the value
3. webR + DuckDB integration is still maturing (extension limitations)

**However**, consider this for a **future "power user" mode**:
- Add an optional R console for users who prefer dplyr
- Keep SQL as the primary interface
- This could be Phase 8+ scope

**Sources**: [Shinylive + duckplyr Example](https://github.com/georgestagg/duckdb-flights-shinylive), [duckplyr Package](https://duckdb.org/2024/04/02/duckplyr), [webR + DuckDB Blog](https://r.iresmi.net/posts/2024/webr/index.html)

---

### SQL Editor Recommendation: **CodeMirror 6 + DuckDB Autocomplete**

**Recommended approach**:
1. **Use CodeMirror 6** for the editor component (lightweight, flexible)
2. **Configure `@codemirror/lang-sql`** for DuckDB dialect syntax highlighting
3. **Query DuckDB's autocomplete** to populate CodeMirror's completion source
4. **Phase 8 (optional)**: Add webR console for power users who prefer dplyr

**Implementation phases**:

| Phase | Feature | Effort |
|-------|---------|--------|
| Phase 7 | Basic syntax highlighting with CodeMirror | Low |
| Phase 7 | Table/column autocomplete from DuckDB schema | Medium |
| Phase 8+ | Optional R console with duckplyr (power users) | High |

**Why not webR as primary?**
- Adds significant complexity (two WASM runtimes)
- Extension limitations make DuckDB integration incomplete
- SQL is the lingua franca for data analysis; R is a niche preference
- Users can use dplyr locally and paste generated SQL into your app

---

## 11. Visual SQL Query Builder: Critical Analysis

**Question**: Should we build a visual drag-and-drop query builder so users don't need to write SQL?

### What Exists Today

| Tool | Type | Client-Side? | Full SQL? | Status |
|------|------|--------------|-----------|--------|
| [React Query Builder](https://react-querybuilder.js.org/) | WHERE clause builder | Yes | **No** - only filters | Active |
| [React Awesome Query Builder](https://github.com/ukrbublik/react-awesome-query-builder) | Filter builder | Yes | **No** - only WHERE | Active |
| [Metabase](https://www.metabase.com/) | Full BI tool | **No** - needs server | Partial | "Query builder is quite basic" |
| [DBeaver](https://dbeaver.io/) | Desktop app | **No** - desktop | Yes | Not embeddable |
| [Web-VQD](https://github.com/swapnilmj/web-vqd) | Visual query designer | Yes | SELECT only | MySQL only, outdated |
| [Azimutt](https://azimutt.app/) | Schema explorer | Partial | No - exploration only | Active |

**Key finding**: There is **no existing pure client-side visual query builder** that handles full SQL (JOINs, GROUP BY, aggregations, window functions). The closest tools are:

1. **Filter builders** (react-querybuilder): Only generate WHERE clauses
2. **Server-dependent tools** (Metabase): Violate your privacy requirement
3. **Desktop apps** (DBeaver): Violate your web-only requirement

### The Honest Assessment: Should You Build One?

**Short answer: No, not as a primary investment. Here's why:**

#### 1. Scope is Massive

A visual query builder that handles:
- Table selection with schema awareness
- JOIN configuration (INNER, LEFT, RIGHT, CROSS)
- Column selection with aliases
- WHERE clause construction
- GROUP BY with aggregations (COUNT, SUM, AVG, etc.)
- HAVING clauses
- ORDER BY with direction
- LIMIT/OFFSET
- Subqueries
- Window functions

...is a **multi-month to multi-year project**. Even Metabase, backed by a funded company, has a query builder described as "quite basic" where users "often need to fall back to writing SQL."

#### 2. Your Users Are Analysts

Hospital claims analysts work with data professionally. They either:
- Already know SQL (most likely)
- Can learn basic SQL with good templates and autocomplete
- Use tools like SAS, R, or Python that they'd need to translate anyway

A visual query builder optimizes for users who *can't* write SQL. But your users *can*—they just want it to be *easier*.

#### 3. Query Templates Solve 80% of the Problem

Phase 3 (Query Templates) addresses the real pain point:

```
User thought: "I don't want to write SQL from scratch every time"
NOT: "I can't write SQL at all"
```

Pre-built templates for:
- Claims by month/year
- Top diagnoses by frequency
- Patient demographics
- Cost summaries by category
- Missing data checks

...cover the common analyses without requiring users to build queries visually.

#### 4. Autocomplete Solves Another 15%

CodeMirror + DuckDB autocomplete (Section 10) addresses:
- "What tables are loaded?"
- "What columns does this table have?"
- "What's the correct syntax?"

This is cheaper to build and more useful for SQL-capable users.

### What Might Be Worth Building (Smaller Scope)

Instead of a full visual query builder, consider these **focused alternatives**:

#### Option A: Filter Assistant (Low Effort)

A simple panel that helps construct WHERE clauses:

```
┌─────────────────────────────────────────┐
│ Filter Assistant                        │
├─────────────────────────────────────────┤
│ Table: [fixe ▼]                         │
│                                         │
│ Add Filter:                             │
│ [column ▼] [= ▼] [value    ] [+ Add]   │
│                                         │
│ Active Filters:                         │
│ • patient_id = 12345          [×]       │
│ • claim_date > '2024-01-01'   [×]       │
│                                         │
│ Generated WHERE:                        │
│ WHERE patient_id = 12345                │
│   AND claim_date > '2024-01-01'         │
│                                         │
│ [Insert into Query]                     │
└─────────────────────────────────────────┘
```

**Effort**: Medium (2-3 weeks)
**Value**: High for filter-heavy workflows
**Technology**: React Query Builder could work here

#### Option B: Schema Explorer with Click-to-Insert (Low Effort)

Show loaded tables and columns; click to insert into query:

```
┌──────────────────────┐  ┌─────────────────────────────┐
│ Tables               │  │ SELECT                      │
├──────────────────────┤  │   |                         │
│ ▼ fixe (50,000 rows) │  │ FROM fixe                   │
│   • patient_id (INT) │  │                             │
│   • claim_date (DATE)│  │                             │
│   • amount (DECIMAL) │  │                             │
│ ▶ diag               │  │                             │
│ ▶ acte               │  │                             │
└──────────────────────┘  └─────────────────────────────┘
        Click column → inserts "fixe.patient_id" at cursor
```

**Effort**: Low (1-2 weeks)
**Value**: High for schema discovery
**Technology**: Custom component + CodeMirror integration

#### Option C: Natural Language to SQL via WebLLM (Experimental)

[WebLLM](https://webllm.mlc.ai/) runs LLMs entirely in-browser via WebGPU. No server, no data leaves the device.

```
User: "Show me total claims by month for 2024"
       ↓ (WebLLM with schema context)
Generated: SELECT DATE_TRUNC('month', claim_date) as month,
                  COUNT(*) as total_claims
           FROM fixe
           WHERE claim_date >= '2024-01-01'
           GROUP BY 1
           ORDER BY 1
```

**Pros**:
- Preserves privacy (runs locally)
- Handles arbitrary queries
- Natural interface for non-SQL users

**Cons**:
- Requires WebGPU (modern browsers only)
- Large model download (~2-4GB)
- Quality depends on model and schema context
- Security risk: LLM-generated SQL can be exploited ([2025 research](https://arxiv.org/abs/2503.05445) shows 0.44% poisoned data → 79% attack success)

**Verdict**: Interesting for Phase 8+, but experimental and has security implications.

### Recommendation: Don't Build a Visual Query Builder

**Instead, invest in this priority order:**

| Priority | Feature | Phase | Effort | Impact |
|----------|---------|-------|--------|--------|
| 1 | Query Templates (pre-built analyses) | Phase 3 | Medium | High |
| 2 | Schema Explorer with click-to-insert | Phase 7 | Low | Medium |
| 3 | CodeMirror + DuckDB autocomplete | Phase 7 | Medium | High |
| 4 | Filter Assistant (WHERE builder) | Phase 7 | Medium | Medium |
| 5 | WebLLM text-to-SQL (experimental) | Phase 8+ | High | Unknown |

**Why this order?**

1. **Templates** give immediate value with known queries
2. **Schema Explorer** helps users understand their data
3. **Autocomplete** reduces syntax errors
4. **Filter Assistant** helps with the most common query modification
5. **Text-to-SQL** is experimental and has security concerns

### The Privacy Angle: Why Not Just Use Existing Tools?

You asked: *"considering this project's goal and requirements... maybe we'd be better off building some solutions ourselves"*

**The honest answer**: The privacy requirement doesn't *force* you to build a visual query builder. Here's why:

1. **Existing filter builders work client-side**: React Query Builder runs in browser, no server needed
2. **Schema explorers can be client-side**: Custom component reading DuckDB metadata
3. **The gap is full visual SQL builders**: These don't exist client-side, but you don't *need* one

The privacy requirement *does* mean:
- Can't use Metabase (needs server)
- Can't use cloud-based text-to-SQL APIs
- Must be careful with WebLLM (model could leak info in unexpected ways)

But these limitations don't create a compelling case for building a full visual query builder. The ROI isn't there.

### Final Verdict

**Don't build a visual SQL query builder.** The scope is enormous, the value is questionable for analyst users, and better alternatives exist:

- Query templates for common analyses
- Autocomplete for SQL assistance
- Schema explorer for discovery
- Filter assistant for WHERE clauses

If you find yourself with months of spare time and a burning desire to build something novel, consider WebLLM text-to-SQL as an experimental Phase 8+ feature. But even then, approach with caution due to security implications.

**Sources**:
- [React Query Builder](https://react-querybuilder.js.org/)
- [React Awesome Query Builder](https://github.com/ukrbublik/react-awesome-query-builder)
- [Metabase Query Builder Limitations](https://trevor.io/blog/metabase-alternatives)
- [WebLLM](https://webllm.mlc.ai/)
- [Text-to-SQL Security Research](https://arxiv.org/abs/2503.05445)
- [Azimutt Schema Explorer](https://azimutt.app/)
- [SQL Schema Visualizer](https://github.com/sqlhabit/sql_schema_visualizer)

---

## Appendix: Source Links

### DuckDB WASM
- [MotherDuck Blog: DuckDB WASM in Browser](https://motherduck.com/blog/duckdb-wasm-in-browser/)
- [DuckDB Iceberg in Browser (Dec 2025)](https://duckdb.org/2025/12/16/iceberg-in-the-browser)
- [GitHub: DuckDB WASM](https://github.com/duckdb/duckdb-wasm)

### Polars WASM
- [GitHub Issue #16729: WASM Support](https://github.com/pola-rs/polars/issues/16729)
- [Polars Official Site](https://pola.rs/)

### DataFusion WASM
- [DataFusion WASM Playground](https://github.com/datafusion-contrib/datafusion-wasm-playground)
- [DataFusion 47.0.0 Release](https://datafusion.apache.org/blog/2025/07/11/datafusion-47.0.0/)

### Svelte
- [Svelte 5 & SvelteKit Guide](https://naturaily.com/blog/why-svelte-is-next-big-thing-javascript-development)
- [What's New in Svelte: December 2025](https://svelte.dev/blog/whats-new-in-svelte-december-2025)

### Shinylive / webR
- [Shinylive GitHub](https://github.com/posit-dev/shinylive)
- [R Shinylive Package](https://posit-dev.github.io/r-shinylive/)
- [webR Performance Analysis](https://renkun.me/2023/03/12/webr-performance/)

### HTMX
- [HTMX Documentation](https://htmx.org/docs/)
- [HTMX vs React Comparison](https://dualite.dev/blog/htmx-vs-react)

### Build Tools
- [Why Vite](https://vite.dev/guide/why)
- [Vite vs Webpack 2026](https://dev.to/pockit_tools/vite-vs-webpack-in-2026-a-complete-migration-guide-and-deep-performance-analysis-5ej5)

### Deployment
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Deploy to Cloudflare Workers 2025](https://vibecodingwithfred.com/blog/cloudflare-workers-deployment/)

### WebAssembly Performance
- [WebAssembly Performance Analysis](https://weihang-wang.github.io/papers/imc21.pdf)
- [State of WebAssembly 2024-2025](https://platform.uno/blog/state-of-webassembly-2024-2025/)

### SQL Editors
- [CodeMirror](https://codemirror.net/)
- [Turso Shell Architecture](https://turso.tech/blog/how-we-built-the-turso-shell-in-the-browser)
- [Monaco SQL Editor](https://www.accessforever.org/post/monaco-sql-editor)
- [DuckDB Autocomplete Docs](https://duckdb.org/docs/stable/clients/cli/autocomplete)
- [DuckDB Local UI](https://duckdb.org/2025/03/12/duckdb-ui)
- [Duck-UI Demo](https://demo.duckui.com)

### webR + duckplyr
- [Shinylive + duckplyr Example](https://github.com/georgestagg/duckdb-flights-shinylive)
- [duckplyr Package](https://duckdb.org/2024/04/02/duckplyr)
- [webR + DuckDB Integration](https://r.iresmi.net/posts/2024/webr/index.html)
- [duckplyr vs dbplyr Discussion](https://github.com/tidyverse/duckplyr/issues/145)

### Visual Query Builders
- [React Query Builder](https://react-querybuilder.js.org/)
- [React Awesome Query Builder](https://github.com/ukrbublik/react-awesome-query-builder)
- [Metabase Query Builder Limitations](https://trevor.io/blog/metabase-alternatives)
- [Web-VQD](https://github.com/swapnilmj/web-vqd)

### Schema Visualization
- [Azimutt Schema Explorer](https://azimutt.app/)
- [SQL Schema Visualizer](https://github.com/sqlhabit/sql_schema_visualizer)
- [DHTMLX ERD](https://dhtmlx.com/blog/create-basic-javascript-entity-relationship-diagram-dhtmlx/)

### Text-to-SQL / WebLLM
- [WebLLM - In-Browser LLM](https://webllm.mlc.ai/)
- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [Text-to-SQL Security Research (2025)](https://arxiv.org/abs/2503.05445)

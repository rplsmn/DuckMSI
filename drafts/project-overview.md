We want a local only app to explore parquet files using DuckDB WASM
The core principle is that we know all of our users have the same SHAPE of parquet files but their own data in it, and we want to provide them a way to analyse these files fully client side (sensitive data)

Here's a bullet point list of the ideas that drive this app :

- We know that tradtionnaly there are 5 files, we know their schemas (number of, types, and names of variables)
- CORE : We need to be able to load 1 to N parquet files, and give them names automatically or from a user text input when loaded as tables in DuckDB. Upload 1 file at a time ? Trade off between preserving performance vs single click multiple related tables ? 
- Give summary diagnostics about the files once uploaded (value boxes or similar) : COUNT of rows, count of distinct, number of columns, take ideas from R's package skimr ? Maybe treat numerical variables to a different summary than character vars
- CORE : buttons that compute pre-registered queries in the special case where we know the shape of the data the user is going to input -> start with this, and give the free text SQL box in another page / pop up / modal ?
- CORE : give a TEXT INPUT FOR SQL SELECT QUERIES + a table output that shows (first N rows if too big ?) for the query (use cheetah grid ?)
- Retain cache / DuckDB instance across sessions (browser closed, computer turned off)
- Give a button to reset this cache

User flows : 
1) upload 1 to N files, see diagnostics
2a) trigger pre-made queries -> export results 
2b) trigger pre-made queries -> go deeper with free sql -> export results
2c) go straight to with free sql -> export results
3) close (save or clean ?)

The data : it's hospital claims data, we know everything about the expected schema of the known 5 files (fixe, diag, acte, um, fixe_2) because another of our services builds the files for our users
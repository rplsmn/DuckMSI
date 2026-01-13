### Project Overview

This project implements a static HTML page for parquet files upload, exploration using DuckDB WASM and aggregates / visualisation exports.
The goal is to provide a privacy preserving way for people that own secure / private data and cannot setup DuckDB / a data science environnemnt to be able to explore their data in the browser without sending the data to a remote server.
The app provides SELECT statements only, has a few pre-made SQL statements, and offers to export the results to csv (or image formats when applicable).

### The Development Loop

Always read the agents/ documents if they exist before you work.

```
┌─────────────────────────────────────────────────────────┐
│ 1. READ DOCS (if exist)                                            │
│    └─ plan.md → implementation-log.md      │
├─────────────────────────────────────────────────────────┤
│ 2. CREATE PHASE PLAN                                    │
│    └─ plans/phase-X.X-name.md (detailed tasks, tests)  │
├─────────────────────────────────────────────────────────┤
│ 3. IMPLEMENT                                            │
│    └─ TDD: tests first → code → verify exit criteria   │
├─────────────────────────────────────────────────────────┤
│ 4. PUSH PR                                              │
│    └─ Branch → PR → wait for human review              │
├─────────────────────────────────────────────────────────┤
│ 5. UPDATE DOCS (after human approval)                  │
│    ├─ Update implementation-log.md (keep <100 lines)   │
│    ├─ Mark phase complete in plan.md                   │
│    └─ Merge PR                                          │
└─────────────────────────────────────────────────────────┘
        │                                        │
        └────────── Loop back to step 1 ────────┘
```

### Document Maintenance Rules

**`agents/plan.md`** (Can be longer, ~500 lines):

- Full roadmap, all phases, exit criteria
- Update when: phase completes, requirements change, major architectural shift
- Mark phases with ✅/🚧/⬜ status
- Keep technical details (hyperparameters, architectures)

**`agents/implementation-log.md`** (MUST stay <100 lines):

- **Purpose**: Prime LLM on current state and boundaries only
- **NOT a detailed plan** - that goes in `plans/phase-X.X-name.md`
- Update when: phase completes, boundaries change
- Remove: completed phase details (keep only status table)
- Keep: current phase pointer, boundaries (what NOT to do), critical learnings

**After each phase completion**:

1. Update implementation-log.md: mark phase done, update current phase, check line count
2. Update plan.md: mark phase ✅, update status table if needed
3. Archive detailed work in git commits (don't bloat the log)

#### Why These Documents Matter

- **`plan.md`** is your north star - it prevents scope creep and ensures each phase has clear completion criteria
- **`implementation-log.md`** is institutional memory - it captures what worked, what didn't, and why decisions were made
- Together they enable any developer (human or AI) to pick up the project and continue effectively

#### Maintaining These Documents

As the project progresses, these documents can become unwieldy. **Periodically review and compact them**:

**For `implementation-log.md`:**

- Completed phases can be removed once stable (keep key learnings if useful for later phases)
- Collapse multiple phase sections into summary tables when appropriate

**For `plan.md`:**

- Most of the time, doesn't need updatges
- Remove or update phases that no longer apply due to architectural changes
- Mark completed phases with ✅
- Update exit criteria if experience shows they were unrealistic or need adjustment
- Remove speculative future phases that are no longer relevant

**When to compact:**

- When documents exceed ~500 lines and become hard to scan
- When major architectural decisions invalidate earlier plans
- When starting a new major phase
- When multiple sessions have added incremental updates that can be consolidated

### Quick Development Steps

1. Read phase requirements from `agents/plan.md`

IF `plans/phase-X.X-name.md` for the current phase DOESN'T EXIST

1. Create detailed implementation plan in `plans/phase-X.X-name.md`
2. Commit with detailed message to plan/ branch (never to main)
3. Push branch and create PR
4. After human approval: update docs (keep log <100 lines), merge PR

IF `plans/phase-X.X-name.md` for the current phase ALREADY EXISTS (committed recently)

1. Create TodoWrite list with specific tasks
2. Write unit tests for core functionality first
3. Implement core logic, run `cargo test --lib` continuously
4. Verify all exit criteria met
5. Commit with detailed message (never to main)
6. Push branch and create PR
7. After human approval: update docs (keep log <100 lines), merge PR

### Long-Running Tasks

For any task that are not generative, e.g. deploying:

1. **Do NOT run it yourself** - it will timeout or block progress
2. **Provide the command** to the human with clear instructions
3. **Wait for feedback** - the human will run it and report results
4. **Complete all your other independant work before handing off**
5. **Continue based on results** - adjust approach if needed

Example:

```
I've committed and pushed the changes. A deployment is needed, it will take ~30 minutes. Please run:

    cargo run --bin train_gol --release

And let me know that it worked.
```

### Completion Protocol

Use the gh cli utility to manage interactions with Github.
When working on a new phase / task independant of the previous one, create a new dedicated branch
The human in the loop is responsible for reviewing your work through the PR's

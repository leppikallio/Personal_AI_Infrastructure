---
name: DefenseInDepth
description: Validate at EVERY layer data passes through to make bugs structurally impossible. Four layers - entry validation, business logic, environment guards, debug instrumentation. USE WHEN "invalid data causes failures", "deep execution failures", fixing bugs caused by bad data, after finding data validation issues, or when single validation point feels insufficient. Makes bugs structurally impossible by preventing bypass through different code paths, refactoring, or mocks.
---

# Defense-in-Depth Validation

## When to Activate This Skill

**Use when:**
- Invalid data causes failures deep in execution
- Fixing a bug caused by bad/missing data
- Single validation point feels insufficient
- User says "invalid data", "validation bug", "data corruption"
- Data passes through multiple system layers
- After finding a bug that should have been caught earlier
- Concerned about validation being bypassed by different code paths

**Use ESPECIALLY when:**
- Bug was caused by unexpected empty/null/invalid values
- Different code paths could bypass single validation
- Mocks might skip validation logic
- System has multiple entry points for same data
- Want to make bug recurrence structurally impossible

## Overview

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.

**Single validation: "We fixed the bug"**
**Multiple layers: "We made the bug impossible"**

## Core Philosophy

**Validate at EVERY layer + Defense in depth = Structurally impossible bugs**

This skill implements layered validation:

- **Entry Point:** Reject obviously invalid input at API boundary
- **Business Logic:** Ensure data makes sense for this operation
- **Environment Guards:** Prevent dangerous operations in specific contexts (tests, production)
- **Debug Instrumentation:** Capture context for forensics when other layers fail
- **No Assumptions:** Never assume earlier code validated data
- **Different Cases:** Each layer catches different failure modes
- **Test Each Layer:** Verify lower layers catch what upper layers miss

## 🎯 Why Multiple Layers

Different layers catch different cases:
- **Entry validation** catches most bugs (wrong API usage)
- **Business logic** catches edge cases (valid input, invalid for this operation)
- **Environment guards** prevent context-specific dangers (test pollution, prod safety)
- **Debug logging** helps when other layers fail (forensics)

**Key insight:** All four layers are necessary because:
- Different code paths bypass entry validation
- Mocks bypass business logic checks
- Edge cases on different platforms need environment guards
- Debug logging identifies structural misuse

## 📋 The Four Layers

### Layer 1: Entry Point Validation 🚪

**Purpose:** Reject obviously invalid input at API boundary

**What to check:**
- Required fields present (not null/undefined/empty)
- Types correct (string not number, array not object)
- Format valid (paths exist, IDs match pattern)
- Ranges sensible (positive numbers, valid dates)

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

**When this layer catches bugs:**
- Developer passes wrong argument
- API misuse (wrong order, wrong type)
- Null/undefined passed by mistake

### Layer 2: Business Logic Validation ⚙️

**Purpose:** Ensure data makes sense for this operation

**What to check:**
- Operation-specific requirements (can't delete if in use)
- State dependencies (must be initialized before X)
- Domain rules (project needs valid directory)
- Preconditions (must have permission)

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  if (!sessionId) {
    throw new Error('sessionId required for workspace initialization');
  }
  // ... proceed
}
```

**When this layer catches bugs:**
- Data passed entry validation but wrong for this operation
- Edge cases not caught by entry checks
- State dependencies violated
- Different code path bypassed entry validation

### Layer 3: Environment Guards 🛡️

**Purpose:** Prevent dangerous operations in specific contexts

**What to guard:**
- Test environment (no writes to real directories)
- Production environment (no debug operations)
- Platform-specific (prevent macOS-specific bugs on Linux)
- CI environment (stricter validation)

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

**When this layer catches bugs:**
- Tests pollute source directories
- Production performs dangerous operations
- Platform-specific edge cases
- Mocks bypass validation

### Layer 4: Debug Instrumentation 🔍

**Purpose:** Capture context for forensics

**What to log:**
- Input values that triggered this path
- Current working directory
- Stack trace showing who called this
- Environment state (test vs prod)
- Timestamp and operation sequence

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    env: process.env.NODE_ENV,
    stack,
  });
  // ... proceed
}
```

**When this layer helps:**
- All other layers failed to prevent bug
- Need to understand how invalid data reached this point
- Debugging intermittent failures
- Understanding usage patterns

## 🔄 Applying the Pattern

When you find a bug caused by invalid data:

**Step 1: Trace the data flow**
- Where does bad value originate?
- What code path did it take?
- Where was it used that caused failure?

**Step 2: Map all checkpoints**
- List every function/method data passes through
- Identify entry points (external API, internal API)
- Identify business logic layers
- Identify environment-specific code

**Step 3: Add validation at each layer**
- Layer 1 (Entry): Validate at API boundary
- Layer 2 (Business): Validate operation makes sense
- Layer 3 (Environment): Add context-specific guards
- Layer 4 (Debug): Add instrumentation

**Step 4: Test each layer independently**
- Try to bypass layer 1 → verify layer 2 catches it
- Mock layer 1 → verify layer 2 still works
- Different code path → verify all layers active
- Run full test suite to verify no regressions

## 📖 Real-World Example

**Bug:** Empty `projectDir` caused `git init` in source code directory

**Data flow:**
1. Test setup → creates project with empty string
2. `Project.create(name, '')` → accepts empty string
3. `WorkspaceManager.createWorkspace('')` → uses empty string
4. `git init` runs in `process.cwd()` → pollutes source directory

**Four layers added:**

**Layer 1 (Entry):** `Project.create()` validates directory
```typescript
if (!workingDirectory || workingDirectory.trim() === '') {
  throw new Error('workingDirectory cannot be empty');
}
if (!existsSync(workingDirectory)) {
  throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
}
```

**Layer 2 (Business):** `WorkspaceManager` validates projectDir
```typescript
if (!projectDir) {
  throw new Error('projectDir required for workspace initialization');
}
```

**Layer 3 (Environment):** `WorktreeManager` refuses git init outside tmpdir in tests
```typescript
if (process.env.NODE_ENV === 'test') {
  if (!normalized.startsWith(tmpDir)) {
    throw new Error(`Refusing git init outside temp dir during tests: ${directory}`);
  }
}
```

**Layer 4 (Debug):** Stack trace logging before git init
```typescript
logger.debug('About to git init', { directory, cwd: process.cwd(), stack });
```

**Result:** All 1847 tests passed, bug impossible to reproduce

**Why all layers were necessary:**
- Different test code paths bypassed Layer 1
- Some tests mocked Project.create, bypassing Layer 2
- Edge cases on CI platform needed Layer 3
- Layer 4 helped identify structural misuse during debugging

## ✅ Verification

After adding layers, verify:

**Test each layer:**
```typescript
// Try to bypass Layer 1
const workspace = new WorkspaceManager();
workspace.createWorkspace(''); // Should throw from Layer 2

// Try to bypass Layer 1 and 2 via mock
vi.mock('Project');
workspace.createWorkspace(''); // Should throw from Layer 3
```

**Run full test suite:**
- Verify no regressions
- Check all layers triggered during testing
- Confirm debug logging appears

**Attempt to reproduce original bug:**
- Should be structurally impossible
- Multiple layers prevent it

## 🚨 Common Mistakes

**❌ "Fixed it at entry point, done"**
**✅ Add validation at ALL layers data passes through**

**❌ "Trust that earlier code validated it"**
**✅ Never assume - validate at every layer**

**❌ "Too much validation, choose one place"**
**✅ Defense-in-depth requires redundant checks**

**❌ "This will slow things down"**
**✅ Validation is cheap, debugging is expensive**

## 📊 Decision Table

| Scenario | Layers Needed | Why |
|----------|---------------|-----|
| Simple input validation | Layer 1 only | Single entry point, no complexity |
| Multi-layer system | Layers 1, 2, 4 | Different code paths need redundancy |
| Test environment risk | Layers 1, 2, 3, 4 | Need environment guards |
| Production safety | Layers 1, 2, 3, 4 | All layers for critical systems |
| After critical bug | Layers 1, 2, 3, 4 | Make recurrence impossible |

## Related Skills

**Required by this skill:**
- `root-cause-tracing` - REQUIRED for Step 1 (trace data flow backward)
- `systematic-debugging` - REQUIRED for finding the bug that needs defense-in-depth

**Pairs with:**
- `tdd` - Write tests that verify each layer independently
- `verification-before-completion` - Verify all layers active before claiming fixed

**Complementary:**
- `executing-plans` - Apply this when plan includes fixing data validation bugs
- `subagent-driven-development` - Subagents should use this for robust code

---
name: Tdd
description: |
  Test-Driven Development skill for Claude. USE WHEN writing any code - new features,
  bug fixes, refactoring, or behavior changes. Enforces test-first discipline, strict
  type safety, and quality gates. Works with TypeScript (Vitest) and Python (pytest).

  ALWAYS ACTIVE when writing code. Ensures NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.
---

# Test-Driven Development (TDD)

## When to Activate This Skill

**ALWAYS when writing code:**
- New features or functions
- Bug fixes (write test that reproduces bug first)
- Refactoring existing code
- Any behavior changes

**Exceptions (ask {{ENGINEER_NAME}} first):**
- Throwaway prototypes explicitly labeled as such
- Generated code (OpenAPI clients, etc.)
- Configuration files

**Thinking "skip TDD just this once"? Stop. That's rationalization.**

---

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? **Delete it. Start over.**

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. Period.

---

## Red-Green-Refactor Cycle

### 1. RED - Write Failing Test

Write ONE minimal test showing what should happen.

**Requirements:**
- One behavior per test
- Clear, descriptive name (not `test1` or `test_works`)
- Test real code, not mocks (unless unavoidable)
- Write assertion first, work backwards to setup

```typescript
// GOOD - TypeScript/Vitest
test('rejects empty email with validation error', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```

```python
# GOOD - Python/pytest
def test_rejects_empty_email_with_validation_error():
    result = submit_form(email='')
    assert result.error == 'Email required'
```

### 2. VERIFY RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
# TypeScript
bun test path/to/test.test.ts

# Python
pytest path/to/test_file.py -v
```

**Confirm:**
- Test FAILS (not errors)
- Failure message matches expectation
- Fails because feature is missing (not typos)

**Test passes immediately?** You're testing existing behavior. Fix the test.
**Test errors?** Fix error, re-run until it fails correctly.

### 3. GREEN - Minimal Code

Write the SIMPLEST code to pass the test. Nothing more.

```typescript
// GOOD - just enough
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' };
  }
  // ... rest of implementation
}
```

```typescript
// BAD - over-engineered YAGNI
function submitForm(
  data: FormData,
  options?: {
    validators?: Validator[];
    onError?: (field: string) => void;
    i18n?: I18nConfig;
  }
) { /* ... */ }
```

**Don't:**
- Add features not required by test
- Refactor other code
- "Improve" beyond test requirements

### 4. VERIFY GREEN - Watch It Pass

**MANDATORY.**

```bash
# Run the specific test
bun test path/to/test.test.ts
pytest path/to/test_file.py -v

# Then run ALL tests
bun run test
pytest
```

**Confirm:**
- New test passes
- ALL other tests still pass
- Output is pristine (no errors, warnings)

**Test fails?** Fix code, not test.
**Other tests fail?** Fix them now, before continuing.

### 5. REFACTOR - Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

**Keep tests green. Don't add behavior.**

### 6. REPEAT

Next failing test for next behavior.

---

## Test List Planning

Before writing any code, create a test list:

1. **Break requirements into features**
2. **Break features into test cases**
3. **Start with the happy path**
4. **Add edge cases and error conditions**
5. **Cross off as you complete each**

**Example Test List:**
```markdown
## User Registration
- [ ] Accepts valid email and password
- [ ] Rejects empty email
- [ ] Rejects invalid email format
- [ ] Rejects password under 8 characters
- [ ] Rejects password without number
- [ ] Returns user object on success
- [ ] Hashes password before storage
```

**Progress = Test list completion.** "50% of tests passing = 50% done."

---

## Quality Standards

### Test Naming
```typescript
// GOOD - describes behavior
test('returns error when stock is insufficient', () => {})
test('retries failed operations exactly 3 times', () => {})

// BAD - vague or implementation-focused
test('test buy', () => {})
test('mock returns correct value', () => {})
```

### Single Assert Per Test
Each test should verify ONE outcome:

```typescript
// GOOD - focused
test('increments retry count on failure', () => {
  const result = retry(failingOperation);
  expect(result.attempts).toBe(3);
});

test('returns success on eventual success', () => {
  const result = retry(eventuallySucceeds);
  expect(result.value).toBe('success');
});

// BAD - testing multiple things
test('retry behavior', () => {
  const result = retry(operation);
  expect(result.attempts).toBe(3);
  expect(result.value).toBe('success');
  expect(result.errors.length).toBe(2);
});
```

### Fixtures for Reusable Setup

**TypeScript/Vitest:**
```typescript
// tests/fixtures.ts
export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-id',
    email: 'test@example.com',
    ...overrides
  };
}

// In tests
const user = createTestUser({ email: 'custom@test.com' });
```

**Python/pytest:**
```python
@pytest.fixture
def test_user():
    return User(id='test-id', email='test@example.com')

def test_user_can_login(test_user):
    result = login(test_user.email, 'password')
    assert result.success
```

### Parameterization for Multiple Inputs

**TypeScript/Vitest:**
```typescript
test.each([
  ['', 'Email required'],
  ['invalid', 'Invalid email format'],
  ['a@b', 'Invalid email format'],
])('validates email "%s" with error "%s"', (email, expectedError) => {
  const result = validateEmail(email);
  expect(result.error).toBe(expectedError);
});
```

**Python/pytest:**
```python
@pytest.mark.parametrize('email,expected_error', [
    ('', 'Email required'),
    ('invalid', 'Invalid email format'),
    ('a@b', 'Invalid email format'),
])
def test_email_validation(email, expected_error):
    result = validate_email(email)
    assert result.error == expected_error
```

---

## TypeScript Strict Mode Patterns

When `tsconfig.json` has strict mode enabled, follow these patterns to avoid type errors:

### 1. Astro Image Component

When using `<Image>` with content collection data:

```astro
---
import { Image } from 'astro:assets';
import type { ImageMetadata } from 'astro';  // ALWAYS import this
---

{post.data.feature_image && (
  <Image
    src={post.data.feature_image as ImageMetadata}  // Type assertion required
    alt={post.data.title}
  />
)}
```

### 2. Array Index Access (noUncheckedIndexedAccess)

```typescript
// BAD - TypeScript error
const item = array[i];  // Type: T | undefined

// GOOD - Non-null assertion when you KNOW it exists
const item = array[i]!;

// BETTER - Optional chaining when appropriate
const value = match[1]?.trim();
```

### 3. Glob/Object Iteration

```typescript
// BAD
for (const path in glob) {
  return glob[path].default;  // Error: possibly undefined
}

// GOOD - Assert exists since we're iterating
for (const path in glob) {
  return glob[path]!.default;
}
```

### 4. Union Type Property Access

```typescript
// BAD - TypeScript can't narrow based on external conditionals
let data: { id: string } | { uid: string };
if (type === 'IMAGE') {
  console.log(data.id);  // Error: 'id' doesn't exist on { uid: string }
}

// GOOD - Cast in each branch
if (type === 'IMAGE') {
  console.log((data as { id: string }).id);
}
```

### 5. Pino Logger Signatures

```typescript
// BAD - console.error style
error('Message:', err);

// GOOD - Pino style: object first, then message
error({ err }, 'Message');
```

### 6. Vitest Path Aliases

Vitest needs its own path alias config matching tsconfig:

```typescript
// vitest.config.ts
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@config': resolve(__dirname, './src/config'),
      '@utils': resolve(__dirname, './src/utils'),
      // ... all aliases from tsconfig.paths
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'e2e/**', '**/e2e/**'],
  },
});
```

### 7. Separate Unit and E2E Tests

```
project/
├── tests/           # Unit tests (Vitest)
│   └── *.test.ts
├── e2e/             # E2E tests (Playwright) - TOP LEVEL, not in tests/
│   └── *.spec.ts
├── vitest.config.ts # exclude: ['e2e/**']
└── playwright.config.ts # testDir: './e2e'
```

---

## Python Testing Patterns

### Use pytest, Not unittest

```python
# GOOD - pytest style (simple functions)
def test_user_registration():
    result = register_user('test@example.com', 'password123')
    assert result.success

# AVOID - unittest style (class-based)
class TestUserRegistration(unittest.TestCase):
    def test_user_registration(self):
        ...
```

### Dependency Injection for Testability

```python
# BAD - hard to test, coupled to HTTP
def get_weather(city: str) -> dict:
    response = httpx.get(f'https://api.weather.com/{city}')
    return response.json()

# GOOD - injectable client
def get_weather(city: str, client: httpx.Client = None) -> dict:
    client = client or httpx.Client()
    response = client.get(f'https://api.weather.com/{city}')
    return response.json()

# In tests
def test_get_weather():
    mock_client = MagicMock()
    mock_client.get.return_value.json.return_value = {'temp': 72}

    result = get_weather('seattle', client=mock_client)

    assert result['temp'] == 72
```

### Configure Python Path

```toml
# pyproject.toml
[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
```

---

## Common Rationalizations (And Why They're Wrong)

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Unverified code is debt. |
| "Keep as reference" | You'll adapt it. That's testing after. Delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = skip it" | Test hard = design unclear. Simplify interface. |
| "TDD will slow me down" | TDD is faster than debugging. |

---

## Red Flags - STOP and Start Over

If you catch yourself:
- Writing code before test
- Test passes immediately (didn't see it fail)
- Can't explain why test failed
- Saying "just this once"
- Saying "I already manually tested it"
- Saying "tests after achieve the same purpose"
- Keeping code as "reference"

**Delete the code. Start over with TDD.**

---

## Verification Checklist

Before marking any work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output is pristine (no errors, warnings)
- [ ] `bun run check` passes (TypeScript/Biome)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

**Can't check all boxes? You skipped TDD. Start over.**

---

## Quality Gates by Project Type

### TypeScript/Astro Projects
```bash
# All must pass before commit
bun run check    # astro check + biome check
bun run test     # vitest unit tests
bun run build    # production build
```

### Python Projects
```bash
# All must pass before commit
pytest                    # unit tests
mypy src/                 # type checking
ruff check src/ tests/    # linting
```

---

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write the API you wish existed. Start with assert. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract fixtures. Still complex? Simplify design. |

---

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```

No exceptions without {{ENGINEER_NAME}}'s explicit permission.

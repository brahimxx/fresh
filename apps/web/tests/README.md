# Tests

This directory holds the test suites for the web app. Layout matches the
testing strategy in
`.kiro/specs/products-and-sales-improvements/design.md`.

```
tests/
  properties/    # fast-check property-based tests (node env)
  integration/   # API route handler tests against a real MySQL (node env)
  unit/          # Pure-helper unit tests (node env)
  components/    # React component tests (jsdom env, RTL)
  smoke/         # Cross-cutting smoke tests (migrations, ESLint rules, perf)
```

Run all tests once (CI mode):

```
npm run test:run
```

Run in watch mode locally:

```
npm test
```

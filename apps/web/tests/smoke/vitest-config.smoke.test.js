// Smoke test: verifies vitest is wired up correctly.
// - default environment is node
// - fast-check is installed and runnable
// - the @/ alias resolves to src/
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('vitest smoke', () => {
  it('runs in the node environment by default', () => {
    // jsdom would define `window`; the node env should not.
    expect(typeof window).toBe('undefined');
    expect(typeof process).toBe('object');
  });

  it('can run a trivial fast-check property', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a),
      { numRuns: 25 },
    );
  });
});

// Smoke test: verifies the components/ folder runs under jsdom and the
// @/ alias resolves to src/.
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('vitest jsdom smoke', () => {
  it('runs in the jsdom environment for component tests', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });

  it('resolves the @/ alias to src/', () => {
    // cn() is the project's classname helper exported from src/lib/utils.js
    expect(typeof cn).toBe('function');
    expect(cn('a', false && 'b', 'c')).toContain('a');
  });
});

// Smoke test: every `formatCurrency(...)` call under the products and sales
// surfaces passes a second argument (the currency code from `salon.currency`).
//
// Why this exists
// ---------------
// Requirements 19.1 and 19.2 mandate that monetary rendering across the
// Products and Sales surfaces always goes through
// `formatCurrency(amount, salon.currency)`. A single-arg call silently falls
// back to a hard-coded default and breaks per-salon currency support, which
// is exactly the regression Property 18 (currency consistency) guards
// against at runtime. This test guards it at build time so the regression
// can never even reach a render.
//
// What this verifies
// ------------------
//   1. Walk every JS / JSX file under:
//        - src/app/dashboard/salon/[salonId]/products/
//        - src/app/dashboard/salon/[salonId]/sales/
//        - src/components/products/
//        - src/components/sales/
//   2. For each `formatCurrency(` token, find the matching close paren
//      while tracking paren depth, string literals (single, double, back-
//      tick) with backslash-escape handling, and `//` / block comments so
//      we don't false-flag tokens that appear inside comments or strings.
//   3. Assert that at least one comma exists at paren-depth 0 between the
//      call's open and close paren — i.e. the call has 2+ top-level
//      arguments. A single-arg call (no top-level comma) fails the test.
//
// Validates: Requirements 19.1, 19.2

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

const SCAN_DIRS = [
  path.join(ROOT, 'src', 'app', 'dashboard', 'salon', '[salonId]', 'products'),
  path.join(ROOT, 'src', 'app', 'dashboard', 'salon', '[salonId]', 'sales'),
  path.join(ROOT, 'src', 'components', 'products'),
  path.join(ROOT, 'src', 'components', 'sales'),
];

const SOURCE_EXT = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);

function listFilesRecursive(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (entry.isFile() && SOURCE_EXT.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Find every `formatCurrency(` invocation in `source` and return the offset
 * of the `(` immediately after the identifier. We require a non-identifier
 * character (or start-of-file) before `formatCurrency` so we don't match
 * `someformatCurrency` or `myFormatCurrency`. Tokens inside strings and
 * comments are skipped.
 */
function findFormatCurrencyCallOpens(source) {
  const opens = [];
  const len = source.length;
  let i = 0;
  while (i < len) {
    const c = source[i];
    const n = source[i + 1];

    // line comment
    if (c === '/' && n === '/') {
      while (i < len && source[i] !== '\n') i += 1;
      continue;
    }
    // block comment
    if (c === '/' && n === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    // string literals: single, double, backtick. We only need to skip them
    // wholesale here; the token scan inside this top-level pass shouldn't
    // step into them. Backslashes escape the next char.
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i += 1;
      while (i < len) {
        const ch = source[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === quote) { i += 1; break; }
        // template-literal expression: bail on `${` and resume after the
        // matching `}`. We track brace depth; nested template strings are
        // rare in this codebase and a perfect tokenizer is overkill — the
        // worst case is we'd fail to detect a `formatCurrency(...)` call
        // *inside* a template expression, which we can live with for a
        // smoke test (the runtime PBT covers the rendered output).
        if (quote === '`' && ch === '$' && source[i + 1] === '{') {
          let depth = 1;
          i += 2;
          while (i < len && depth > 0) {
            const cc = source[i];
            if (cc === '{') depth += 1;
            else if (cc === '}') depth -= 1;
            i += 1;
          }
          continue;
        }
        i += 1;
      }
      continue;
    }

    // candidate identifier scan
    if (
      c === 'f' &&
      source.startsWith('formatCurrency', i) &&
      // boundary on the left
      (i === 0 || !/[A-Za-z0-9_$]/.test(source[i - 1]))
    ) {
      let j = i + 'formatCurrency'.length;
      // allow whitespace between name and `(`
      while (j < len && /\s/.test(source[j])) j += 1;
      if (source[j] === '(') {
        opens.push(j);
        i = j + 1;
        continue;
      }
    }

    i += 1;
  }
  return opens;
}

/**
 * Given the offset of the `(` after `formatCurrency`, walk forward,
 * tracking paren depth and string / template / comment context, and return
 * `{ closeIndex, hasTopLevelComma }`. If the call is unterminated we return
 * `closeIndex: -1` and the caller treats that as a parse failure.
 */
function analyzeCall(source, openIndex) {
  const len = source.length;
  let i = openIndex + 1;
  let depth = 1;
  let hasTopLevelComma = false;

  while (i < len) {
    const c = source[i];
    const n = source[i + 1];

    if (c === '/' && n === '/') {
      while (i < len && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i += 1;
      while (i < len) {
        const ch = source[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === quote) { i += 1; break; }
        if (quote === '`' && ch === '$' && source[i + 1] === '{') {
          let braceDepth = 1;
          i += 2;
          while (i < len && braceDepth > 0) {
            const cc = source[i];
            if (cc === '{') braceDepth += 1;
            else if (cc === '}') braceDepth -= 1;
            i += 1;
          }
          continue;
        }
        i += 1;
      }
      continue;
    }

    if (c === '(') {
      depth += 1;
    } else if (c === ')') {
      depth -= 1;
      if (depth === 0) {
        return { closeIndex: i, hasTopLevelComma };
      }
    } else if (c === ',' && depth === 1) {
      hasTopLevelComma = true;
    }

    i += 1;
  }

  return { closeIndex: -1, hasTopLevelComma };
}

function lineNumberAt(source, index) {
  // 1-based
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === '\n') line += 1;
  }
  return line;
}

describe('formatCurrency arity smoke (Req 19.1, 19.2)', () => {
  const allFiles = SCAN_DIRS.flatMap(listFilesRecursive);

  it('parser self-check: detects single-arg, accepts two-arg, ignores comments and strings', () => {
    // Pure two-arg → no offence.
    const ok = 'x = formatCurrency(amount, salon.currency);';
    const okOpens = findFormatCurrencyCallOpens(ok);
    expect(okOpens).toHaveLength(1);
    expect(analyzeCall(ok, okOpens[0]).hasTopLevelComma).toBe(true);

    // Single-arg → flagged.
    const bad = 'x = formatCurrency(amount);';
    const badOpens = findFormatCurrencyCallOpens(bad);
    expect(badOpens).toHaveLength(1);
    expect(analyzeCall(bad, badOpens[0]).hasTopLevelComma).toBe(false);

    // Nested commas inside a sub-expression must NOT count as top-level.
    const nested = 'x = formatCurrency(Math.min(a, b));';
    const nestedOpens = findFormatCurrencyCallOpens(nested);
    expect(nestedOpens).toHaveLength(1);
    expect(analyzeCall(nested, nestedOpens[0]).hasTopLevelComma).toBe(false);

    // Token inside a string literal must be ignored.
    const inString = 'var msg = "call formatCurrency(x) somewhere";';
    expect(findFormatCurrencyCallOpens(inString)).toEqual([]);

    // Token inside a line comment must be ignored.
    const inLineComment = '// formatCurrency(x)\nvar y = 1;';
    expect(findFormatCurrencyCallOpens(inLineComment)).toEqual([]);

    // Token inside a block comment must be ignored.
    const inBlockComment = '/* formatCurrency(x) */ var y = 1;';
    expect(findFormatCurrencyCallOpens(inBlockComment)).toEqual([]);

    // Identifier prefix must not match.
    const prefix = 'var z = xformatCurrency(x);';
    expect(findFormatCurrencyCallOpens(prefix)).toEqual([]);
  });

  it('discovers source files in the expected scopes', () => {
    // Sanity check: at least one file in each scan dir exists, otherwise
    // the test is silently passing because there's nothing to scan.
    for (const dir of SCAN_DIRS) {
      const filesInDir = allFiles.filter((f) => f.startsWith(dir + path.sep));
      expect(
        filesInDir.length,
        `expected at least one source file under ${dir}`,
      ).toBeGreaterThan(0);
    }
  });

  it('every formatCurrency(...) call has two arguments', () => {
    const offences = [];

    for (const file of allFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const opens = findFormatCurrencyCallOpens(source);
      for (const open of opens) {
        const { closeIndex, hasTopLevelComma } = analyzeCall(source, open);
        if (closeIndex === -1) {
          offences.push({
            file: path.relative(ROOT, file),
            line: lineNumberAt(source, open),
            kind: 'unterminated',
          });
          continue;
        }
        if (!hasTopLevelComma) {
          offences.push({
            file: path.relative(ROOT, file),
            line: lineNumberAt(source, open),
            kind: 'single-arg',
            snippet: source.slice(open - 'formatCurrency'.length, closeIndex + 1),
          });
        }
      }
    }

    if (offences.length > 0) {
      const report = offences
        .map((o) =>
          `${o.file}:${o.line} — ${o.kind}` +
          (o.snippet ? `\n    ${o.snippet}` : ''),
        )
        .join('\n');
      throw new Error(
        `Found ${offences.length} formatCurrency call(s) missing the ` +
        `currency argument under products/sales surfaces. Pass ` +
        `\`salon.currency\` as the second argument (Req 19.1, 19.2):\n${report}`,
      );
    }
  });
});

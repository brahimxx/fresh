// Smoke perf test: GET /api/products/stats SQL under a 10,000-product catalog.
//
// What this verifies:
//   1. Apply `database/fresh.sql` (loads the canonical schema and seeds
//      salon 163 / user 179) to a transient MySQL database.
//   2. Apply `database/migrations/20260601_products_sales_overhaul.sql` so
//      the test runs against the post-migration shape (products.brand,
//      product_categories.deleted_at, payments enum extension, and the
//      product_stock_movements table). The aggregate SQL itself only
//      depends on the unchanged (id, salon_id, deleted_at, is_active,
//      stock_quantity, low_stock_threshold, price) columns, but applying
//      the migration keeps the smoke environment honest.
//   3. Insert 10,000 active, non-deleted products under salon 163 with a
//      mix of in-stock / low-stock / out-of-stock rows and varying
//      `price` so all four conditional aggregates have non-trivial work.
//   4. Run the stats SQL exactly as `src/app/api/products/stats/route.js`
//      composes it, and assert it completes within 2,000 ms (Req 9.1).
//
// Validates: Requirement 9.1.
//
// CI: set MYSQL_TEST_URL to a reachable MySQL server (no database segment
// required). Locally the test falls back to MYSQL_URL from .env.local. If
// neither is set or the server is unreachable, the test is skipped — the
// 2,000 ms budget can only be smoke-tested against a real engine.
//
// Note on scope: this test runs the SQL directly against MySQL rather
// than invoking the route handler. The route adds Next.js runtime and
// auth/permissions overhead that is unrelated to the DB query budget the
// requirement constrains; the SQL query is the single thing whose latency
// scales with catalog size.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { config as loadDotenv } from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';

loadDotenv({ path: '.env.local' });

const TEST_URL = process.env.MYSQL_TEST_URL || process.env.MYSQL_URL;
const FRESH_SQL_PATH = path.resolve('database/fresh.sql');
const MIGRATION_SQL_PATH = path.resolve(
  'database/migrations/20260601_products_sales_overhaul.sql',
);

// Catalog size and the latency budget come straight from Req 9.1.
const CATALOG_SIZE = 10_000;
const BUDGET_MS = 2_000;

// Salon 163 / owner 179 are present in `fresh.sql` so we don't need to
// fabricate ancillary rows. The aggregate SQL filters on `salon_id`.
const SEEDED_SALON_ID = 163;

// Module-level state populated by beforeAll. Tests gate on `canRun`.
let canRun = false;
let skipReason = '';
let serverConn = null;
let dbConn = null;
let testDbName = null;

/**
 * Parse a `mysql://user:pass@host:port/db` URL into a mysql2 config.
 * The database segment is intentionally ignored — we create our own
 * transient database.
 */
function parseMysqlUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

beforeAll(async () => {
  if (!TEST_URL) {
    skipReason = 'no MYSQL_TEST_URL or MYSQL_URL env var available';
    return;
  }

  let cfg;
  try {
    cfg = parseMysqlUrl(TEST_URL);
  } catch (err) {
    skipReason = `could not parse MYSQL connection URL: ${err.message}`;
    return;
  }

  testDbName = `fresh_stats_perf_${Date.now()}_${Math.floor(
    Math.random() * 1e6,
  )}`;

  try {
    serverConn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      multipleStatements: true,
      connectTimeout: 3000,
    });
  } catch (err) {
    skipReason = `MySQL not reachable at ${cfg.host}:${cfg.port}: ${err.code || err.message}`;
    serverConn = null;
    return;
  }

  try {
    await serverConn.query(
      `CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );

    dbConn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: testDbName,
      multipleStatements: true,
      connectTimeout: 3000,
    });

    const freshSql = await fs.readFile(FRESH_SQL_PATH, 'utf8');
    await dbConn.query(freshSql);

    const migrationSql = await fs.readFile(MIGRATION_SQL_PATH, 'utf8');
    await dbConn.query(migrationSql);

    // Sanity-check the seeded salon row is present so the perf test
    // operates against a valid FK target.
    const [salonRows] = await dbConn.query(
      'SELECT id FROM salons WHERE id = ?',
      [SEEDED_SALON_ID],
    );
    if (!Array.isArray(salonRows) || salonRows.length === 0) {
      skipReason = `seeded salon ${SEEDED_SALON_ID} missing from fresh.sql`;
      canRun = false;
      return;
    }

    canRun = true;
  } catch (err) {
    skipReason = `failed to set up transient schema: ${err.message}`;
    canRun = false;
  }
}, 120_000);

afterAll(async () => {
  try {
    if (dbConn) await dbConn.end();
  } catch {
    /* ignore close errors */
  }
  try {
    if (serverConn && testDbName) {
      await serverConn.query(`DROP DATABASE IF EXISTS \`${testDbName}\``);
    }
    if (serverConn) await serverConn.end();
  } catch {
    /* ignore close errors */
  }
});

/**
 * Build a deterministic mix of (price, stock, low_stock_threshold)
 * triples so the conditional aggregates each touch a non-trivial slice
 * of the catalog. Roughly:
 *   - ~70% in-stock     (stock > threshold)
 *   - ~20% low-stock    (0 < stock <= threshold)
 *   - ~10% out-of-stock (stock = 0)
 */
function buildRow(i) {
  const bucket = i % 10;
  let stock;
  let threshold;
  if (bucket < 1) {
    stock = 0; // out of stock
    threshold = 5;
  } else if (bucket < 3) {
    threshold = 10;
    stock = (i % threshold) + 1; // 1..10, low stock
  } else {
    threshold = 5;
    stock = 50 + (i % 100); // comfortably in stock
  }
  // Prices in [1.00, 100.99] so SUM(price * stock_quantity) is non-trivial.
  const priceCents = 100 + ((i * 37) % 10_000);
  const price = (priceCents / 100).toFixed(2);
  return [SEEDED_SALON_ID, `Smoke Product ${i}`, price, stock, threshold, 1];
}

async function seedProducts(conn, total) {
  // Batch inserts so 10k rows finish in seconds rather than minutes.
  const BATCH = 1_000;
  for (let start = 0; start < total; start += BATCH) {
    const end = Math.min(start + BATCH, total);
    const values = [];
    const params = [];
    for (let i = start; i < end; i++) {
      values.push('(?, ?, ?, ?, ?, ?)');
      params.push(...buildRow(i));
    }
    await conn.query(
      `INSERT INTO products
        (salon_id, name, price, stock_quantity, low_stock_threshold, is_active)
       VALUES ${values.join(',')}`,
      params,
    );
  }
}

describe('GET /api/products/stats — performance smoke', () => {
  it(
    `aggregates ${CATALOG_SIZE.toLocaleString()} products within ${BUDGET_MS} ms`,
    async (ctx) => {
      if (!canRun) {
        ctx.skip(`Skipped: ${skipReason}`);
        return;
      }

      // Seed the catalog.
      await seedProducts(dbConn, CATALOG_SIZE);

      // Confirm the seed actually landed before timing the aggregate.
      const [countRows] = await dbConn.query(
        'SELECT COUNT(*) AS n FROM products WHERE salon_id = ?',
        [SEEDED_SALON_ID],
      );
      expect(Number(countRows[0].n)).toBe(CATALOG_SIZE);

      // Exact SQL composed by `src/app/api/products/stats/route.js` for
      // a non-admin caller (single-salon path). Keeping it inline here
      // rather than importing the route avoids dragging in Next.js, the
      // shared `db.js` connection pool, and the auth/permission layer
      // — none of which the 2,000 ms requirement is about.
      const sql = `
        SELECT
          COUNT(*) AS totalProducts,
          SUM(CASE WHEN stock_quantity > 0
                    AND stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS lowStockCount,
          SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) AS outOfStockCount,
          COALESCE(SUM(price * stock_quantity), 0) AS totalInventoryValue
        FROM products
        WHERE deleted_at IS NULL AND is_active = 1 AND salon_id = ?
      `;

      // Warm the connection / parser cache with a trivial SELECT 1 so the
      // first measured run isn't paying for one-time TCP / parser cost.
      await dbConn.query('SELECT 1');

      // Measure a single representative run — that's what the route
      // handler does per request, and that's the budget the requirement
      // pins down.
      const startNs = process.hrtime.bigint();
      const [rows] = await dbConn.query(sql, [SEEDED_SALON_ID]);
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;

      // Functional sanity — the aggregate must reflect the seeded mix.
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(Number(row.totalProducts)).toBe(CATALOG_SIZE);
      expect(Number(row.outOfStockCount)).toBeGreaterThan(0);
      expect(Number(row.lowStockCount)).toBeGreaterThan(0);
      expect(Number(row.totalInventoryValue)).toBeGreaterThan(0);

      // The Req 9.1 budget. Surface the measured timing in the failure
      // message so a regression points the operator at the right number.
      expect(
        elapsedMs,
        `stats SQL took ${elapsedMs.toFixed(1)} ms for ${CATALOG_SIZE} products (budget ${BUDGET_MS} ms)`,
      ).toBeLessThan(BUDGET_MS);
    },
    180_000,
  );
});

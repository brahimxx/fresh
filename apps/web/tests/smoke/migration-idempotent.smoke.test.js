// Smoke test: 20260601_products_sales_overhaul is idempotent.
//
// What this verifies:
//   1. Apply database/fresh.sql to a transient empty database.
//   2. Run database/migrations/20260601_products_sales_overhaul.sql.
//   3. Run the same migration a second time without error.
//   4. Assert the resulting schema state (column / enum / table presence)
//      via information_schema.
//   5. Confirm the schema state after the second run is identical to the
//      schema state after the first run (idempotence).
//
// Validates: Requirements 5.1, 6.4, 12.1, 22.3, 22.4, 22.5
//
// CI: set MYSQL_TEST_URL to a reachable MySQL server (no database segment
// required). Locally the test falls back to MYSQL_URL from .env.local. If
// neither is set or the server is unreachable, the test is skipped — the
// migration's correctness against a real engine cannot be smoke-tested
// without one.

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

  testDbName = `fresh_mig_smoke_${Date.now()}_${Math.floor(
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
    // Apply the full schema dump in one multi-statement query so
    // session-local SET / variable assignments inside the dump remain
    // coherent.
    await dbConn.query(freshSql);

    canRun = true;
  } catch (err) {
    skipReason = `failed to set up transient schema: ${err.message}`;
    canRun = false;
  }
}, 90_000);

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
 * Read every schema fact this test cares about from information_schema,
 * scoped to the transient database. Returned as plain JS objects so
 * deep-equality can confirm idempotence between the two migration runs.
 */
async function readSchemaState(conn, dbName) {
  const [brandCols] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'products'
        AND COLUMN_NAME = 'brand'`,
    [dbName],
  );

  const [brandIdx] = await conn.query(
    `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'products'
        AND INDEX_NAME = 'idx_products_brand'
      ORDER BY SEQ_IN_INDEX`,
    [dbName],
  );

  const [pcDeletedAt] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'product_categories'
        AND COLUMN_NAME = 'deleted_at'`,
    [dbName],
  );

  const [paymentsStatus] = await conn.query(
    `SELECT COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'payments'
        AND COLUMN_NAME = 'status'`,
    [dbName],
  );

  const [psmTable] = await conn.query(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'product_stock_movements'`,
    [dbName],
  );

  const [psmCols] = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'product_stock_movements'
      ORDER BY ORDINAL_POSITION`,
    [dbName],
  );

  const [psmIdx] = await conn.query(
    `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'product_stock_movements'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [dbName],
  );

  return {
    brandCols,
    brandIdx,
    pcDeletedAt,
    paymentsStatus,
    psmTable,
    psmCols,
    psmIdx,
  };
}

describe('migration 20260601_products_sales_overhaul', () => {
  it('applies cleanly twice and leaves an identical, expected schema state', async (ctx) => {
    if (!canRun) {
      ctx.skip(`Skipped: ${skipReason}`);
      return;
    }

    const migrationSql = await fs.readFile(MIGRATION_SQL_PATH, 'utf8');

    // ---- First application: must succeed against the freshly-loaded dump.
    await dbConn.query(migrationSql);
    const stateAfterFirst = await readSchemaState(dbConn, testDbName);

    // ---- Second application: must succeed without any error and produce
    //      the same schema state (idempotence — Req 22.3, 22.4, 22.5).
    await dbConn.query(migrationSql);
    const stateAfterSecond = await readSchemaState(dbConn, testDbName);

    // ---- products.brand: VARCHAR(120) NULL  (Req 5.1)
    expect(stateAfterFirst.brandCols).toHaveLength(1);
    expect(
      stateAfterFirst.brandCols[0].COLUMN_TYPE.toLowerCase(),
    ).toBe('varchar(120)');
    expect(stateAfterFirst.brandCols[0].IS_NULLABLE).toBe('YES');

    // ---- idx_products_brand index over products.brand
    expect(stateAfterFirst.brandIdx.length).toBeGreaterThanOrEqual(1);
    expect(stateAfterFirst.brandIdx[0].COLUMN_NAME).toBe('brand');

    // ---- product_categories.deleted_at: DATETIME NULL  (Req 6.4)
    expect(stateAfterFirst.pcDeletedAt).toHaveLength(1);
    expect(
      stateAfterFirst.pcDeletedAt[0].COLUMN_TYPE.toLowerCase(),
    ).toBe('datetime');
    expect(stateAfterFirst.pcDeletedAt[0].IS_NULLABLE).toBe('YES');

    // ---- payments.status enum includes all four canonical values
    //      with default preserved as 'pending'  (Req 12.1)
    expect(stateAfterFirst.paymentsStatus).toHaveLength(1);
    const statusType = stateAfterFirst.paymentsStatus[0].COLUMN_TYPE;
    for (const value of [
      'pending',
      'paid',
      'refunded',
      'partially_refunded',
    ]) {
      expect(statusType).toContain(`'${value}'`);
    }
    expect(stateAfterFirst.paymentsStatus[0].COLUMN_DEFAULT).toBe('pending');
    expect(stateAfterFirst.paymentsStatus[0].IS_NULLABLE).toBe('NO');

    // ---- product_stock_movements table exists with expected columns
    //      and enum vocabularies  (Req 22.3 / design Stock_Movement model)
    expect(stateAfterFirst.psmTable).toHaveLength(1);

    const colsByName = Object.fromEntries(
      stateAfterFirst.psmCols.map((c) => [c.COLUMN_NAME, c]),
    );
    for (const expected of [
      'id',
      'product_id',
      'salon_id',
      'change_type',
      'quantity_before',
      'quantity_after',
      'delta',
      'reason_code',
      'reason_note',
      'performed_by',
      'booking_id',
      'created_at',
    ]) {
      expect(colsByName).toHaveProperty(expected);
    }

    const changeTypeT = colsByName.change_type.COLUMN_TYPE;
    for (const v of ['set', 'add', 'subtract']) {
      expect(changeTypeT).toContain(`'${v}'`);
    }

    const reasonCodeT = colsByName.reason_code.COLUMN_TYPE;
    for (const v of [
      'manual_set',
      'manual_adjustment',
      'restock',
      'waste',
      'correction',
      'sale',
      'refund',
    ]) {
      expect(reasonCodeT).toContain(`'${v}'`);
    }

    expect(colsByName.reason_note.IS_NULLABLE).toBe('YES');
    expect(colsByName.performed_by.IS_NULLABLE).toBe('YES');
    expect(colsByName.booking_id.IS_NULLABLE).toBe('YES');

    // Indexes exist for the expected access paths
    const psmIndexNames = new Set(
      stateAfterFirst.psmIdx.map((r) => r.INDEX_NAME),
    );
    for (const idx of [
      'PRIMARY',
      'idx_psm_product_created',
      'idx_psm_salon_created',
      'idx_psm_booking',
    ]) {
      expect(psmIndexNames.has(idx)).toBe(true);
    }

    // ---- Idempotence: state after the second run must equal the first.
    expect(stateAfterSecond).toEqual(stateAfterFirst);
  }, 120_000);
});

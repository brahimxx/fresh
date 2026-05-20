/**
 * Helper script to generate test environment values for manual testing.
 * 
 * Usage:
 *   node tests/manual/setup-test-env.mjs
 * 
 * This will:
 *   1. Generate a JWT token for a test user
 *   2. Encode a salon ID for use in API URLs
 *   3. Query the DB for services with price overrides
 *   4. Output all values ready to paste into the test script
 */

import { SignJWT } from 'jose';
import mysql from 'mysql2/promise';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'UJWeTy7Oqbe6vrHPAooIeS2F6MJCGTVD3w6OsGJBQwQ');

// ID encoding (mirrors src/lib/id.js)
const ALPHABET = "vXY2bcTdefghijKlmnopqrstuAwxyzBCFGHIJDLMNOPQRSU6VWZ01345789akE";
const BASE = ALPHABET.length;
const OFFSET = 100000;

function encodeId(num) {
  let n = Number(num) + OFFSET;
  let str = "";
  while (n > 0) {
    str = ALPHABET.charAt(n % BASE) + str;
    n = Math.floor(n / BASE);
  }
  return str;
}

async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

async function main() {
  const conn = await mysql.createConnection(
    process.env.MYSQL_URL || 'mysql://root:@localhost:3306/fresh'
  );

  try {
    // Find a salon owner user
    const [users] = await conn.execute(
      "SELECT u.id, u.email, u.first_name, u.role FROM users u WHERE u.role IN ('owner','admin') LIMIT 1"
    );
    
    if (users.length === 0) {
      console.error('No owner/admin user found in database');
      process.exit(1);
    }

    const user = users[0];
    const token = await createToken({ userId: user.id, email: user.email, role: user.role });

    // Find a salon owned by this user
    const [salons] = await conn.execute(
      "SELECT id, name, travel_radius, travel_buffer_time, is_mobile, is_virtual, virtual_meeting_link, latitude, longitude FROM salons WHERE owner_id = ? LIMIT 1",
      [user.id]
    );

    if (salons.length === 0) {
      console.error('No salon found for this user');
      process.exit(1);
    }

    const salon = salons[0];
    const encodedSalonId = encodeId(salon.id);

    // Find services with mobile/virtual overrides
    const [mobileServices] = await conn.execute(
      "SELECT id, name, price, mobile_price_override, can_mobile FROM services WHERE salon_id = ? AND can_mobile = 1 AND is_active = 1 LIMIT 3",
      [salon.id]
    );

    const [virtualServices] = await conn.execute(
      "SELECT id, name, price, virtual_price_override, can_virtual FROM services WHERE salon_id = ? AND can_virtual = 1 AND is_active = 1 LIMIT 3",
      [salon.id]
    );

    // Find staff with mobile capability
    const [mobileStaff] = await conn.execute(
      "SELECT s.id, u.first_name, u.last_name, s.can_mobile, s.can_virtual, s.home_lat, s.home_lng FROM staff s JOIN users u ON u.id = s.user_id WHERE s.salon_id = ? AND s.is_active = 1 AND s.can_mobile = 1 LIMIT 3",
      [salon.id]
    );

    // Check covered ZIP codes
    const [zipCodes] = await conn.execute(
      "SELECT zip_code FROM salon_covered_zip_codes WHERE salon_id = ? LIMIT 10",
      [salon.id]
    );

    // Check if offering_type column still exists
    const [columns] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'fresh' AND TABLE_NAME = 'services' AND COLUMN_NAME = 'offering_type'"
    );

    console.log('\n' + '='.repeat(70));
    console.log('  HYBRID FULFILLMENT TEST ENVIRONMENT');
    console.log('='.repeat(70));
    
    console.log('\n── Auth ──────────────────────────────────────────────────────────');
    console.log(`User: ${user.first_name} (${user.email}) [${user.role}]`);
    console.log(`TOKEN="${token}"`);
    
    console.log('\n── Salon ─────────────────────────────────────────────────────────');
    console.log(`Salon: ${salon.name} (DB ID: ${salon.id})`);
    console.log(`SALON_ID_ENCODED="${encodedSalonId}"`);
    console.log(`  travel_radius: ${salon.travel_radius || 'NOT SET'}`);
    console.log(`  travel_buffer_time: ${salon.travel_buffer_time || 0} min`);
    console.log(`  is_mobile: ${salon.is_mobile}`);
    console.log(`  is_virtual: ${salon.is_virtual}`);
    console.log(`  virtual_meeting_link: ${salon.virtual_meeting_link || 'NOT SET'}`);
    console.log(`  coordinates: ${salon.latitude}, ${salon.longitude}`);

    console.log('\n── Mobile Services ───────────────────────────────────────────────');
    if (mobileServices.length === 0) {
      console.log('  ⚠️  No mobile services found! Create one first.');
      console.log('  UPDATE services SET can_mobile = 1, mobile_price_override = 5000 WHERE salon_id = ' + salon.id + ' LIMIT 1;');
    } else {
      for (const s of mobileServices) {
        console.log(`  ID: ${s.id} | ${s.name} | base: ${s.price} | mobile_override: ${s.mobile_price_override || 'NULL'}`);
      }
      console.log(`MOBILE_SERVICE_ID="${mobileServices[0].id}"`);
    }

    console.log('\n── Virtual Services ──────────────────────────────────────────────');
    if (virtualServices.length === 0) {
      console.log('  ⚠️  No virtual services found! Create one first.');
      console.log('  UPDATE services SET can_virtual = 1, virtual_price_override = 3000 WHERE salon_id = ' + salon.id + ' LIMIT 1;');
    } else {
      for (const s of virtualServices) {
        console.log(`  ID: ${s.id} | ${s.name} | base: ${s.price} | virtual_override: ${s.virtual_price_override || 'NULL'}`);
      }
      console.log(`VIRTUAL_SERVICE_ID="${virtualServices[0].id}"`);
    }

    console.log('\n── Mobile Staff ──────────────────────────────────────────────────');
    if (mobileStaff.length === 0) {
      console.log('  ⚠️  No mobile-capable staff found!');
      console.log('  UPDATE staff SET can_mobile = 1, home_lat = 36.7538, home_lng = 3.0588 WHERE salon_id = ' + salon.id + ' LIMIT 1;');
    } else {
      for (const s of mobileStaff) {
        console.log(`  ID: ${s.id} | ${s.first_name} ${s.last_name} | home: (${s.home_lat}, ${s.home_lng}) | mobile: ${s.can_mobile} | virtual: ${s.can_virtual}`);
      }
      console.log(`STAFF_ID="${mobileStaff[0].id}"`);
    }

    console.log('\n── Covered ZIP Codes ─────────────────────────────────────────────');
    if (zipCodes.length === 0) {
      console.log('  ⚠️  No covered ZIP codes configured for this salon.');
      console.log('  INSERT INTO salon_covered_zip_codes (salon_id, zip_code) VALUES (' + salon.id + ', "16000");');
    } else {
      console.log(`  ${zipCodes.map(z => z.zip_code).join(', ')}`);
    }

    console.log('\n── Schema Status ─────────────────────────────────────────────────');
    console.log(`  offering_type column: ${columns.length > 0 ? '⚠️  STILL EXISTS (migration not run)' : '✅ DROPPED'}`);

    console.log('\n── Copy-Paste Config ─────────────────────────────────────────────');
    console.log(`TOKEN="${token}"`);
    console.log(`SALON_ID_ENCODED="${encodedSalonId}"`);
    if (mobileServices.length > 0) console.log(`MOBILE_SERVICE_ID="${mobileServices[0].id}"`);
    if (virtualServices.length > 0) console.log(`VIRTUAL_SERVICE_ID="${virtualServices[0].id}"`);
    if (mobileStaff.length > 0) console.log(`STAFF_ID="${mobileStaff[0].id}"`);
    
    console.log('\n' + '='.repeat(70));

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

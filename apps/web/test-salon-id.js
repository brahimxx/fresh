const { decodeId, encodeId } = require('./src/lib/id.js');
const db = require('./src/lib/db.js');

async function test() {
  const idStr = encodeId(163);
  const id = decodeId(idStr);
  console.log("Encoded:", idStr, "Decoded:", id);
  
  const userId = 1251; // kolm@fresh.com
  const role = "staff";
  
  // Let's run the exact SQL in api/salons/[id]/route.js
  const salon = await db.getOne(
    `SELECT s.*, 
            COALESCE(AVG(r.rating), 0) as avg_rating,
            COUNT(DISTINCT r.id) as review_count
     FROM salons s
     LEFT JOIN reviews r ON r.salon_id = s.id
     WHERE s.id = ? AND s.deleted_at IS NULL
     GROUP BY s.id`,
    [id],
  );
  
  console.log("Salon:", salon ? salon.name : "Not found");
  
  process.exit(0);
}

test();

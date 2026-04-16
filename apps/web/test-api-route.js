const { query, getOne } = require("./src/lib/db");
const db = require("./src/lib/db");
async function test() {
  const userId = 1251;
  const limit = 10, offset = 0;
  try {
    const userSql = `
      SELECT s.* 
      FROM salons s
      LEFT JOIN staff st ON st.salon_id = s.id AND st.user_id = ?
      WHERE (s.owner_id = ? OR st.user_id = ?) 
      AND s.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.created_at DESC 
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    const userSalons = await query(userSql, [Number(userId), Number(userId), Number(userId)]);
    for (const salon of userSalons) {
      const [stats] = await query("SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(id) as review_count FROM reviews WHERE salon_id = ?", [salon.id]);
      salon.avg_rating = stats?.avg_rating || 0;
      const coverPhoto = await getOne("SELECT image_url FROM salon_photos WHERE salon_id = ? AND is_cover = 1 LIMIT 1", [salon.id]);
      salon.cover_photo = coverPhoto?.image_url || null;
      console.log(salon.name, "Cover:", salon.cover_photo);
    }
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
test();

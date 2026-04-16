import fs from 'fs';

let content = fs.readFileSync('src/app/api/marketplace/salons/route.js', 'utf8');

const oldQuery = `        s.phone, s.website, s.price_level, MAX(sc_primary.category_name) AS category,
        s.latitude, s.longitude,
        AVG(r.rating)        AS rating,
        COUNT(DISTINCT r.id) AS review_count,
        svc.services_preview
      FROM salons s`;

const newQuery = `        s.phone, s.website, s.price_level, MAX(sc_primary.category_name) AS category,
        s.latitude, s.longitude,
        AVG(r.rating)        AS rating,
        COUNT(DISTINCT r.id) AS review_count,
        svc.services_preview,
        (SELECT image_url FROM salon_photos sp WHERE sp.salon_id = s.id ORDER BY is_cover DESC, id ASC LIMIT 1) AS gallery_cover
      FROM salons s`;

const oldResponse = `      logo_url:         salon.logo_url,
      cover_image_url:  salon.cover_image_url,
      address:          salon.address,`;

const newResponse = `      logo_url:         salon.logo_url,
      cover_image_url:  salon.gallery_cover || salon.cover_image_url,
      address:          salon.address,`;

let updated = content.replace(oldQuery, newQuery);
updated = updated.replace(oldResponse, newResponse);

fs.writeFileSync('src/app/api/marketplace/salons/route.js', updated);
console.log("Updated api");

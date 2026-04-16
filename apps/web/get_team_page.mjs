import fs from 'fs';
console.log(fs.readFileSync('src/app/dashboard/salon/[salonId]/team/page.js', 'utf8').substring(0, 1000));

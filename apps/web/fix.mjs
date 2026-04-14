import fs from 'fs';
let lines = fs.readFileSync('src/app/dashboard/page.js', 'utf8').split('\n');
lines.splice(84, 0, '          </div>\n      );\n    }');
fs.writeFileSync('src/app/dashboard/page.js', lines.join('\n'));

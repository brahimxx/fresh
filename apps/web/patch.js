const fs = require('fs');
const content = fs.readFileSync('src/app/onboarding/page.js', 'utf8');
const newContent = content.replace(
  /) : null}\n\n          <div className="flex items-center gap-3">/,
  ') : null}\n          </div>\n\n          <div className="flex items-center gap-3">'
);
fs.writeFileSync('src/app/onboarding/page.js', newContent);

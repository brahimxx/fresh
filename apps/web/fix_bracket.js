const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

code = code.replace(
  '              </div>\n            </div>\n       \n          {/* Step 2:',
  '              </div>\n            </div>\n          )}\n\n          {/* Step 2:'
);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log('Fixed bracket.');

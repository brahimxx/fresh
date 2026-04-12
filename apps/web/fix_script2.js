const fs = require('fs');
let content = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

content = content.replace('{ icon: User,\n                    Users, title:', '{ icon: Users, title:');

fs.writeFileSync('src/app/onboarding/page.js', content, 'utf8');
console.log("Patched Users icon.");

const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

code = code.replace(/    Users\n    Users,/, '    User,\n    Users,');

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log('Fixed imports!');

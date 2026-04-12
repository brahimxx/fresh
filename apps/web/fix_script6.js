const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

code = code.replace(
  '  Scissors,\n  Users\n  Users,',
  '  Scissors,\n  User,\n  Users,'
);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log('Fixed again');

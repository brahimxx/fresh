const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

code = code.replace(
  /\{\s*icon:\s*Users[^]*?Users,\s*title:/,
  '{ icon: Users, title:'
);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log('Fixed via regex');

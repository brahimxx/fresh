import fs from 'fs';
const path = 'src/app/invite/page.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  '          <AcceptInviteForm\n            token={token}\n            inviteEmail={invite.email}\n            isLoggedIn={isLoggedIn}\n          />',
  '          <AcceptInviteForm\n            token={token}\n            inviteEmail={invite.email}\n            isLoggedIn={isLoggedIn}\n            accountExists={accountExists}\n          />'
);
fs.writeFileSync(path, content);

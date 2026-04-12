const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const badBlock = `                  {[
                    { icon: Store, title: "Salon Created", desc: "Ready to go" },
                    { icon: Scissors, title: \`\${services.length} Services\`, desc: "Added" },
                    { icon: Users
    Users, title: \`\${staffMembers.length} Invitations\`, desc: "To send" },
                  ].map((item) => {`;

const fixedBlock = `                  {[
                    { icon: Store, title: "Salon Created", desc: "Ready to go" },
                    { icon: Scissors, title: \`\${services.length} Services\`, desc: "Added" },
                    { icon: Users, title: \`\${staffMembers.length} Invitations\`, desc: "To send" },
                  ].map((item) => {`;

if (code.includes(badBlock)) {
  code = code.replace(badBlock, fixedBlock);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log('Fixed block array');
} else {
  console.log('Could not find bad block to replace!');
}

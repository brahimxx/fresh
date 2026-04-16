import fs from 'fs';

// Fix accepted rotue backticks
let acceptRoute = fs.readFileSync('src/app/api/salons/[id]/staff-requests/[requestId]/accept/route.js', 'utf8');
acceptRoute = acceptRoute.replace(/\\\`/g, '`');
fs.writeFileSync('src/app/api/salons/[id]/staff-requests/[requestId]/accept/route.js', acceptRoute);

// Fix GET route backticks
let getRoute = fs.readFileSync('src/app/api/salons/[id]/staff-requests/route.js', 'utf8');
getRoute = getRoute.replace(/\\\`/g, '`');
fs.writeFileSync('src/app/api/salons/[id]/staff-requests/route.js', getRoute);

// Fix page.js duplicates
let teamPage = fs.readFileSync('src/app/dashboard/salon/[salonId]/team/page.js', 'utf8');
// Ensure it's not duplicate
teamPage = teamPage.replace(/Check,\s+X,\s+MessageSquare,\s+/g, ''); // Clear
teamPage = teamPage.replace(/Check,\n\s+X,\n\s+MessageSquare,/g, ''); // Clear
teamPage = teamPage.replace(/X,\n\s+MessageSquare,\n\s+Check,/g, ''); // Clear

teamPage = teamPage.replace("UserPlus,", "UserPlus, Check, X, MessageSquare,");

fs.writeFileSync('src/app/dashboard/salon/[salonId]/team/page.js', teamPage);

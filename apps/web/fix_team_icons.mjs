import fs from 'fs';
let content = fs.readFileSync('src/app/dashboard/salon/[salonId]/team/page.js', 'utf8');

// Ensure we have Check, X, and MessageSquare nicely integrated into the icons import list.
content = content.replace("  UserPlus,", "  UserPlus,\n  Check,\n  X,\n  MessageSquare,");

fs.writeFileSync('src/app/dashboard/salon/[salonId]/team/page.js', content);

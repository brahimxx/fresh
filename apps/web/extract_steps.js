const fs = require('fs');
const execSync = require('child_process').execSync;

const original = execSync('git show HEAD:apps/web/src/app/onboarding/page.js').toString();
const current = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const step2Start = original.indexOf('{/* Step 2: Business Name */}');
const step7End = original.indexOf('{/* Step 7: Complete */}'); // Actually Step 8 now? Wait, looking at current...
console.log('step2Start', step2Start, 'step7End', step7End);

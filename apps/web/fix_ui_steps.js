const fs = require('fs');

let page = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

// Increment the existing steps
page = page.replace('{/* Step 4: Location */}', '{/* Step 5: Location */}');
page = page.replace('{currentStep === 4 && (', '{currentStep === 5 && (');

page = page.replace('{/* Step 5: Services */}', '{/* Step 6: Services */}');
// Target the specific currentStep conditional via regex securely
page = page.replace(/\{\/\* Step 6: Services \*\/}[\s\S]*?\{currentStep === 5 && \(/, '{/* Step 6: Services */}\n          {currentStep === 6 && (');

page = page.replace('{/* Step 6: Team */}', '{/* Step 7: Team */}');
page = page.replace(/\{\/\* Step 7: Team \*\/}[\s\S]*?\{currentStep === 6 && \(/, '{/* Step 7: Team */}\n          {currentStep === 7 && (');

page = page.replace('{/* Step 7: Complete */}', '{/* Step 8: Complete */}');
page = page.replace(/\{\/\* Step 8: Complete \*\/}[\s\S]*?\{currentStep === 7 && \(/, '{/* Step 8: Complete */}\n          {currentStep === 8 && (');

fs.writeFileSync('src/app/onboarding/page.js', page, 'utf8');
console.log("Steps shifted");

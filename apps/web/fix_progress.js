const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const progressTarget = `            {STEPS.filter((s) => s.id !== 5 || accountType === "team").map(
              (step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;`;

const progressReplace = `            {STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;`;

code = code.replace(progressTarget, progressReplace);
fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');

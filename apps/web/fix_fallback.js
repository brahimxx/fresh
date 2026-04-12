const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

// Use powerful regex to target everything from `if (step.id < currentStep)` to `return (`
code = code.replace(
  /if \(step\.id < currentStep\) \{[\s\S]*?return \(/,
  `if (step.id < currentStep) {
              widthClass = "w-full"; // Past steps are completely filled
            } else if (step.id === currentStep) {
              // Current Step
              if (step.id === 4) {
                // Step 4 has two halves: 1. Account type, 2. Team size
                if (accountType === "team") widthClass = "w-1/2"; // Has reached second half
                else widthClass = "w-0"; // Still deciding
              } else {
                widthClass = "w-0";
              }
            }

            return (`
);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log("Updated via Regex!");

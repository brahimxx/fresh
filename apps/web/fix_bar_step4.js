const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const target = `            // Re-calculate visual position based on the displayed array so skipping Step 7 doesn't jump
            if (step.id < currentStep) {
              widthClass = "w-full"; // Past steps are completely filled
            } else if (step.id === currentStep) {
              // Current Step
              if (step.id === 4) {
                // Step 4 has two halves: 1. Account type, 2. Team size
                if (accountType === "team")
                  widthClass = "w-full"; // Has reached second half
                else widthClass = "w-1/2"; // Still deciding
              } else {
                // Every other current step gives partial visual feedback?
                // Or standard Fresha makes the *current* step fully highlighted or half?
                // Let's make all other current steps w-full so they match the original behavior of "active = full"
                widthClass = "w-full";
              }
            }

            return (`;

const replace = `            // Re-calculate visual position based on the displayed array so skipping Step 7 doesn't jump
            if (step.id < currentStep) {
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

            return (`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Updated behavior logic!");
} else {
  console.log("Could not find the exact chunk!");
}

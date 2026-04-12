const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const target = `{STEPS.filter(
            (step) => !(step.id === 7 && accountType === "independent"),
          ).map((step) => {
            let widthClass = "w-0";

            // Re-calculate visual position based on the displayed array so skipping Step 7 doesn't jump
            if (step.id < currentStep) {`;

const replace = `{STEPS.map((step) => {
            let widthClass = "w-0";

            if (step.id < currentStep) {`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Fixed the filter!");
} else {
  // try regex
  code = code.replace(
    /\{STEPS\.filter\([\s\S]*?\.map\(\(step\) => \{[\s\S]*?if \(step\.id < currentStep\) \{/,
    `{STEPS.map((step) => {
            let widthClass = "w-0";

            if (step.id < currentStep) {`
  );
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Replaced via regex!");
}


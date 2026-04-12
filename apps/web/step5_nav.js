const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

// handleContinue update
code = code.replace(
  'else if (currentStep === 5) handleLocationSubmit();',
  `else if (currentStep === 5) {
      if (!locationType) {
        toast.error("Please select a location type");
        return;
      }
      handleLocationSubmit();
    }`
);

// handleBack update
code = code.replace(
  `  const handleBack = () => {
    if (currentStep === 4 && accountType === "team") {`,
  `  const handleBack = () => {
    if (currentStep === 5 && locationType === "physical") {
      setLocationType(null);
      return;
    }
    if (currentStep === 4 && accountType === "team") {`
);

// Progress bar Update
code = code.replace(
  `              if (step.id === 4) {
                // Step 4 has two halves: 1. Account type, 2. Team size
                if (accountType === "team") widthClass = "w-1/2"; // Has reached second half
                else widthClass = "w-0"; // Still deciding
              } else {
                widthClass = "w-0";
              }`,
  `              if (step.id === 4) {
                // Step 4 has two halves: 1. Account type, 2. Team size
                if (accountType === "team") widthClass = "w-1/2"; // Has reached second half
                else widthClass = "w-0"; // Still deciding
              } else if (step.id === 5) {
                if (locationType === "physical") widthClass = "w-1/2";
                else widthClass = "w-0";
              } else {
                widthClass = "w-0";
              }`
);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log("Nav and Progress bar patched");

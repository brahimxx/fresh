const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

code = code.replace(
  /const handleLocationSubmit = \(\) => \{[\s\S]*?setSalonData\(salonForm\.getValues\(\)\);\n    handleNext\(\);\n  \};/,
  `const handleLocationSubmit = (overrideType) => {
    const activeType = overrideType || locationType;

    if (activeType === "physical") {
      const address = salonForm.getValues("address");
      const city = salonForm.getValues("city");
      const country = salonForm.getValues("country");

      let hasError = false;
      if (!address) {
        salonForm.setError("address", { message: "Address is required" });
        hasError = true;
      }
      if (!city) {
        salonForm.setError("city", { message: "City is required" });
        hasError = true;
      }
      if (!country) {
        salonForm.setError("country", { message: "Country is required" });
        hasError = true;
      }

      if (hasError) return;
    } else {
      salonForm.setValue("address", "Mobile or Virtual Provider");
      salonForm.setValue("city", "N/A");
      salonForm.setValue("country", "N/A");
    }

    setSalonData(salonForm.getValues());
    handleNext();
  };`
);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log("handleLocationSubmit securely patched");

const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const submitTarget = `  const handleLocationSubmit = () => {
    const address = salonForm.getValues("address");
    const city = salonForm.getValues("city");
    const country = salonForm.getValues("country");

    let hasError = false;
    if (!address) { salonForm.setError("address", { message: "Address is required" }); hasError = true; }
    if (!city) { salonForm.setError("city", { message: "City is required" }); hasError = true; }
    if (!country) { salonForm.setError("country", { message: "Country is required" }); hasError = true; }
    if (hasError) return;

    setSalonData(salonForm.getValues());
    handleNext();
  };`;

const submitReplace = `  const handleLocationSubmit = (activeType = locationType) => {
    if (activeType !== "physical") {
      salonForm.setValue("address", "Mobile or Virtual Provider", { shouldValidate: false });
      salonForm.setValue("city", "N/A", { shouldValidate: false });
      salonForm.setValue("country", "N/A", { shouldValidate: false });
      
      setSalonData(salonForm.getValues());
      handleNext();
      return;
    }

    const address = salonForm.getValues("address");
    const city = salonForm.getValues("city");
    const country = salonForm.getValues("country");

    let hasError = false;
    if (!address) { salonForm.setError("address", { message: "Address is required" }); hasError = true; }
    if (!city) { salonForm.setError("city", { message: "City is required" }); hasError = true; }
    if (!country) { salonForm.setError("country", { message: "Country is required" }); hasError = true; }
    if (hasError) return;

    setSalonData(salonForm.getValues());
    handleNext();
  };`;

if (code.includes(submitTarget)) {
  code = code.replace(submitTarget, submitReplace);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
} else {
  console.log("Could not find the target");
}

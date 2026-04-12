const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

// 1. Add locationType to state near teamSize
code = code.replace(
  '  const [teamSize, setTeamSize] = useState(null);',
  '  const [teamSize, setTeamSize] = useState(null);\n  const [locationType, setLocationType] = useState(null);'
);

// 2. Fix the STEPS array
code = code.replace(
  '{ id: 5, title: "Location", question: "Where is your salon located?" },',
  '{ id: 5, title: "Location", question: "Where do you provide your services?" },'
);

// 3. Fix handleLocationSubmit
const submitBlock = `  const handleLocationSubmit = () => {
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

    setSalonData(salonForm.getValues());
    handleNext();
  };`;

const fixSubmitBlock = `  const handleLocationSubmit = () => {
    if (locationType === "physical") {
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
  };`;

code = code.replace(submitBlock, fixSubmitBlock);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
console.log("State and function patched.");

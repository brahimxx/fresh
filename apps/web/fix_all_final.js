const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

// 1. Add locationType to state
code = code.replace(
  'const [currentStep, setCurrentStep] = useState(1);',
  'const [currentStep, setCurrentStep] = useState(1);\n  const [locationType, setLocationType] = useState(null);'
);

// 2. Patch STEPS
code = code.replace(
  '{ id: 5, label: "Location", question: "Where is your salon located?" },',
  '{ id: 5, label: "Location", question: "Where do you provide your services?" },'
);

// 3. Remove jumpy progress bar filter
code = code.replace(
  /STEPS\.filter\(\(s\) => s\.id !== 5 \|\| accountType === "team"\)\.map/g,
  'STEPS.map'
);

// 4. Patch handleLocationSubmit
const submitRegex = /const handleLocationSubmit = \(\) => {[\s\S]*?handleNext\(\);\n  };/;
const submitReplace = `const handleLocationSubmit = (activeType = locationType) => {
    if (activeType !== "physical" && activeType !== null && activeType !== undefined) {
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
code = code.replace(submitRegex, submitReplace);

// 5. Update handleBack
code = code.replace(
  'setCurrentStep((prev) => prev - 1);',
  `if (currentStep === 5 && locationType === "physical") {
        setLocationType(null); // Go back to location type selection
      } else {
        setCurrentStep((prev) => prev - 1);
      }`
);

// 6. Update Step 5 UI
const step5Regex = /{currentStep === 5 && \([\s\S]*?<Form \{\.\.\.salonForm\}>/;
const step5Replace = `{currentStep === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Location</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {!locationType 
                    ? "Where do you provide your services?" 
                    : "Where is your salon located?"}
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  {!locationType
                    ? "Let clients know where they can find you."
                    : "Your address will be used to show your salon on the map and help clients find you."}
                </p>
              </div>

              {!locationType ? (
                <div className="flex flex-col gap-3">
                  {[
                    { id: "physical", label: "Clients come to me at a physical location" },
                    { id: "mobile", label: "I visit my clients as a mobile operator" },
                    { id: "virtual", label: "I provide virtual services online" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setLocationType(option.id);
                        if (option.id !== "physical") {
                          handleLocationSubmit(option.id);
                        }
                      }}
                      className={cn(
                        "p-5 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-between group hover:border-primary/50 bg-background",
                        locationType === option.id ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <span className="font-semibold text-base">{option.label}</span>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        locationType === option.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {locationType === option.id && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>
              ) : locationType === "physical" && (
                <Form {...salonForm}>`;
code = code.replace(step5Regex, step5Replace);

// 7. Close ternary for Form safely
const step5CloseRegex = /(<FormMessage \/>\s*<\/FormItem>\s*)\}\s*\/>\s*<\/div>\s*<\/div>\s*<\/Form>\s*<\/div>\s*\)\}\s*\{\/\* Step 6:/;
const step5CloseReplace = `$1}\n                    />\n                  </div>\n                </div>\n              </Form>\n              )}\n            </div>\n          )}\n\n          {/* Step 6:`;
code = code.replace(step5CloseRegex, step5CloseReplace);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');

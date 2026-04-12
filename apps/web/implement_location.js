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
const progressTarget = \`            {STEPS.filter((s) => s.id !== 5 || accountType === "team").map(
              (step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;\`;

const progressReplace = \`            {STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;\`;

code = code.replace(progressTarget, progressReplace);

// 4. Patch handleLocationSubmit
const submitTarget = \`  const handleLocationSubmit = () => {
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
  };\`;

const submitReplace = \`  const handleLocationSubmit = (activeType = locationType) => {
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
  };\`;

code = code.replace(submitTarget, submitReplace);

// 5. Update handleBack
const backTarget = \`      setCurrentStep((prev) => prev - 1);
    }
  };\`;

const backReplace = \`      if (currentStep === 5 && locationType === "physical") {
        setLocationType(null); // Go back to location type selection
      } else {
        setCurrentStep((prev) => prev - 1);
      }
    }
  };\`;

code = code.replace(backTarget, backReplace);

// 6. Update Step 5 UI
const step5Target = \`            {/* Step 5: Location */}
          {currentStep === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Location</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Where is your salon located?
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  Your address will be used to show your salon on the map and
                  help clients find you.
                </p>
              </div>

              <Form {...salonForm}>\`;

const step5Replace = \`            {/* Step 5: Location */}
          {currentStep === 5 && (
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
                <Form {...salonForm}>\`;

code = code.replace(step5Target, step5Replace);

// 7. Close ternary for Form safely
const step5CloseTarget = \`                      )}
                    />
                  </div>
                </div>
              </Form>
            </div>
          )}\`;

const step5CloseReplace = \`                      )}
                    />
                  </div>
                </div>
              </Form>
              )}
            </div>
          )}\`;

code = code.replace(step5CloseTarget, step5CloseReplace);

fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');

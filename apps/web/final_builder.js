const fs = require('fs');

let page = fs.readFileSync('old_page.js', 'utf8');

// 1. Add state variables
page = page.replace(
  'const [currentStep, setCurrentStep] = useState(1);',
  'const [currentStep, setCurrentStep] = useState(1);\n  const [accountType, setAccountType] = useState(null);\n  const [teamSize, setTeamSize] = useState(null);'
);

// 1.5 Update STEPS array
page = page.replace(
  `  { id: 3, title: "Business type", question: "What type of business are you?" },\n  { id: 4, title: "Location", question: "Where is your salon located?" },\n  { id: 5, title: "Services", question: "What services do you offer?" },\n  { id: 6, title: "Team", question: "Invite your team members" },\n  { id: 7, title: "Complete", question: "You're all set!" },\n];`,
  `  { id: 3, title: "Business type", question: "What type of business are you?" },\n  { id: 4, title: "Account setup", question: "Select account type" },\n  { id: 5, title: "Location", question: "Where is your salon located?" },\n  { id: 6, title: "Services", question: "What services do you offer?" },\n  { id: 7, title: "Team", question: "Invite your team members" },\n  { id: 8, title: "Complete", question: "You're all set!" },\n];`
);

// 2. Update handleNext and continueLabel
const oldNavBlock = page.substring(page.indexOf('  const handleNext = () => {'), page.indexOf('const handleLogoUpload ='));
page = page.replace(oldNavBlock, 
`  const handleNext = () => {
    let nextStep = currentStep + 1;
    // Step 4 handles accountType and team size. Next step is 5 (Location).
    if (currentStep === 4) nextStep = 5;
    // Step 6 is Services. Step 7 is Team. Independent skips Team.
    if (currentStep === 6 && accountType === "independent") nextStep = 8;
    if (nextStep <= STEPS.length) {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep === 4 && accountType === "team" && !teamSize) {
      setAccountType(null); // Go back to account type within Step 4
      return;
    }
    let prevStep = currentStep - 1;
    // Step 7 was "Invite staff". We skip this for independent.
    if (currentStep === 8 && accountType === "independent") prevStep = 6;
    if (prevStep >= 1) {
      setCurrentStep(prevStep);
    }
  };

  const handleContinue = () => {
    if (currentStep === 1) handleNext();
    else if (currentStep === 2) handleSalonNameSubmit();
    else if (currentStep === 3) handleCategorySubmit();
    else if (currentStep === 4) {
      if (accountType === "independent") handleNext();
      else if (accountType === "team" && teamSize) handleNext();
      else handleNext();
    }
    else if (currentStep === 5) handleLocationSubmit();
    else if (currentStep === 6) handleNext();
    else if (currentStep === 7) handleNext();
    else if (currentStep === 8) handleComplete();
  };

  const continueLabel = () => {
    if (currentStep === 1) return "Get Started";
    if (currentStep === 8) return isLoading ? "Creating..." : "Launch Dashboard";
    if (currentStep === 7 && services.length === 0) return "Skip";
    if (currentStep === 7 && staffMembers.length === 0) return "Skip";
    return "Continue";
  };

  `);

// 3. Update top segmented progress bar
const progBarMatch = page.match(/\{\/\* ─── Top Segmented Progress Bar[\s\S]*?w-0"\n\s*\)\}\n\s*\/\>\n\s*<\/div>\n\s*\);\n\s*\})\}\n\s*<\/div>/);
if (progBarMatch) {
  page = page.replace(progBarMatch[0], 
`{/* ─── Top Segmented Progress Bar ─────────────────────── */}
        <div className="max-w-7xl mx-auto w-full flex gap-1.5 px-4 sm:px-6 lg:px-8 pt-4">
          {STEPS.map((step, i) => {
            let widthClass = "w-0";
            if (i < currentStep - 1) {
              widthClass = "w-full";
            } else if (i === currentStep - 1) {
              if (currentStep === 4) {
                if (!accountType) widthClass = "w-1/2";
                else widthClass = "w-full";
              } else {
                widthClass = "w-full";
              }
            }

            return (
              <div
                key={step.id}
                className="flex-1 h-[5px] rounded-full overflow-hidden bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary to-violet-500",
                    widthClass
                  )}
                />
              </div>
            );
          })}
        </div>`);
} else {
  console.log("Failed to match progress bar via regex!");
}

// 4. Transform steps: Find Step 4 Location and all subsequent steps, and shift them.
// Step 4 Location -> Step 5 Location
page = page.replace('{/* Step 4: Location */}', '{/* Step 5: Location */}');
page = page.replace('{currentStep === 4 && (', '{currentStep === 5 && (');

// Step 5 Services -> Step 6 Services
page = page.replace('{/* Step 5: Services */}', '{/* Step 6: Services */}');
// Ensure it matches only Step 5's conditional block
page = page.replace(/\{\/\* Step 6: Services \*\/}[\s\S]*?\{currentStep === 5 && \(/, '{/* Step 6: Services */}\n          {currentStep === 6 && (');

// Step 6 Team -> Step 7 Team
page = page.replace('{/* Step 6: Team */}', '{/* Step 7: Team */}');
page = page.replace(/\{\/\* Step 7: Team \*\/}[\s\S]*?\{currentStep === 6 && \(/, '{/* Step 7: Team */}\n          {currentStep === 7 && (');

// Step 7 Complete -> Step 8 Complete
page = page.replace('{/* Step 7: Complete */}', '{/* Step 8: Complete */}');
page = page.replace(/\{\/\* Step 8: Complete \*\/}[\s\S]*?\{currentStep === 7 && \(/, '{/* Step 8: Complete */}\n          {currentStep === 8 && (');

// 5. Insert New Step 4 Account Type right BEFORE Step 5 Location
const insertionIdx = page.indexOf('{/* Step 5: Location */}');
const step4Str = `          {/* Step 4: Account Type */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Account setup</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {!accountType ? "Select account type" : "What is your team size?"}
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  {!accountType 
                    ? "Choose how you'll be using Fresh to manage your business." 
                    : "This helps us personalize your team management experience."}
                </p>
              </div>

              {!accountType ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => { setAccountType("independent"); handleNext(); }}
                    className={cn(
                      "p-6 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer group hover:border-primary/50 bg-background",
                      accountType === "independent" ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">I'm an independent</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      I work alone and manage everything myself.
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setAccountType("team")}
                    className={cn(
                      "p-6 text-left rounded-xl border-2 transition-all duration-200 cursor-pointer group hover:border-primary/50 bg-background",
                      accountType === "team" ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">It's a team</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      I have staff members working with me.
                    </p>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["2-5", "6-10", "11-20", "20+"].map((size) => (
                    <button
                      key={size}
                      onClick={() => { setTeamSize(size); handleNext(); }}
                      className={cn(
                        "p-6 rounded-xl border-2 text-center transition-all duration-200 font-medium hover:border-primary/50 cursor-pointer bg-background",
                        teamSize === size ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted/50"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          `;

page = page.slice(0, insertionIdx) + step4Str + page.slice(insertionIdx);

fs.writeFileSync('src/app/onboarding/page.js', page, 'utf8');
console.log("Successfully rebuilt from original!");

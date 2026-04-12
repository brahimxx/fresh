const fs = require('fs');

const current = fs.readFileSync('src/app/onboarding/page.js', 'utf8');
const original = fs.readFileSync('old_page.js', 'utf8');

// The current file breaks after Step 1.
// Let's find exactly where Step 1 ends in current file.
const currentEnd = current.indexOf(`            {/* Step 2: Business Name */}`);
let topHalf;
if (currentEnd !== -1) {
  topHalf = current.slice(0, currentEnd);
} else {
  // Wait, current file ENDS at Step 1 abruptly.
  // Actually, the current file ends literally with `</div> </div> </div> ); }`
  const step1End = current.indexOf(`          {/* Step 2: Business Name */}`);
  if (step1End !== -1) topHalf = current.slice(0, step1End);
  else {
    const endMatch = current.indexOf('              </div>\n            </div>\n          )}');
    topHalf = current.slice(0, endMatch + 45); // up to the end of Step 1
  }
}

// Now let's extract Steps 2 to 7 from original.
const origStep2 = original.indexOf('          {/* Step 2: Business Name */}');
const origStep3 = original.indexOf('          {/* Step 3: Business Type */}');
const origStep4 = original.indexOf('          {/* Step 4: Location */}');
const origStep5 = original.indexOf('          {/* Step 5: Services */}');
const origStep6 = original.indexOf('          {/* Step 6: Team */}');
const origStep7 = original.indexOf('          {/* Step 7: Complete */}');
const origEnd = original.indexOf('        </div>\n      </div>\n    </div>');

// Extract the original steps
const step2Str = original.slice(origStep2, origStep3);
const step3Str = original.slice(origStep3, origStep4);
// These steps are shifted:
let step5Str = original.slice(origStep4, origStep5).replace(/currentStep === 4/g, 'currentStep === 5').replace('Step 4: Location', 'Step 5: Location');
let step6Str = original.slice(origStep5, origStep6).replace(/currentStep === 5/g, 'currentStep === 6').replace('Step 5: Services', 'Step 6: Services');
let step7Str = original.slice(origStep6, origStep7).replace(/currentStep === 6/g, 'currentStep === 7').replace('Step 6: Team', 'Step 7: Team');
let step8Str = original.slice(origStep7, origEnd).replace(/currentStep === 7/g, 'currentStep === 8').replace('Step 7: Complete', 'Step 8: Complete');

// Build the new Step 4
const step4Str = `
          {/* Step 4: Account Type */}
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

const finalFile = topHalf + '\n' + step2Str + step3Str + step4Str + step5Str + step6Str + step7Str + step8Str + '\n        </div>\n      </div>\n    </div>\n  );\n}';

fs.writeFileSync('src/app/onboarding/page.js', finalFile, 'utf8');
console.log('Rebuilt page.js');

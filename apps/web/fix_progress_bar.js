const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const startIdx = code.indexOf('{/* ─── Top Segmented Progress Bar ─────────────────────── */}');
const endIdx = code.indexOf('{/* ─── Floating Navigation ────────────────────────────── */}');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `\{/* ─── Top Segmented Progress Bar ─────────────────────── */}
        <div className="max-w-7xl mx-auto w-full flex gap-1.5 px-4 sm:px-6 lg:px-8 pt-4">
          {STEPS.filter(step => !(step.id === 7 && accountType === "independent")).map((step) => {
            let widthClass = "w-0";
            
            // Re-calculate visual position based on the displayed array so skipping Step 7 doesn't jump
            if (step.id < currentStep) {
              widthClass = "w-full"; // Past steps are completely filled
            } else if (step.id === currentStep) {
              // Current Step
              if (step.id === 4) {
                // Step 4 has two halves: 1. Account type, 2. Team size
                if (accountType === "team") widthClass = "w-full"; // Has reached second half
                else widthClass = "w-1/2"; // Still deciding
              } else {
                // Every other current step gives partial visual feedback? 
                // Or standard Fresha makes the *current* step fully highlighted or half?
                // Let's make all other current steps w-full so they match the original behavior of "active = full"
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
                    "h-full rounded-full transition-all duration-500 ease-out",
                    widthClass === "w-full"
                      ? "bg-gradient-to-r from-primary to-violet-500 w-full"
                      : widthClass === "w-1/2"
                        ? "bg-gradient-to-r from-primary to-violet-500 w-1/2"
                        : "w-0",
                  )}
                />
              </div>
            );
          })}
        </div>

        `;
  
  // Also slice out the 8 extra spaces since startIdx includes the indent length of the comment
  const exactStart = code.lastIndexOf('      ', startIdx) || startIdx;
  code = code.substring(0, exactStart) + '      ' + replacement + code.substring(endIdx);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Replaced segmented progress bar!");
}

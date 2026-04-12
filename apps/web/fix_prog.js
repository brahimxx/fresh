const fs = require('fs');

let page = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const target = `{STEPS.map((step, i) => (
            <div
              key={step.id}
              className="flex-1 h-[5px] rounded-full overflow-hidden bg-muted"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  i < currentStep
                    ? "w-full bg-gradient-to-r from-primary to-violet-500"
                    : "w-0"
                )}
              />
            </div>
          ))}`;

if (page.includes(target)) {
  page = page.replace(target, `{STEPS.map((step, i) => {
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
          })}`);
  fs.writeFileSync('src/app/onboarding/page.js', page, 'utf8');
  console.log("Fixed progress bar!");
} else {
  console.log("Could not find progress bar to fix!");
}

// Ensure icon import is good
page = page.replace('  Scissors,\n  Users,\n  Sparkles,', '  Scissors,\n  User,\n  Users,\n  Sparkles,');
fs.writeFileSync('src/app/onboarding/page.js', page, 'utf8');


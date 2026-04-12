const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const targetUI = `                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {!accountType
                    ? "Select account type"
                    : "What is your team size?"}
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  {!accountType
                    ? "Choose how you'll be using Fresh to manage your business."
                    : "This helps us personalize your team management experience."}
                </p>
              </div>

              {!accountType ? (`;

const repUI = `                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {accountType !== "team"
                    ? "Select account type"
                    : "What is your team size?"}
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  {accountType !== "team"
                    ? "Choose how you'll be using Fresh to manage your business."
                    : "This helps us personalize your team management experience."}
                </p>
              </div>

              {accountType !== "team" ? (`;

if (code.includes(targetUI)) {
  code = code.replace(targetUI, repUI);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Fixed Step 4 UI rendering!");
} else {
  console.log("Could not find the block to replace.");
}


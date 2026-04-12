const fs = require('fs');

let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const target = `                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Where is your salon located?
                </h1>
                <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                  Your address will be used to show your salon on the map and
                  help clients find you.
                </p>
              </div>

              <Form {...salonForm}>`;

const replace = `                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
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

if (code.includes(target)) {
  code = code.replace(target, replace);

  // Make sure the bottom of the Form gets closed safely.
  // We need to inject the closing brackets for the ternary expression!
  const formEnd = `                    </div>
                  </div>
                </Form>`;
  const formEndRep = `                    </div>
                  </div>
                </Form>
              )}`;

  code = code.replace(formEnd, formEndRep);

  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Step 5 UI seamlessly integrated.");
} else {
  // Maybe we have a whitespace mismatch.
  code = code.replace(/<h1 className="text-3xl md:text-4xl font-bold tracking-tight">[\s\S]*?<Form \{\.\.\.salonForm\}>/, replace);
  code = code.replace(/<\/div>\n\s*<\/div>\n\s*<\/Form>/, `                    </div>\n                  </div>\n                </Form>\n              )}`);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log("Fallback replacement applied.");
}

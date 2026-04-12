const fs = require('fs');
let content = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const replacement = `      {/* ─── Top Segmented Progress Bar ─────────────────────── */}
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
      </div>

      {/* ─── Top Navigation Bar ───────────────────────────────── */}
      <div className="w-full flex justify-between items-center p-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Back button */}
        <div className="w-24">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          )}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          variant="outline"
          className="rounded-full border-border bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 h-10 text-sm shadow-lg shadow-primary/20 cursor-pointer"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {continueLabel()}
          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {/* ─── Main Content ───────────────────────────────────── */}
      <div className="flex-1 flex items-start md:items-center justify-center px-4 sm:px-6 lg:px-8 pb-16">
        <div className="w-full max-w-2xl">

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-sm text-muted-foreground mb-3">Welcome</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Let&apos;s set up your salon on{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
                    Fresh
                  </span>
                </h1>
                <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-lg">
                  It only takes a few minutes. You&apos;ll create your salon profile, add services, and invite your team. Everything can be changed later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Store, title: "Create Salon", desc: "Add your details" },
                  { icon: Scissors, title: "Add Services", desc: "List what you offer" },
                  { icon: Users, title: "Invite Team", desc: "Bring your staff" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="p-4 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <Icon className="w-6 h-6 text-primary mb-2" />
                      <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Business Name */}`;

const startIdx = content.indexOf(`      {/* ─── Top Segmented Progress Bar`);
const endIdx = content.indexOf(`          {/* Step 2: Business Name */}`);
console.log(startIdx, endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx + 40);
  fs.writeFileSync('src/app/onboarding/page.js', content, 'utf8');
  console.log("Successfully patched page.js");
}


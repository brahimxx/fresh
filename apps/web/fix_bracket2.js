const fs = require('fs');
let code = fs.readFileSync('src/app/onboarding/page.js', 'utf8');

const target = `                  })}
                </div>
              </div>
       
            {/* Step 2: Business Name */}`;

const rep = `                  })}
                </div>
              </div>
            )}

            {/* Step 2: Business Name */}`;

if (code.includes(target)) {
  code = code.replace(target, rep);
  fs.writeFileSync('src/app/onboarding/page.js', code, 'utf8');
  console.log('Fixed block 2');
} else {
  console.log('Still could not find it. Here is the char code:');
  const idx = code.indexOf('{/* Step 2: Business Name */}');
  console.log(code.slice(idx - 60, idx + 10));
}

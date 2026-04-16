import fs from 'fs';

let content = fs.readFileSync('src/app/onboarding/join/page.js', 'utf8');

// 1. Cover height
content = content.replace('className="h-48 w-full bg-muted relative"', 'className="h-32 w-full bg-muted relative"');

// 2. Adjust padding and negative margin
content = content.replace('className="px-8 pb-8 relative -mt-20"', 'className="px-6 pb-6 relative -mt-16"');

// 3. Adjust logo size and shape
content = content.replace('w-28 h-28 rounded-3xl bg-secondary border-4 border-card flex items-center justify-center overflow-hidden shrink-0 shadow-xl relative z-10', 'w-24 h-24 rounded-2xl bg-secondary border-4 border-card flex items-center justify-center overflow-hidden shrink-0 shadow-xl relative z-10');

// 4. Adjust button margin
content = content.replace('Button \n                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 h-12 mb-3', 'Button \n                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 h-10 mb-2');
content = content.replace('hover:bg-primary/90 font-bold px-8 h-12 mb-3', 'hover:bg-primary/90 font-bold px-6 h-10 mb-2');

// 5. Adjust margins below logo and action
content = content.replace('flex justify-between items-end mb-6', 'flex justify-between items-end mb-4');

// 6. Adjust Header margin
content = content.replace('DialogHeader className="text-left mb-6 space-y-2"', 'DialogHeader className="text-left mb-4 space-y-1"');

// 7. Adjust titles and space-y
content = content.replace('className="text-3xl font-extrabold text-foreground tracking-tight"', 'className="text-2xl font-bold text-foreground tracking-tight"');
content = content.replace('className="space-y-6"', 'className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar"');

fs.writeFileSync('src/app/onboarding/join/page.js', content);

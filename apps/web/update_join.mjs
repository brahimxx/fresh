import fs from 'fs';
let content = fs.readFileSync('src/app/onboarding/join/page.js', 'utf8');

content = content.replace(
  'import { motion, AnimatePresence } from "framer-motion";',
  `import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";`
);

content = content.replace(
  'const [isSubmitting, setIsSubmitting] = useState(false);',
  `const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [viewingSalon, setViewingSalon] = useState(null);`
);

content = content.replace(
  'const handleSelectBusiness = (salon) => {',
  `const handleViewProfile = (salon) => {
    setViewingSalon(salon);
    setProfileModalOpen(true);
  };

  const handleSelectBusiness = (salon) => {
    setSelectedSalon(salon);
    setStep(2);
    setProfileModalOpen(false);
  };

  const handleRadioSelect = (salon) => {
    setSelectedSalon(salon);
  };

  const originalHandleSelect = (salon) => {`
);

content = content.replace(
  `onClick={() => handleSelectBusiness(salon)}`,
  `onClick={() => handleRadioSelect(salon)}`
);

content = content.replace(
  `onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBusiness(salon);
                        }}`,
  `onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile(salon);
                        }}`
);

content = content.replace(
  `<div className="flex gap-2">
            <Button variant="ghost" className="rounded-full" asChild>
              <Link href="/onboarding/choose">Close</Link>
            </Button>
            {step === 1 ? (
              <Button 
                variant="secondary" 
                className="rounded-full" 
                disabled={true} 
              >
                Continue
              </Button>`,
  `<div className="flex gap-2">
            <Button variant="ghost" className="rounded-full" asChild>
              <Link href="/onboarding/choose">Close</Link>
            </Button>
            {step === 1 ? (
              <Button 
                variant={selectedSalon ? "default" : "secondary"} 
                className={selectedSalon ? "rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold" : "rounded-full"} 
                disabled={!selectedSalon} 
                onClick={() => setStep(2)}
              >
                Continue
              </Button>`
);

content = content.replace(
  `{results.map((salon) => (
                      <div 
                        key={salon.id} 
                        className="flex items-center justify-between p-4 rounded-xl border border-muted-foreground/20 bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                        onClick={() => handleRadioSelect(salon)}
                      >`,
  `{results.map((salon) => (
                      <div 
                        key={salon.id} 
                        className={\`flex items-center justify-between p-4 rounded-xl border \${selectedSalon?.id === salon.id ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-card hover:bg-accent/5"} transition-colors cursor-pointer\`}
                        onClick={() => handleRadioSelect(salon)}
                      >`
);



content = content.replace(
  `</main>
    </div>
  );
}`,
  `
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#1c1c1c] text-white border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold mb-4">
              {viewingSalon?.name}&apos;s locations
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {viewingSalon && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {viewingSalon.logo_url ? (
                      <img src={viewingSalon.logo_url} alt={viewingSalon.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{viewingSalon.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{viewingSalon.name}</h3>
                    <div className="text-xs text-white/60 mt-0.5">
                      {viewingSalon.address ? \`\${viewingSalon.address}\${viewingSalon.city ? \`, \${viewingSalon.city}\` : ''}\` : (viewingSalon.city || "Location not provided")}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="rounded-full bg-transparent border-white/20 text-white hover:bg-white hover:text-black shrink-0 transition-colors" 
                  onClick={() => handleSelectBusiness(viewingSalon)}
                >
                  View
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}`
);

fs.writeFileSync('src/app/onboarding/join/page.js', content);

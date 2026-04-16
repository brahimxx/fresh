import fs from 'fs';

let content = fs.readFileSync('src/app/onboarding/join/page.js', 'utf8');

const oldDialogRegex = /<Dialog open={profileModalOpen}.*?<\/Dialog>/s;
const newDialog = `      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border/50 rounded-[2rem] overflow-hidden p-0 gap-0 shadow-2xl">
          <div className="sr-only">
            <DialogTitle>{viewingSalon?.name}&apos;s locations</DialogTitle>
          </div>
          {viewingSalon && (
            <>
              {/* Header/Cover Area */}
              <div className="h-56 w-full bg-muted relative">
                {viewingSalon.cover_image_url ? (
                  <img src={viewingSalon.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                ) : viewingSalon.logo_url ? (
                  <img src={viewingSalon.logo_url} alt="Cover Fallback" className="w-full h-full object-cover blur-sm opacity-50 scale-110" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>

              <div className="px-8 pb-8 relative -mt-20">
                {/* Logo & Action */}
                <div className="flex justify-between items-end mb-6">
                  <div className="w-28 h-28 rounded-3xl bg-secondary border-4 border-card flex items-center justify-center overflow-hidden shrink-0 shadow-xl relative z-10">
                    {viewingSalon.logo_url ? (
                      <img src={viewingSalon.logo_url} alt={viewingSalon.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-extrabold tracking-tight text-secondary-foreground">{viewingSalon.name.charAt(0)}</span>
                    )}
                  </div>
                  <Button 
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 h-12 mb-3 transition-transform active:scale-95 shadow-lg relative z-10" 
                    onClick={() => handleSelectBusiness(viewingSalon)}
                  >
                    Select Workspace
                  </Button>
                </div>

                {/* Info */}
                <DialogHeader className="text-left mb-6 space-y-2">
                  <DialogTitle className="text-3xl font-extrabold text-foreground tracking-tight">
                    {viewingSalon.name}
                  </DialogTitle>
                  <div className="flex items-center text-[15px] font-medium text-muted-foreground">
                    <span>{viewingSalon.category || "Salon and Spa"}</span>
                    <span className="mx-2 opacity-50">•</span>
                    <span className="flex items-center text-foreground">
                      <Star className="w-4 h-4 fill-foreground text-foreground mr-1.5" />
                      <span>{viewingSalon.rating || "5.0"}</span>
                      <span className="text-muted-foreground ml-1">({viewingSalon.review_count || 0})</span>
                    </span>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Address */}
                  <div className="flex items-start gap-4 text-muted-foreground">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="leading-relaxed pt-0.5">
                      <p className="font-medium text-foreground">{viewingSalon.address || "Address not provided"}</p>
                      {(viewingSalon.city || viewingSalon.state || viewingSalon.postal_code) && (
                        <p className="text-sm mt-0.5">{[viewingSalon.city, viewingSalon.state, viewingSalon.postal_code].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {viewingSalon.description && (
                    <div className="text-[15px] text-muted-foreground bg-secondary/50 p-5 rounded-2xl border border-border/50">
                      <p className="line-clamp-3 leading-relaxed">{viewingSalon.description}</p>
                    </div>
                  )}

                  {/* Services Pill Tags */}
                  {viewingSalon.services_preview && viewingSalon.services_preview.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Services</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {viewingSalon.services_preview.map((svc, i) => (
                          <span key={i} className="text-[14px] bg-secondary text-secondary-foreground px-4 py-2 rounded-xl font-medium shadow-sm">{svc}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>`;

content = content.replace(oldDialogRegex, newDialog);
fs.writeFileSync('src/app/onboarding/join/page.js', content);

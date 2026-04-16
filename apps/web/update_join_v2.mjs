import fs from 'fs';
let content = fs.readFileSync('src/app/onboarding/join/page.js', 'utf8');

content = content.replace(
  'import { Search, ArrowLeft, Loader2, Store } from "lucide-react";',
  'import { Search, ArrowLeft, Loader2, Store, Star, MapPin } from "lucide-react";'
);

const oldDialog = `      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#1c1c1c] text-white border-white/10 rounded-2xl overflow-hidden p-0 gap-0">
          <div className="sr-only">
            <DialogTitle>{viewingSalon?.name}&apos;s locations</DialogTitle>
          </div>
          {viewingSalon && (
            <>
              {/* Header/Cover Area */}
              <div className="h-32 w-full bg-primary/20 relative">
                {viewingSalon.cover_image_url ? (
                  <img src={viewingSalon.cover_image_url} alt="Cover" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/30 to-accent/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c] via-[#1c1c1c]/50 to-transparent" />
              </div>

              <div className="px-6 pb-8 relative -mt-10">
                {/* Logo & Action */}
                <div className="flex justify-between items-end mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#2a2a2a] border-4 border-[#1c1c1c] flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                    {viewingSalon.logo_url ? (
                      <img src={viewingSalon.logo_url} alt={viewingSalon.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">{viewingSalon.name.charAt(0)}</span>
                    )}
                  </div>
                  <Button 
                    className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-6 h-10 mb-2 transition-transform active:scale-95" 
                    onClick={() => handleSelectBusiness(viewingSalon)}
                  >
                    Select Workspace
                  </Button>
                </div>

                {/* Info */}
                <DialogHeader className="text-left mb-6 space-y-1">
                  <DialogTitle className="text-2xl font-bold text-white">
                    {viewingSalon.name}
                  </DialogTitle>
                  <p className="text-white/60 text-sm font-medium">
                    {viewingSalon.category || "Salon / Spa"} • {viewingSalon.rating ? \`\${viewingSalon.rating} ★ (\${viewingSalon.review_count})\` : "No reviews yet"}
                  </p>
                </DialogHeader>

                <div className="space-y-5">
                  <div className="flex items-start gap-3 text-sm text-white/80">
                    <Store className="w-5 h-5 mt-0.5 text-white/40 shrink-0" />
                    <div className="leading-relaxed">
                      <p>{viewingSalon.address || "Address not provided"}</p>
                      {(viewingSalon.city || viewingSalon.state || viewingSalon.postal_code) && (
                        <p>{[viewingSalon.city, viewingSalon.state, viewingSalon.postal_code].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {viewingSalon.description && (
                    <div className="text-sm text-white/70 bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="line-clamp-3 leading-relaxed">{viewingSalon.description}</p>
                    </div>
                  )}

                  {viewingSalon.services_preview && viewingSalon.services_preview.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Services</p>
                      <div className="flex flex-wrap gap-2">
                        {viewingSalon.services_preview.map((svc, i) => (
                          <span key={i} className="text-xs bg-white/10 text-white/90 px-3 py-1.5 rounded-lg border border-white/5">{svc}</span>
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

const newDialog = `      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1b1e] text-white border-white/5 rounded-[24px] overflow-hidden p-0 gap-0 shadow-2xl">
          <div className="sr-only">
            <DialogTitle>{viewingSalon?.name}&apos;s locations</DialogTitle>
          </div>
          {viewingSalon && (
            <>
              {/* Header/Cover Area */}
              <div className="h-48 w-full bg-[#141517] relative">
                {viewingSalon.cover_image_url ? (
                  <img src={viewingSalon.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b1e] via-[#1a1b1e]/40 to-transparent" />
              </div>

              <div className="px-6 pb-8 relative -mt-16">
                {/* Logo & Action */}
                <div className="flex justify-between items-end mb-5">
                  <div className="w-24 h-24 rounded-[20px] bg-[#25262b] border-[6px] border-[#1a1b1e] flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                    {viewingSalon.logo_url ? (
                      <img src={viewingSalon.logo_url} alt={viewingSalon.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold tracking-tight text-white">{viewingSalon.name.charAt(0)}</span>
                    )}
                  </div>
                  <Button 
                    className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-7 h-11 mb-2 transition-transform active:scale-95 shadow-lg" 
                    onClick={() => handleSelectBusiness(viewingSalon)}
                  >
                    Select Workspace
                  </Button>
                </div>

                {/* Info */}
                <DialogHeader className="text-left mb-6 space-y-1.5">
                  <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                    {viewingSalon.name}
                  </DialogTitle>
                  <div className="flex items-center text-[15px] font-medium text-white/70">
                    <span>{viewingSalon.category || "Salon and Spa"}</span>
                    <span className="mx-2 opacity-50">•</span>
                    <span className="flex items-center">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1.5" />
                      <span className="text-white/90">{viewingSalon.rating || "5.0"}</span>
                      <span className="text-white/50 ml-1">({viewingSalon.review_count || 0})</span>
                    </span>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Address */}
                  <div className="flex items-start gap-4 text-[#C1C2C5]">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="leading-relaxed pt-0.5">
                      <p className="font-medium text-white/90">{viewingSalon.address || "Address not provided"}</p>
                      {(viewingSalon.city || viewingSalon.state || viewingSalon.postal_code) && (
                        <p className="text-sm text-white/60 mt-0.5">{[viewingSalon.city, viewingSalon.state, viewingSalon.postal_code].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {viewingSalon.description && (
                    <div className="text-[15px] text-[#C1C2C5] bg-[#25262b]/50 p-5 rounded-2xl border border-white/5">
                      <p className="line-clamp-3 leading-relaxed">{viewingSalon.description}</p>
                    </div>
                  )}

                  {/* Services Pill Tags */}
                  {viewingSalon.services_preview && viewingSalon.services_preview.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-[13px] font-bold text-white/50 uppercase tracking-widest mb-3">Services provided</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {viewingSalon.services_preview.map((svc, i) => (
                          <span key={i} className="text-[14px] bg-[#25262b] text-white/90 px-4 py-2 rounded-xl border border-white/5 font-medium shadow-sm transition-colors hover:bg-white/10">{svc}</span>
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

content = content.replace(oldDialog, newDialog);
fs.writeFileSync('src/app/onboarding/join/page.js', content);

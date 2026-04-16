import fs from 'fs';

let content = fs.readFileSync('src/app/onboarding/join/page.js', 'utf8');

const oldImage = `              {/* Header/Cover Area */}
              <div className="h-56 w-full bg-muted relative">
                {viewingSalon.cover_image_url ? (
                  <img src={viewingSalon.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                ) : viewingSalon.logo_url ? (
                  <img src={viewingSalon.logo_url} alt="Cover Fallback" className="w-full h-full object-cover blur-sm opacity-50 scale-110" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>`;

const newImage = `              {/* Header/Cover Area */}
              <div className="h-56 w-full bg-muted relative">
                {viewingSalon.cover_image_url || (viewingSalon.gallery && viewingSalon.gallery.length > 0) ? (
                  <img src={viewingSalon.cover_image_url || (viewingSalon.gallery && viewingSalon.gallery[0]?.image_url)} alt="Cover" className="w-full h-full object-cover" />
                ) : viewingSalon.logo_url ? (
                  <img src={viewingSalon.logo_url} alt="Cover Fallback" className="w-full h-full object-cover blur-sm opacity-50 scale-110" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>`;

content = content.replace(oldImage, newImage);
fs.writeFileSync('src/app/onboarding/join/page.js', content);

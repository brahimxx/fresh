import { SalonMap } from "@/components/marketplace/salon-map";
import { MapPin } from "lucide-react";
export default function SalonLocation({ salon }) {
  if (!salon?.address) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-2 h-8 bg-primary rounded-full" />
          Location
        </h3>
        <p className="text-muted-foreground font-medium text-lg">
          {salon.address}, {salon.city}, {salon.state} {salon.postal_code}
        </p>
      </div>

      <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-border shadow-sm relative group cursor-pointer">
        <a 
          href={`https://maps.google.com/?q=${encodeURIComponent(`${salon.name} ${salon.address} ${salon.city}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-[5000] flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors duration-300"
          aria-label="Open in Google Maps"
        >
           <div className="opacity-0 group-hover:opacity-100 bg-background/95 backdrop-blur-md px-6 py-3 rounded-full font-bold shadow-lg transition-all duration-300 translate-y-4 group-hover:translate-y-0 flex items-center gap-2 text-foreground">
             <MapPin className="w-5 h-5" />
             View on Google Maps
           </div>
        </a>
        {/* We pass the salon in an array as required by the SalonMap component */}
        <SalonMap salons={[salon]} isStatic={true} />
      </div>
    </div>
  );
}

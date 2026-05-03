import { SalonMap } from "@/components/marketplace/salon-map";

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

      <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-border shadow-sm">
        {/* We pass the salon in an array as required by the SalonMap component */}
        <SalonMap salons={[salon]} />
      </div>
    </div>
  );
}

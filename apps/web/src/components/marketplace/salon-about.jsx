import { Card, CardContent } from "@/components/ui/card";
import { Check, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SalonAbout({ salon, staff }) {
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="grid gap-12 animate-in fade-in slide-in-from-bottom-4">
      {/* Description Section */}
      {salon.description && (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden p-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              Our Story
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl whitespace-pre-wrap">
              {salon.description}
            </p>
          </div>
        </Card>
      )}

      {/* Team Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold flex items-center gap-3 px-2">
          <div className="w-2 h-8 bg-primary rounded-full" />
          Meet the Team
        </h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {staff.map((member) => (
            <Card
              key={member.id}
              className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    <Avatar className="w-20 h-20 md:w-24 md:h-24 ring-4 ring-background shadow-lg transition-transform group-hover:scale-110">
                      <AvatarImage
                        src={member.avatar_url}
                        alt={member.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl font-bold bg-muted">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-background rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xl font-bold truncate group-hover:text-primary transition-colors">
                      {member.name}
                    </h4>
                    {member.title && (
                      <p className="text-sm font-medium text-primary mb-2 line-clamp-1">
                        {member.title}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{member.rating?.toFixed(1) || "5.0"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({member.review_count || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>
                {member.bio && (
                  <p className="text-sm text-muted-foreground mt-6 leading-relaxed bg-muted/30 p-4 rounded-2xl italic">
                    &quot;{member.bio}&quot;
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {(!staff || staff.length === 0) && (
            <div className="col-span-full text-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-muted-foreground font-medium">
                Team profiles coming soon
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Amenities Section */}
      {salon.amenities && salon.amenities.length > 0 && (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden p-8">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              Amenities
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {salon.amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-muted/40 p-4 rounded-2xl border border-transparent hover:border-primary/20 transition-colors group"
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="font-bold text-sm tracking-tight line-clamp-2">
                    {amenity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

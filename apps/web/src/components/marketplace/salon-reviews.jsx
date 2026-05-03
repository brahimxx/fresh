import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SalonReviews({ salon, reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/30 rounded-3xl border-2 border-dashed">
        <div className="text-4xl mb-3">⭐</div>
        <p className="text-muted-foreground font-medium">
          No reviews yet. Be the first to leave a review!
        </p>
      </div>
    );
  }

  // Calculate review distribution
  const starStats = [0, 0, 0, 0, 0, 0]; // 0-5
  reviews.forEach((r) => {
    const rating = Math.round(r.rating || 0);
    if (rating >= 1 && rating <= 5) {
      starStats[rating]++;
    }
  });
  
  const totalReviews = reviews.length;
  const starPercentages = starStats.map((count) =>
    totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Reviews Header & Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-none bg-primary/5 shadow-none rounded-3xl flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl font-black text-primary mb-2">
            {salon.rating?.toFixed(1) || "—"}
          </div>
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(salon.rating || 0)
                    ? "fill-yellow-400 text-yellow-400 stroke-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <p className="font-bold text-muted-foreground">
            Based on {salon.review_count || 0} reviews
          </p>
        </Card>

        <div className="md:col-span-2 space-y-4 flex flex-col justify-center">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-4">
              <span className="text-sm font-bold w-4">{rating}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${starPercentages[rating]}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground font-medium w-8 text-right">
                {starPercentages[rating]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Masonry/Grid Layout for Reviews */}
      <div className="grid sm:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <Card
            key={review.id}
            className="border-none shadow-sm rounded-[2rem] overflow-hidden break-inside-avoid"
          >
            <CardContent className="p-8">
              <div className="flex items-start gap-5">
                <Avatar className="w-12 h-12 rounded-2xl shadow-md shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {review.client_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-lg leading-none truncate">
                      {review.client_name || "Verified Client"}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400 stroke-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {review.comment && (
                    <p className="text-foreground leading-relaxed font-medium text-sm">
                      {review.comment}
                    </p>
                  )}
                  
                  {review.service_name && (
                    <div className="pt-2">
                      <Badge
                        variant="secondary"
                        className="bg-accent text-accent-foreground font-bold rounded-lg px-3 py-1 border-none text-[10px] truncate max-w-full"
                      >
                        {review.service_name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

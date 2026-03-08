import Link from 'next/link';
import { Star, MapPin, Scissors, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SalonCard({ salon, style, onMouseEnter, onMouseLeave }) {
    return (
        <Link
            href={`/salon/${salon.id}`}
            className="block h-full group"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Card
                className="overflow-hidden pt-0 h-full border-border/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1.5 rounded-2xl group/card"
                style={style}
            >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {salon.cover_image_url ? (
                        <img
                            src={salon.cover_image_url}
                            alt={salon.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-accent">
                            <Scissors className="h-12 w-12 text-primary/30" />
                        </div>
                    )}
                    {/* Image overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                    {/* Rating badge on image */}
                    {salon.rating && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-bold">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {Number(salon.rating).toFixed(1)}
                        </div>
                    )}

                    {/* Price level badge */}
                    {salon.price_level && (
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-bold">
                            {'$'.repeat(salon.price_level)}
                        </div>
                    )}

                    {/* Hover reveal arrow */}
                    <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-300 shadow-lg">
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
                <CardContent className="p-4 space-y-2">
                    <div>
                        <h3 className="font-bold text-base truncate group-hover/card:text-primary transition-colors">{salon.name}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{salon.category || 'Beauty & Wellness'}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate text-xs">{salon.city}{salon.state ? ', ' + salon.state : ''}</span>
                        </div>
                        {salon.review_count > 0 && (
                            <span className="text-xs text-muted-foreground font-medium">{salon.review_count} reviews</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

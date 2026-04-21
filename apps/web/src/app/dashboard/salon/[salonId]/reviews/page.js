'use client';

import { use, useState } from 'react';
import { format } from 'date-fns';
import { Star, MessageSquare, Filter, ChevronDown, Award, TrendingUp, Sparkles, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviews, useReviewStats, useReplyToReview } from '@/hooks/use-reviews';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

function StarRating({ rating, size = 'sm' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClasses[size], 
            "transition-colors duration-300",
            star <= rating
              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
              : 'text-muted-foreground/20 fill-muted/20'
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review, onReplySuccess }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const replyMutation = useReplyToReview();

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        reviewId: review.id,
        reply: replyText,
      });
      setIsReplying(false);
      setReplyText('');
      onReplySuccess?.();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  };

  const clientName = `${review.client.firstName} ${review.client.lastName}`;
  const initials = `${review.client.firstName?.[0] || ''}${review.client.lastName?.[0] || ''}`;

  return (
    <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 transition-colors hover:bg-background/80 relative overflow-hidden group">
      {review.rating >= 4 && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-bl-[100px] pointer-events-none transition-transform duration-700 group-hover:scale-110" />
      )}
      
      <div className="flex flex-col items-center sm:items-start gap-4 md:w-48 shrink-0">
        <Avatar className="h-16 w-16 border-2 border-background shadow-lg ring-2 ring-primary/10">
          <AvatarImage src={review.client.avatar} alt={clientName} />
          <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <p className="font-extrabold text-[15px]">{clientName}</p>
          <p className="text-[12px] font-semibold text-muted-foreground mt-0.5">
            {format(new Date(review.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
        {review.status !== 'approved' && (
          <Badge variant="outline" className="uppercase tracking-wider text-[10px] bg-muted/40 font-bold border-border/50 text-muted-foreground px-2 py-0.5">
            {review.status}
          </Badge>
        )}
      </div>
      
      <div className="flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-background px-3 py-1.5 rounded-full border border-border/50 shadow-sm flex items-center gap-2">
              <span className="font-extrabold text-[14px] text-foreground">{review.rating.toFixed(1)}</span>
              <StarRating rating={review.rating} />
            </div>
            {review.service && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
                 <Sparkles className="w-3.5 h-3.5 text-primary" />
                 <span className="text-[13px] font-bold text-muted-foreground">
                   {review.service} 
                   {review.staff && <span className="opacity-60 font-semibold"> via {review.staff.firstName}</span>}
                 </span>
              </div>
            )}
          </div>
          
          {review.comment ? (
            <p className="text-[15px] leading-relaxed text-foreground/90 font-medium">"{review.comment}"</p>
          ) : (
            <p className="text-[15px] italic text-muted-foreground/60">No context provided.</p>
          )}
        </div>

        <div className="mt-6">
          {review.ownerReply ? (
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 relative">
              <div className="absolute -left-2 -top-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center border border-background">
                 <MessageCircle className="h-3 w-3 text-primary" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-primary uppercase tracking-wider">Management Response</span>
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {format(new Date(review.ownerReplyAt), 'MMM d, yyyy')}
                </span>
              </div>
              <p className="text-[14px] font-medium text-foreground/80 leading-relaxed">{review.ownerReply}</p>
            </div>
          ) : (
            <div>
              <AnimatePresence>
                {isReplying ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden bg-muted/20 border border-border/50 rounded-2xl p-4"
                  >
                    <Textarea
                      placeholder="Draft a professional response..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="bg-background border-border/50 rounded-xl resize-none shadow-inner"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl font-bold text-[12px] uppercase tracking-wider text-muted-foreground hover:bg-muted"
                        onClick={() => {
                          setIsReplying(false);
                          setReplyText('');
                        }}
                      >
                        Abort
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl font-bold text-[12px] uppercase tracking-wider shadow-md"
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim() || replyMutation.isPending}
                      >
                        {replyMutation.isPending ? 'Publishing...' : 'Publish Response'}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-border/50 bg-background/50 backdrop-blur font-bold text-[12px] uppercase tracking-wider hover:bg-muted/50 transition-colors"
                    onClick={() => setIsReplying(true)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-2 opacity-70" />
                    Draft Response
                  </Button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ReviewsPage({ params }) {
  const resolvedParams = use(params);
  const salonId = resolvedParams.salonId;
  
  const [filterRating, setFilterRating] = useState('all');
  const [filterStatus, setFilterStatus] = useState('approved');

  const filters = {
    ...(filterRating !== 'all' && { rating: filterRating }),
    ...(filterStatus && { status: filterStatus }),
  };

  const { data: stats, isLoading: statsLoading } = useReviewStats(salonId);
  const { data, isLoading, refetch } = useReviews(salonId, filters);

  const reviews = data?.reviews || [];
  const distribution = stats?.distribution || {};

  return (
    <div className="space-y-8">
      {/* Decorative Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-background to-transparent border border-amber-500/10 p-8 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 group"
      >
        <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:scale-125 group-hover:rotate-12 translate-y-[-20%]">
          <Award className="w-64 h-64 text-amber-500" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reputation Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
            Client Reviews
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">
            Monitor public perception, respond to feedback, and manage your global rating on the marketplace.
          </p>
        </div>
      </motion.div>

      {/* Analytics Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statsLoading ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))
          ) : (
            <>
              <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500 flex flex-col justify-between">
                <div className="absolute -right-6 -top-6 text-amber-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
                  <Star className="w-32 h-32" strokeWidth={1} />
                </div>
                <div className="flex flex-row items-center justify-between space-y-0 relative z-10">
                   <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Global Rating</h3>
                   <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Star className="h-4 w-4 text-amber-500" />
                   </div>
                </div>
                <div className="relative z-10 mt-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-5xl font-extrabold tracking-tight">{Number(stats?.averageRating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-center mt-3">
                    <StarRating rating={Math.round(stats?.averageRating || 0)} size="md" />
                  </div>
                  <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mt-4">
                    Based on {stats?.totalReviews || 0} reviews
                  </p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500 flex flex-col justify-between">
                <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
                  <TrendingUp className="w-32 h-32" strokeWidth={1} />
                </div>
                <div className="flex flex-row items-center justify-between space-y-0 relative z-10">
                   <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Velocity</h3>
                   <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                   </div>
                </div>
                <div className="relative z-10 mt-4">
                  <p className="text-4xl font-extrabold tracking-tight">{stats?.thisMonth || 0}</p>
                  <p className="text-[13px] font-semibold text-muted-foreground mt-2">New reviews mapped over the last 30 days.</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative group hover:bg-background transition-colors duration-500 flex flex-col justify-between">
                <div className="absolute -right-6 -top-6 text-blue-500/5 transition-transform duration-700 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
                  <MessageSquare className="w-32 h-32" strokeWidth={1} />
                </div>
                <div className="flex flex-row items-center justify-between space-y-0 relative z-10">
                   <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Engagement</h3>
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                   </div>
                </div>
                <div className="relative z-10 mt-4">
                  <p className="text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">{stats?.responseRate || 0}%</p>
                  <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${stats?.responseRate || 0}%` }}></div>
                  </div>
                  <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mt-3">
                    {stats?.repliedCount || 0} of {stats?.totalReviews || 0} replied
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="lg:col-span-1">
          {statsLoading ? (
            <Skeleton className="h-full rounded-3xl" />
          ) : (
            <motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.3 }} className="h-full bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden flex flex-col">
              <h3 className="text-lg font-bold mb-6">Rating Matrix</h3>
              <div className="space-y-4 flex-grow flex flex-col justify-center">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = distribution[rating] || 0;
                  const percentage = stats?.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0;
                  
                  return (
                    <div key={rating} className="flex items-center gap-4 group">
                      <div className="flex items-center gap-1.5 w-8 font-bold text-[14px]">
                        <span>{rating}</span>
                        <Star className="h-3.5 w-3.5 fill-muted-foreground text-muted-foreground transition-colors group-hover:fill-amber-400 group-hover:text-amber-400" />
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2 flex-grow bg-muted/40"
                        indicatorClassName={
                          rating >= 4 ? "bg-emerald-500" : 
                          rating === 3 ? "bg-amber-500" : "bg-red-500"
                        }
                      />
                      <span className="text-[13px] font-bold text-muted-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Feed Area */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Filter Bar */}
        <div className="py-4 border-b border-border/50 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">Client Feed</h2>
          <div className="flex gap-3">
             <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-36 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <Filter className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-xl">
                <SelectItem value="all" className="font-semibold rounded-lg">All Ratings</SelectItem>
                <SelectItem value="5" className="font-semibold rounded-lg flex items-center"><span className="flex gap-1">5 Stars</span></SelectItem>
                <SelectItem value="4" className="font-semibold rounded-lg">4 Stars</SelectItem>
                <SelectItem value="3" className="font-semibold rounded-lg">3 Stars</SelectItem>
                <SelectItem value="2" className="font-semibold rounded-lg">2 Stars</SelectItem>
                <SelectItem value="1" className="font-semibold rounded-lg">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-11 bg-background rounded-xl border-border/50 shadow-sm font-semibold text-[13px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-xl">
                <SelectItem value="approved" className="font-semibold rounded-lg text-emerald-600">Approved</SelectItem>
                <SelectItem value="pending" className="font-semibold rounded-lg text-amber-600">Pending</SelectItem>
                <SelectItem value="flagged" className="font-semibold rounded-lg text-red-600">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6 pt-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" />
            ))
          ) : reviews.length > 0 ? (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onReplySuccess={refetch}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-xl border border-dashed border-border/50 rounded-3xl p-16 text-center">
              <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xl font-bold tracking-tight mb-2">No Reviews Found</p>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                {filterRating !== 'all' || filterStatus !== 'approved'
                  ? 'Try relaxing your filter parameters to see more feedback.'
                  : 'As your clients drop glowing feedback, their cards will aggregate here.'}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

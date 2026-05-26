'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  Flag, 
  MoreHorizontal,
  Send,
  Filter,
  TrendingUp,
  Info,
  CornerDownRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ReviewsPage() {
  var params = useParams();
  var { toast } = useToast();
  var queryClient = useQueryClient();
  
  var [filter, setFilter] = useState('all');
  var [replyingTo, setReplyingTo] = useState(null);
  var [replyText, setReplyText] = useState('');
  
  // Fetch reviews
  var { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', params.salonId, filter],
    queryFn: async function() {
      var url = '/api/reviews?salonId=' + params.salonId;
      if (filter !== 'all') {
        url += '&rating=' + filter;
      }
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
  });
  
  // Reply to review
  var replyMutation = useMutation({
    mutationFn: async function({ reviewId, reply }) {
      var res = await fetch('/api/reviews/' + reviewId + '/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply }),
      });
      if (!res.ok) throw new Error('Failed to reply');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: ['reviews', params.salonId] });
      setReplyingTo(null);
      setReplyText('');
      toast({ title: 'Reply sent' });
    },
    onError: function(error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
  
  // Report review
  var reportMutation = useMutation({
    mutationFn: async function(reviewId) {
      var res = await fetch('/api/reviews/' + reviewId + '/report', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to report');
      return res.json();
    },
    onSuccess: function() {
      toast({ title: 'Review reported', description: 'We will review this feedback' });
    },
  });
  
  function handleReply(reviewId) {
    if (!replyText.trim()) return;
    replyMutation.mutate({ reviewId: reviewId, reply: replyText });
  }
  
  function renderStars(rating) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(function(star) {
          return (
            <Star
              key={star}
              className={cn('h-4 w-4', star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-muted/30')}
            />
          );
        })}
      </div>
    );
  }
  
  // Mock stats
  var stats = {
    averageRating: 4.7,
    totalReviews: 156,
    distribution: { 5: 98, 4: 35, 3: 15, 2: 5, 1: 3 },
    responseRate: 85,
    avgResponseTime: '2 hours',
  };
  
  // Mock reviews if API not available
  var reviews = reviewsData?.data || [
    {
      id: 1,
      client_name: 'Sarah M.',
      rating: 5,
      comment: 'Amazing experience! The stylist really understood what I wanted and the result exceeded my expectations. Will definitely come back!',
      service: 'Balayage',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      reply: null,
    },
    {
      id: 2,
      client_name: 'John D.',
      rating: 4,
      comment: 'Great haircut, friendly staff. Only minor issue was the wait time was a bit longer than expected.',
      service: 'Men\'s Haircut',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reply: 'Thank you for your feedback, John! We\'re working on reducing wait times. Looking forward to seeing you again soon!',
      reply_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      client_name: 'Emily R.',
      rating: 5,
      comment: 'Best salon in the area! Love the atmosphere and the team is so talented.',
      service: 'Hair Treatment',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reply: null,
    },
  ];
  
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 w-full bg-muted/60 rounded-3xl" />
        <div className="grid grid-cols-4 gap-4">
           <div className="h-32 bg-muted/40 rounded-3xl" />
           <div className="h-32 bg-muted/40 rounded-3xl" />
           <div className="h-32 bg-muted/40 rounded-3xl" />
           <div className="h-32 bg-muted/40 rounded-3xl" />
        </div>
        <div className="h-64 bg-muted/40 rounded-3xl" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };
  
  return (
    <div className="space-y-8 p-6 sm:p-8">
      {/* Decorative Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 sm:p-10 group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <Star className="w-48 h-48 sm:w-64 sm:h-64 text-primary" strokeWidth={1} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/20 text-xs font-semibold text-primary w-fit">
            <Info className="w-3.5 h-3.5" />
            <span>Reputation Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Client Reviews</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Monitor feedback, respond to clients, and track your overall marketplace reputation in real-time.
          </p>
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center group hover:bg-background transition-colors">
            <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            </div>
            <div className="text-3xl font-extrabold tracking-tighter">{stats.averageRating}</div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Rating</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center group hover:bg-background transition-colors">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6 fill-blue-500 text-blue-500" />
            </div>
            <div className="text-3xl font-extrabold tracking-tighter">{stats.totalReviews}</div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Total Verified</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center group hover:bg-background transition-colors">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ThumbsUp className="w-6 h-6 fill-emerald-500 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold tracking-tighter">{stats.responseRate}%</div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Response Rate</p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center group hover:bg-background transition-colors">
             <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div className="text-3xl font-extrabold tracking-tighter">{stats.avgResponseTime}</div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Action Time</p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Distribution Column */}
          <div className="lg:col-span-4">
             <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm h-full">
              <h2 className="text-xl font-bold tracking-tight mb-1">Rating Distribution</h2>
              <p className="text-sm text-muted-foreground mb-8">Breakdown of all your scores</p>
              
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map(function(rating, idx) {
                  var count = stats.distribution[rating] || 0;
                  var percentage = (count / stats.totalReviews) * 100 || 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="w-4 font-bold text-sm text-right">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                      <div className="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                          className="h-full bg-yellow-400 rounded-full"
                        />
                      </div>
                      <span className="w-8 text-sm font-semibold text-muted-foreground text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Feed Column */}
          <div className="lg:col-span-8">
            <motion.div variants={itemVariants} className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 sm:px-8 sm:pt-8 bg-muted/5 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Review Inbox</h2>
                  <p className="text-sm text-muted-foreground">Respond to latest feedback</p>
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background rounded-xl border-border/50 font-medium">
                    <Filter className="h-4 w-4 mr-2 opacity-50" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All ratings</SelectItem>
                    <SelectItem value="5">5 stars</SelectItem>
                    <SelectItem value="4">4 stars</SelectItem>
                    <SelectItem value="3">3 stars</SelectItem>
                    <SelectItem value="2">2 stars</SelectItem>
                    <SelectItem value="1">1 star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="divide-y divide-border/50">
                <AnimatePresence mode="popLayout">
                  {reviews.map(function(review) {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key={review.id} 
                        className="p-6 sm:p-8 hover:bg-muted/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold font-mono">
                                {review.client_name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[15px]">{review.client_name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {renderStars(review.rating)}
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {format(new Date(review.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <div className="mt-1.5">
                                <Badge variant="secondary" className="text-[10px] bg-muted uppercase tracking-wider font-bold">
                                  {review.service}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 opacity-50 hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl min-w-[150px]">
                              {!review.reply && (
                                <DropdownMenuItem onClick={function() { setReplyingTo(review.id); }} className="gap-2 cursor-pointer font-medium">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  Reply
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={function() { reportMutation.mutate(review.id); }}
                                className="text-red-500 focus:text-red-600 gap-2 cursor-pointer font-medium"
                              >
                                <Flag className="h-4 w-4" />
                                Report Review
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">
                          "{review.comment}"
                        </p>
                        
                        {/* Existing Reply */}
                        {review.reply && (
                          <div className="mt-5 ml-6 sm:ml-16 p-4 bg-primary/5 border border-primary/10 rounded-2xl relative">
                            <CornerDownRight className="absolute -left-6 top-4 w-4 h-4 text-primary/40 hidden sm:block" />
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="text-[10px] bg-primary text-primary-foreground uppercase tracking-wider font-bold">Owner</Badge>
                              <span className="text-xs font-semibold text-muted-foreground">{format(new Date(review.reply_date), 'MMM d, yyyy')}</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{review.reply}</p>
                          </div>
                        )}
                        
                        {/* Reply Form */}
                        <AnimatePresence>
                          {replyingTo === review.id && !review.reply && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="ml-0 sm:ml-16 overflow-hidden"
                            >
                              <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl relative">
                                <CornerDownRight className="absolute -left-6 top-4 w-4 h-4 text-muted-foreground/40 hidden sm:block" />
                                <Textarea
                                  value={replyText}
                                  onChange={function(e) { setReplyText(e.target.value); }}
                                  placeholder="Write a professional, public response..."
                                  className="bg-background rounded-xl border-border/50 focus-visible:ring-primary/50 min-h-[100px] text-sm"
                                />
                                <div className="flex gap-2 justify-end mt-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={function() { setReplyingTo(null); setReplyText(''); }}
                                    className="font-semibold rounded-lg"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={function() { handleReply(review.id); }}
                                    disabled={replyMutation.isPending || !replyText.trim()}
                                    className="rounded-lg font-semibold gap-1.5 shadow-sm"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Post Reply
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Inline Reply Trigger */}
                        {!review.reply && replyingTo !== review.id && (
                          <div className="mt-4 ml-0 sm:ml-16">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10 rounded-lg gap-1.5 font-bold h-8 px-3"
                              onClick={function() { setReplyingTo(review.id); }}
                            >
                              <MessageSquare className="h-3.5 w-3.5 fill-primary/20" />
                              Write Reply
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {reviews.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <p className="font-bold text-lg">No reviews found</p>
                    <p className="text-sm text-muted-foreground max-w-[250px] mt-1">Verified reviews will appear here once clients start leaving feedback.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

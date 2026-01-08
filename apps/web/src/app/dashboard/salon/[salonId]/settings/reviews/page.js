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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
              className={'h-4 w-4 ' + (star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300')}
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
      reply: 'Thank you for your feedback, John! We\'re working on reducing wait times.',
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(function(i) {
              return <div key={i} className="h-24 bg-muted rounded-lg" />;
            })}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          Manage and respond to client reviews
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold">{stats.averageRating}</div>
                <p className="text-xs text-muted-foreground">Average rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalReviews}</div>
                <p className="text-xs text-muted-foreground">Total reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.responseRate}%</div>
                <p className="text-xs text-muted-foreground">Response rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
                <p className="text-xs text-muted-foreground">Avg. response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(function(rating) {
              var count = stats.distribution[rating];
              var percentage = (count / stats.totalReviews) * 100;
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-3 text-sm">{rating}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: percentage + '%' }}
                    />
                  </div>
                  <span className="w-12 text-sm text-muted-foreground text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Reviews List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Reviews</CardTitle>
              <CardDescription>Respond to reviews to show you care</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5">5 stars</SelectItem>
                <SelectItem value="4">4 stars</SelectItem>
                <SelectItem value="3">3 stars</SelectItem>
                <SelectItem value="2">2 stars</SelectItem>
                <SelectItem value="1">1 star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reviews.map(function(review) {
              return (
                <div key={review.id} className="border-b pb-6 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {review.client_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.client_name}</span>
                          {renderStars(review.rating)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {review.service}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={function() { setReplyingTo(review.id); }}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={function() { reportMutation.mutate(review.id); }}
                          className="text-red-600"
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <p className="mt-3 text-sm">{review.comment}</p>
                  
                  {/* Existing Reply */}
                  {review.reply && (
                    <div className="mt-3 ml-6 p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Badge variant="outline" className="text-xs">Owner</Badge>
                        <span>{format(new Date(review.reply_date), 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-sm">{review.reply}</p>
                    </div>
                  )}
                  
                  {/* Reply Form */}
                  {replyingTo === review.id && !review.reply && (
                    <div className="mt-3 ml-6 space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={function(e) { setReplyText(e.target.value); }}
                        placeholder="Write a professional response..."
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={function() { setReplyingTo(null); setReplyText(''); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={function() { handleReply(review.id); }}
                          disabled={replyMutation.isPending || !replyText.trim()}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send Reply
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Reply Button */}
                  {!review.reply && replyingTo !== review.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 ml-6"
                      onClick={function() { setReplyingTo(review.id); }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  )}
                </div>
              );
            })}
            
            {reviews.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reviews yet</p>
                <p className="text-sm">Reviews will appear here as clients leave feedback</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

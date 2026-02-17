'use client';

import { use, useState } from 'react';
import { format } from 'date-fns';
import { Star, MessageSquare, Filter, ChevronDown } from 'lucide-react';
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

function StarRating({ rating, size = 'sm' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src={review.client.avatar} alt={clientName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{clientName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={review.rating} />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(review.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              {review.status !== 'approved' && (
                <Badge variant="outline">{review.status}</Badge>
              )}
            </div>

            {review.service && (
              <p className="text-sm text-muted-foreground">
                Service: {review.service}
                {review.staff && ` • ${review.staff.firstName} ${review.staff.lastName}`}
              </p>
            )}

            {review.comment && (
              <p className="text-sm">{review.comment}</p>
            )}

            {review.ownerReply ? (
              <div className="bg-muted/50 rounded-lg p-4 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Your Reply</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.ownerReplyAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm">{review.ownerReply}</p>
              </div>
            ) : (
              <div className="mt-3">
                {isReplying ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim() || replyMutation.isPending}
                      >
                        {replyMutation.isPending ? 'Submitting...' : 'Submit Reply'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsReplying(false);
                          setReplyText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsReplying(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">Manage your salon reviews and ratings</p>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{stats?.averageRating || 0}</div>
                <StarRating rating={Math.round(stats?.averageRating || 0)} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {stats?.totalReviews || 0} reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.thisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">New reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.responseRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.repliedCount || 0} of {stats?.totalReviews || 0} replied to
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {!statsLoading && stats && (
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = distribution[rating] || 0;
                const percentage = stats.totalReviews > 0
                  ? (count / stats.totalReviews) * 100
                  : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-20">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <Progress value={percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReplySuccess={refetch}
            />
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-muted-foreground">No reviews found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {filterRating !== 'all' || filterStatus !== 'approved'
                  ? 'Try adjusting your filters'
                  : 'Reviews from your clients will appear here'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

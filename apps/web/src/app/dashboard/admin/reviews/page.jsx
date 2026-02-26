'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Star, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AdminReviewsPage() {
    const [ratingFilter, setRatingFilter] = useState('all');
    const [page, setPage] = useState(1);
    const limit = 20;
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // The backend supports minRating/maxRating. We'll map exact ratings or ranges.
    const queryParams = { page, limit };
    if (ratingFilter !== 'all') {
        if (ratingFilter === 'high') {
            queryParams.minRating = 4;
            queryParams.maxRating = 5;
        } else if (ratingFilter === 'low') {
            queryParams.minRating = 1;
            queryParams.maxRating = 3;
        } else {
            queryParams.minRating = parseInt(ratingFilter);
            queryParams.maxRating = parseInt(ratingFilter);
        }
    }

    const { data, isLoading } = useQuery({
        queryKey: ['admin-reviews', ratingFilter, page],
        queryFn: () => api.get('/admin/reviews', queryParams),
    });

    const deleteReviewMutation = useMutation({
        mutationFn: (reviewId) => api.delete(`/admin/reviews/${reviewId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
            toast({
                title: 'Review deleted',
                description: 'The review has been permanently removed.',
            });
        },
        onError: (err) => {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to delete review',
            });
        },
    });

    const reviews = data?.data?.reviews ?? [];
    const pagination = data?.data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

    const renderStars = (rating) => {
        return (
            <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                        key={i}
                        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                            }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/admin">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Star className="h-6 w-6 text-primary" />
                        Review Moderation
                    </h1>
                    <p className="text-muted-foreground">
                        {pagination.total} total reviews
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select
                            value={ratingFilter}
                            onValueChange={(v) => {
                                setRatingFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by rating" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ratings</SelectItem>
                                <SelectItem value="high">Positive (4-5 Stars)</SelectItem>
                                <SelectItem value="low">Critical (1-3 Stars)</SelectItem>
                                <SelectItem value="5">5 Stars Only</SelectItem>
                                <SelectItem value="1">1 Star Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Rating</TableHead>
                                <TableHead>Comment</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Salon</TableHead>
                                <TableHead className="w-[140px]">Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : reviews.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No reviews found matching your filter
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reviews.map((review) => (
                                    <TableRow key={review.id}>
                                        <TableCell>
                                            {renderStars(review.rating)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-md line-clamp-2 text-sm">
                                                {review.comment || (
                                                    <span className="text-muted-foreground italic">No comment provided</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{review.clientName}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                {review.clientEmail}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{review.salonName}</div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                onClick={() => {
                                                    if (window.confirm("Are you sure you want to permanently delete this review?")) {
                                                        deleteReviewMutation.mutate(review.id);
                                                    }
                                                }}
                                                disabled={deleteReviewMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 min-w-[16px]" />
                                                <span className="sr-only">Delete Review</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

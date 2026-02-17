'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

// Query keys
export const reviewKeys = {
  all: ['reviews'],
  lists: () => [...reviewKeys.all, 'list'],
  list: (salonId, filters) => [...reviewKeys.lists(), salonId, filters],
  stats: (salonId) => [...reviewKeys.all, 'stats', salonId],
};

// Fetch reviews
export function useReviews(salonId, filters = {}) {
  return useQuery({
    queryKey: reviewKeys.list(salonId, filters),
    queryFn: async () => {
      const params = { salon_id: salonId, ...filters };
      const response = await api.get('/reviews', params);
      return response.data;
    },
    enabled: !!salonId,
  });
}

// Fetch review stats
export function useReviewStats(salonId) {
  return useQuery({
    queryKey: reviewKeys.stats(salonId),
    queryFn: async () => {
      const response = await api.get('/reviews/stats', { salon_id: salonId });
      return response.data;
    },
    enabled: !!salonId,
  });
}

// Add reply to review
export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, reply }) => {
      const response = await api.post(`/reviews/${reviewId}/reply`, { reply });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

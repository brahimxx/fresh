'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';

// ─── Profile ───────────────────────────────────────────────────────────────
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const json = await res.json();
      return json.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update profile');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });
}

// ─── Bookings ──────────────────────────────────────────────────────────────
export function useUpcomingBookings(limit = 10) {
  return useQuery({
    queryKey: ['my-bookings-upcoming', limit],
    queryFn: async () => {
      const res = await fetch(`/api/my/bookings/upcoming?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const json = await res.json();
      return json.data?.bookings || [];
    },
  });
}

export function usePastBookings(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['my-bookings-past', page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/my/bookings/past?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch past bookings');
      const json = await res.json();
      return json.data || { bookings: [], pagination: {} };
    },
  });
}

// ─── Packages ──────────────────────────────────────────────────────────────
export function useMyPackages(userId) {
  return useQuery({
    queryKey: ['my-packages', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/packages`);
      if (!res.ok) throw new Error('Failed to fetch packages');
      const json = await res.json();
      return json.data?.packages || [];
    },
    enabled: !!userId,
  });
}

// ─── Gift Cards ────────────────────────────────────────────────────────────
export function useMyGiftCards(userId) {
  return useQuery({
    queryKey: ['my-gift-cards', userId],
    queryFn: async () => {
      const res = await fetch(`/api/gift-cards?purchased_by=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch gift cards');
      const json = await res.json();
      return json.data?.data || [];
    },
    enabled: !!userId,
  });
}

// ─── Reviews ───────────────────────────────────────────────────────────────
export function useMyReviews(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['my-reviews', page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/my/reviews?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const json = await res.json();
      return json.data || { reviews: [], pagination: {} };
    },
  });
}


// ─── Addresses ─────────────────────────────────────────────────────────────
export function useMyAddresses() {
  return useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await fetch('/api/user/addresses');
      if (!res.ok) throw new Error('Failed to fetch addresses');
      const json = await res.json();
      return json.data?.addresses || [];
    },
  });
}

export function useAddAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to add address');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete address');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
  });
}

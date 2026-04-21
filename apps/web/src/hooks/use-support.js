'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

export const supportKeys = {
  all: ['support-tickets'],
  lists: () => [...supportKeys.all, 'list'],
  list: (filters) => [...supportKeys.lists(), { filters }],
  details: () => [...supportKeys.all, 'detail'],
  detail: (id) => [...supportKeys.details(), id],
};

// Fetch user support tickets
export function useSupportTickets(filters = {}) {
  return useQuery({
    queryKey: supportKeys.list(filters),
    queryFn: async () => {
      // The API naturally filters by the session's user_id backend-side
      const response = await api.get('/support', filters);
      return response.data;
    },
  });
}

// Fetch single ticket detail
export function useSupportTicket(ticketId) {
  return useQuery({
    queryKey: supportKeys.detail(ticketId),
    queryFn: async () => {
      const response = await api.get(`/support/${ticketId}`);
      return response.data;
    },
    enabled: !!ticketId,
  });
}

// Create a new support ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/support', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}

// Update/close a ticket
export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, data }) => {
      const response = await api.put(`/support/${ticketId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.detail(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export var notificationKeys = {
  all: ['notifications'],
  list: function(params) { return ['notifications', 'list', params]; },
  unreadCount: function() { return ['notifications', 'unread-count']; },
};

// Fetch notifications
export function useNotifications(options) {
  var page = options?.page || 1;
  var limit = options?.limit || 20;

  return useQuery({
    queryKey: notificationKeys.list({ page, limit }),
    queryFn: function() {
      return api.get('/notifications?page=' + page + '&limit=' + limit);
    },
    select: function(response) {
      var d = response?.data || response;
      return {
        notifications: d?.notifications || [],
        unreadCount: d?.unreadCount || 0,
        pagination: d?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

// Mark notifications as read
export function useMarkNotificationsRead() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function(notificationIds) {
      return api.post('/notifications/read', {
        notificationIds: notificationIds || [],
      });
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Delete notifications
export function useDeleteNotifications() {
  var queryClient = useQueryClient();

  return useMutation({
    mutationFn: function(notificationIds) {
      return api.delete('/notifications', { notificationIds: notificationIds });
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

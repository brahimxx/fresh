'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export var waitlistKeys = {
  all: ['waitlist'],
  lists: function() { return [...waitlistKeys.all, 'list']; },
  list: function(salonId, filters) { return [...waitlistKeys.lists(), salonId, filters]; },
  details: function() { return [...waitlistKeys.all, 'detail']; },
  detail: function(salonId, id) { return [...waitlistKeys.details(), salonId, id]; },
};

// Waitlist statuses
export var WAITLIST_STATUSES = {
  waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800' },
  notified: { label: 'Notified', color: 'bg-blue-100 text-blue-800' },
  booked: { label: 'Booked', color: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

// Priority levels
export var PRIORITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// List waitlist entries
export function useWaitlist(salonId, filters) {
  if (filters === undefined) filters = {};
  
  return useQuery({
    queryKey: waitlistKeys.list(salonId, filters),
    queryFn: async function() {
      var params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.service_id) params.append('service_id', filters.service_id);
      if (filters.staff_id) params.append('staff_id', filters.staff_id);
      
      var url = '/api/waitlist?salon_id=' + salonId;
      if (params.toString()) url += '&' + params.toString();
      
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch waitlist');
      var json = await res.json();
      return json.data || [];
    },
    enabled: !!salonId,
  });
}

// Get single waitlist entry
export function useWaitlistEntry(salonId, waitlistId) {
  return useQuery({
    queryKey: waitlistKeys.detail(salonId, waitlistId),
    queryFn: async function() {
      var res = await fetch('/api/waitlist/' + waitlistId);
      if (!res.ok) throw new Error('Failed to fetch waitlist entry');
      var json = await res.json();
      return json.data;
    },
    enabled: !!salonId && !!waitlistId,
  });
}

// Add to waitlist
export function useAddToWaitlist() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(data) {
      var res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to add to waitlist');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.lists() });
    },
  });
}

// Update waitlist entry
export function useUpdateWaitlist() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var waitlistId = params.waitlistId;
      var data = params.data;
      
      var res = await fetch('/api/waitlist/' + waitlistId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to update waitlist');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

// Remove from waitlist
export function useRemoveFromWaitlist() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(waitlistId) {
      var res = await fetch('/api/waitlist/' + waitlistId, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove from waitlist');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.lists() });
    },
  });
}

// Notify client on waitlist
export function useNotifyWaitlist() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var waitlistId = params.waitlistId;
      var availableSlots = params.availableSlots;
      
      var res = await fetch('/api/waitlist/' + waitlistId + '/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available_slots: availableSlots }),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to notify client');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

// Convert waitlist to booking
export function useConvertWaitlistToBooking() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var waitlistId = params.waitlistId;
      var bookingData = params.bookingData;
      
      var res = await fetch('/api/waitlist/' + waitlistId + '/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to convert to booking');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys factory
export var campaignKeys = {
  all: ['campaigns'],
  lists: function() { return [...campaignKeys.all, 'list']; },
  list: function(salonId, filters) { return [...campaignKeys.lists(), salonId, filters]; },
  details: function() { return [...campaignKeys.all, 'detail']; },
  detail: function(salonId, id) { return [...campaignKeys.details(), salonId, id]; },
};

// Campaign types
export var CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'sms', label: 'SMS', icon: 'MessageSquare' },
];

// Campaign statuses
export var CAMPAIGN_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  sending: { label: 'Sending', color: 'bg-yellow-100 text-yellow-800' },
  sent: { label: 'Sent', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
};

// Audience types
export var AUDIENCE_TYPES = [
  { value: 'all', label: 'All Clients' },
  { value: 'active', label: 'Active Clients (visited in last 90 days)' },
  { value: 'inactive', label: 'Inactive Clients (no visit in 90+ days)' },
  { value: 'new', label: 'New Clients (first visit in last 30 days)' },
  { value: 'loyal', label: 'Loyal Clients (5+ visits)' },
  { value: 'birthday', label: 'Birthday This Month' },
  { value: 'custom', label: 'Custom Selection' },
];

// List campaigns
export function useCampaigns(salonId, filters) {
  if (filters === undefined) filters = {};
  
  return useQuery({
    queryKey: campaignKeys.list(salonId, filters),
    queryFn: async function() {
      var params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      
      var url = '/api/campaigns?salon_id=' + salonId;
      if (params.toString()) url += '&' + params.toString();
      
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      var json = await res.json();
      return json.data || [];
    },
    enabled: !!salonId,
  });
}

// Get single campaign
export function useCampaign(salonId, campaignId) {
  return useQuery({
    queryKey: campaignKeys.detail(salonId, campaignId),
    queryFn: async function() {
      var res = await fetch('/api/campaigns/' + campaignId);
      if (!res.ok) throw new Error('Failed to fetch campaign');
      var json = await res.json();
      return json.data;
    },
    enabled: !!salonId && !!campaignId,
  });
}

// Create campaign
export function useCreateCampaign() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(data) {
      var res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to create campaign');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// Update campaign
export function useUpdateCampaign() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var campaignId = params.campaignId;
      var data = params.data;
      
      var res = await fetch('/api/campaigns/' + campaignId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to update campaign');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// Delete campaign
export function useDeleteCampaign() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(campaignId) {
      var res = await fetch('/api/campaigns/' + campaignId, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete campaign');
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// Send campaign
export function useSendCampaign() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(campaignId) {
      var res = await fetch('/api/campaigns/' + campaignId + '/send', {
        method: 'POST',
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to send campaign');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// Schedule campaign
export function useScheduleCampaign() {
  var queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async function(params) {
      var campaignId = params.campaignId;
      var scheduledAt = params.scheduledAt;
      
      var res = await fetch('/api/campaigns/' + campaignId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'scheduled',
          scheduled_at: scheduledAt,
        }),
      });
      if (!res.ok) {
        var error = await res.json();
        throw new Error(error.message || 'Failed to schedule campaign');
      }
      return res.json();
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

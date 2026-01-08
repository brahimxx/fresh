import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { toast } from 'sonner';

export var staffKeys = {
  all: ['staff'],
  lists: function() { return [...staffKeys.all, 'list']; },
  list: function(salonId) { return [...staffKeys.lists(), salonId]; },
  detail: function(id) { return [...staffKeys.all, 'detail', id]; },
  schedule: function(id) { return [...staffKeys.all, 'schedule', id]; },
  availability: function(salonId, date, serviceId) { return [...staffKeys.all, 'availability', salonId, date, serviceId]; },
};

// ============ STAFF QUERIES ============

export function useStaff(salonId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: staffKeys.list(salonId),
    queryFn: function() { return api.get('/salons/' + salonId + '/staff'); },
    enabled: !!salonId,
    select: function(response) { return response.data?.staff || []; },
    ...options,
  });
}

export function useStaffMember(staffId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: staffKeys.detail(staffId),
    queryFn: function() { return api.get('/staff/' + staffId); },
    enabled: !!staffId,
    select: function(response) { return response.data; },
    ...options,
  });
}

export function useStaffSchedule(staffId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: staffKeys.schedule(staffId),
    queryFn: function() { return api.get('/staff/' + staffId + '/schedule'); },
    enabled: !!staffId,
    select: function(response) { return response.data || []; },
    ...options,
  });
}

export function useAvailability(salonId, params, options) {
  if (!params) params = {};
  if (!options) options = {};
  return useQuery({
    queryKey: staffKeys.availability(salonId, params.date, params.serviceId),
    queryFn: function() { return api.get('/salons/' + salonId + '/availability', params); },
    enabled: !!salonId && !!params.date,
    select: function(response) { return response.data || []; },
    ...options,
  });
}

// ============ STAFF MUTATIONS ============

export function useCreateStaff() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(data) { return api.post('/staff', data); },
    onSuccess: function(response, variables) {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      toast.success('Team member added successfully');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to add team member');
    },
  });
}

export function useUpdateStaff() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(params) { 
      return api.put('/staff/' + params.id, params.data); 
    },
    onSuccess: function(response, variables) {
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      toast.success('Team member updated successfully');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to update team member');
    },
  });
}

export function useDeleteStaff() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(id) { return api.delete('/staff/' + id); },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      toast.success('Team member removed successfully');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to remove team member');
    },
  });
}

// ============ SCHEDULE MUTATIONS ============

export function useUpdateStaffSchedule() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(params) { 
      return api.put('/staff/' + params.staffId + '/schedule', { schedule: params.schedule }); 
    },
    onSuccess: function(response, variables) {
      queryClient.invalidateQueries({ queryKey: staffKeys.schedule(variables.staffId) });
      toast.success('Schedule updated successfully');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to update schedule');
    },
  });
}

export function useUpdateStaffServices() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function(params) { 
      return api.put('/staff/' + params.staffId + '/services', { services: params.services }); 
    },
    onSuccess: function(response, variables) {
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.staffId) });
      toast.success('Services updated successfully');
    },
    onError: function(error) {
      toast.error(error.message || 'Failed to update services');
    },
  });
}

// ============ COLORS ============

export var STAFF_COLORS = [
  { name: 'blue', hex: '#3b82f6', bg: 'bg-blue-500', light: 'bg-blue-100' },
  { name: 'green', hex: '#22c55e', bg: 'bg-green-500', light: 'bg-green-100' },
  { name: 'purple', hex: '#a855f7', bg: 'bg-purple-500', light: 'bg-purple-100' },
  { name: 'orange', hex: '#f97316', bg: 'bg-orange-500', light: 'bg-orange-100' },
  { name: 'pink', hex: '#ec4899', bg: 'bg-pink-500', light: 'bg-pink-100' },
  { name: 'teal', hex: '#14b8a6', bg: 'bg-teal-500', light: 'bg-teal-100' },
  { name: 'red', hex: '#ef4444', bg: 'bg-red-500', light: 'bg-red-100' },
  { name: 'yellow', hex: '#eab308', bg: 'bg-yellow-500', light: 'bg-yellow-100' },
];

export function getStaffColor(index) {
  return STAFF_COLORS[index % STAFF_COLORS.length];
}

// ============ ROLES ============

export var STAFF_ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Can manage bookings, staff, and reports' },
  { value: 'staff', label: 'Staff', description: 'Can view and manage own appointments' },
  { value: 'receptionist', label: 'Receptionist', description: 'Can manage bookings and clients' },
];

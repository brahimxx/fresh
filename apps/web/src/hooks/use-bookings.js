import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { toast } from 'sonner';

// Query keys
export const bookingKeys = {
  all: ['bookings'],
  lists: () => [...bookingKeys.all, 'list'],
  list: (filters) => [...bookingKeys.lists(), filters],
  details: () => [...bookingKeys.all, 'detail'],
  detail: (id) => [...bookingKeys.details(), id],
  calendar: (salonId, start, end) => [...bookingKeys.all, 'calendar', salonId, start, end],
};

// Fetch bookings for calendar view
export function useCalendarBookings(salonId, startDate, endDate, options = {}) {
  return useQuery({
    queryKey: bookingKeys.calendar(salonId, startDate, endDate),
    queryFn: () => api.get('/bookings', {
      salonId,
      startDate,
      endDate,
    }),
    enabled: !!salonId && !!startDate && !!endDate,
    select: (response) => response.data || [],
    ...options,
  });
}

// Fetch bookings list with filters
export function useBookings(filters = {}, options = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: () => api.get('/bookings', filters),
    select: (response) => ({
      data: response.data || [],
      pagination: response.pagination,
    }),
    ...options,
  });
}

// Fetch single booking
export function useBooking(id, options = {}) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.get('/bookings/' + id),
    enabled: !!id,
    select: (response) => response.data,
    ...options,
  });
}

// Create booking mutation
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.post('/bookings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success('Booking created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });
}

// Update booking mutation
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => {
      var id = params.id;
      var data = params.data;
      return api.put('/bookings/' + id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
      toast.success('Booking updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update booking');
    },
  });
}

// Confirm booking mutation
export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.post('/bookings/' + id + '/confirm'),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success('Booking confirmed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to confirm booking');
    },
  });
}

// Reschedule booking mutation
export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => {
      var id = params.id;
      var data = params.data;
      return api.post('/bookings/' + id + '/reschedule', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
      toast.success('Booking rescheduled');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reschedule booking');
    },
  });
}

// Cancel booking mutation
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.delete('/bookings/' + id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success('Booking cancelled');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel booking');
    },
  });
}

// Mark as no-show mutation
export function useNoShowBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.post('/bookings/' + id + '/no-show'),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success('Booking marked as no-show');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as no-show');
    },
  });
}

// Assign staff mutation
export function useAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => {
      var id = params.id;
      var staffId = params.staffId;
      return api.post('/bookings/' + id + '/assign-staff', { staffId: staffId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
      toast.success('Staff assigned successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign staff');
    },
  });
}

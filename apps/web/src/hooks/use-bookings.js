import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { toast } from "sonner";

// Query keys
export const bookingKeys = {
  all: ["bookings"],
  lists: () => [...bookingKeys.all, "list"],
  list: (filters) => [...bookingKeys.lists(), filters],
  details: () => [...bookingKeys.all, "detail"],
  detail: (id) => [...bookingKeys.details(), id],
  calendar: (salonId, start, end) => [
    ...bookingKeys.all,
    "calendar",
    salonId,
    start,
    end,
  ],
  my: (filter) => [...bookingKeys.all, "my", filter],
};

// Fetch bookings for calendar view
export function useCalendarBookings(salonId, startDate, endDate, options = {}) {
  return useQuery({
    queryKey: bookingKeys.calendar(salonId, startDate, endDate),
    queryFn: () =>
      api.get("/bookings", {
        salonId,
        startDate,
        endDate,
      }),
    enabled: !!salonId && !!startDate && !!endDate,
    select: (response) => response.data?.bookings || [],
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
    ...options,
  });
}

// Fetch user's marketplace bookings (upcoming/past)
export function useMyBookings(filter = "upcoming", options = {}) {
  return useQuery({
    queryKey: bookingKeys.my(filter),
    queryFn: async () => {
      const response = await api.get(`/my/bookings?filter=${filter}`);
      return response.data?.bookings || [];
    },
    ...options,
  });
}

// Fetch bookings list with filters
export function useBookings(filters = {}, options = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: async () => {
      const response = await api.get("/bookings", filters);
      console.log("=== BOOKINGS API RESPONSE ===");
      console.log("Full response:", response);
      console.log("response.success:", response.success);
      console.log("response.data:", response.data);
      console.log("response.data.bookings:", response.data?.bookings);
      return response;
    },
    select: (response) => {
      console.log("=== BOOKINGS SELECT TRANSFORM ===");
      console.log("Input to select:", response);
      const result = {
        data: response.data?.bookings || [],
        pagination: response.data?.pagination || response.pagination,
      };
      console.log("Output from select:", result);
      return result;
    },
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    ...options,
  });
}

// Fetch single booking
export function useBooking(id, options = {}) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.get("/bookings/" + id),
    enabled: !!id,
    select: (response) => response.data,
    ...options,
  });
}

// Create booking mutation
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.post("/bookings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Booking created successfully");
    },
    onError: (error) => {
      // Validation errors (STAFF_UNAVAILABLE, STAFF_ON_LEAVE, CONFLICT) are handled inline in the form
      // Only show toast for unexpected system errors
      if (
        !error.code ||
        (error.code !== "STAFF_UNAVAILABLE" &&
          error.code !== "STAFF_ON_LEAVE" &&
          error.code !== "CONFLICT")
      ) {
        toast.error(error.message || "Failed to create booking");
      }
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
      return api.put("/bookings/" + id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.id),
      });
      toast.success("Booking updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });
}

// Confirm booking mutation
export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.post("/bookings/" + id + "/confirm"),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success("Booking confirmed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to confirm booking");
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
      return api.post("/bookings/" + id + "/reschedule", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.id),
      });
      toast.success("Booking rescheduled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reschedule booking");
    },
  });
}

// Cancel booking mutation
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.delete("/bookings/" + id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success("Booking cancelled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel booking");
    },
  });
}

// Mark as no-show mutation
export function useNoShowBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.post("/bookings/" + id + "/no-show"),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success("Booking marked as no-show");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark as no-show");
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
      return api.post("/bookings/" + id + "/assign-staff", {
        staffId: staffId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(variables.id),
      });
      toast.success("Staff assigned successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign staff");
    },
  });
}

// Delete booking mutation (permanent deletion)
export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.delete("/bookings/" + id + "/permanent"),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      toast.success("Booking deleted permanently");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete booking");
    },
  });
}

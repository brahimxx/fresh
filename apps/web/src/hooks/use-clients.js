import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { toast } from "sonner";

export var clientKeys = {
  all: ["clients"],
  lists: function () {
    return [...clientKeys.all, "list"];
  },
  list: function (filters) {
    return [...clientKeys.lists(), filters];
  },
  detail: function (id) {
    return [...clientKeys.all, "detail", id];
  },
  search: function (query) {
    return [...clientKeys.all, "search", query];
  },
  stats: function (id) {
    return [...clientKeys.all, "stats", id];
  },
  bookings: function (id) {
    return [...clientKeys.all, "bookings", id];
  },
  notes: function (id) {
    return [...clientKeys.all, "notes", id];
  },
};

export function useClientSearch(query, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: clientKeys.search(query),
    queryFn: function () {
      return api.get("/clients", { search: query, limit: 10 });
    },
    enabled: !!(query && query.length >= 2),
    select: function (response) {
      var responseData = response.data || response;
      return responseData.clients || responseData.data || [];
    },
    staleTime: 1000 * 30, // 30 seconds for search results
    ...options,
  });
}

export function useClients(filters, options) {
  if (!filters) filters = {};
  if (!options) options = {};
  return useQuery({
    queryKey: clientKeys.list(filters),
    queryFn: function () {
      return api.get("/clients", filters);
    },
    select: function (response) {
      // API returns { data: { clients: [...], pagination: {...} } }
      var responseData = response.data || response;
      return {
        data: responseData.clients || responseData.data || [],
        pagination: responseData.pagination,
      };
    },
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

export function useClient(id, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: function () {
      return api.get("/clients/" + id);
    },
    enabled: !!id,
    select: function (response) {
      return response.data;
    },
    ...options,
  });
}

export function useCreateClient() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (data) {
      return api.post("/clients", data);
    },
    onSuccess: function (response) {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      toast.success("Client created successfully");
      return response.data;
    },
    onError: function (error) {
      toast.error(error.message || "Failed to create client");
    },
  });
}

export function useUpdateClient() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.put("/clients/" + params.id, params.data);
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success("Client updated successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to update client");
    },
  });
}

export function useDeleteClient() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      var id = params.id || params;
      var salonId = params.salonId || params.salon_id;
      var url = "/clients/" + id;
      if (salonId) url += "?salon_id=" + salonId;
      return api.delete(url);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      toast.success("Client removed successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to remove client");
    },
  });
}

export function useClientStats(clientId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: clientKeys.stats(clientId),
    queryFn: function () {
      return api.get("/clients/" + clientId + "/stats");
    },
    enabled: !!clientId,
    select: function (response) {
      return response.data;
    },
    ...options,
  });
}

export function useClientBookings(clientId, salonId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: clientKeys.bookings(clientId),
    queryFn: function () {
      return api.get("/salons/" + salonId + "/clients/" + clientId);
    },
    enabled: !!clientId && !!salonId,
    select: function (response) {
      return response.data?.bookings || [];
    },
    ...options,
  });
}

export function useClientNotes(clientId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: clientKeys.notes(clientId),
    queryFn: function () {
      return api.get("/clients/" + clientId + "/notes");
    },
    enabled: !!clientId,
    select: function (response) {
      return response.data || [];
    },
    ...options,
  });
}

export function useAddClientNote() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.post("/clients/" + params.clientId + "/notes", {
        content: params.content,
      });
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: clientKeys.notes(variables.clientId),
      });
      toast.success("Note added");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to add note");
    },
  });
}

export function useDeleteClientNote() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.delete(
        "/clients/" + params.clientId + "/notes/" + params.noteId
      );
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: clientKeys.notes(variables.clientId),
      });
      toast.success("Note deleted");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to delete note");
    },
  });
}

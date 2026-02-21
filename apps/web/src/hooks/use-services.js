import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { toast } from "sonner";
import { staffKeys } from "@/hooks/use-staff";

export var serviceKeys = {
  all: ["services"],
  lists: function () {
    return [...serviceKeys.all, "list"];
  },
  list: function (salonId) {
    return [...serviceKeys.lists(), salonId];
  },
  detail: function (id) {
    return [...serviceKeys.all, "detail", id];
  },
  categories: function (salonId) {
    return [...serviceKeys.all, "categories", salonId];
  },
  categoryDetail: function (id) {
    return [...serviceKeys.all, "category", id];
  },
};

// ============ SERVICES ============

export function useServices(salonId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: serviceKeys.list(salonId),
    queryFn: function () {
      return api.get("/salons/" + salonId + "/services");
    },
    enabled: !!salonId,
    select: function (response) {
      var categories = response.data?.categories || [];
      return categories.flatMap(function (cat) {
        return (cat.services || []).map(function (svc) {
          return { ...svc, category_id: cat.id };
        });
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - services don't change often
    ...options,
  });
}

export function useService(serviceId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: serviceKeys.detail(serviceId),
    queryFn: function () {
      return api.get("/services/" + serviceId);
    },
    enabled: !!serviceId,
    select: function (response) {
      return response.data;
    },
    ...options,
  });
}

export function useCreateService() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (data) {
      return api.post("/services", data);
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      // If staff were assigned, invalidate their service caches so StaffServicesTab stays in sync
      if (
        Array.isArray(variables.staff_ids) &&
        variables.staff_ids.length > 0
      ) {
        variables.staff_ids.forEach(function (staffId) {
          queryClient.invalidateQueries({
            queryKey: staffKeys.services(staffId),
          });
        });
      }
      toast.success("Service created successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to create service");
    },
  });
}

export function useUpdateService() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.put("/services/" + params.id, params.data);
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      toast.success("Service updated successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to update service");
    },
  });
}

export function useDeleteService() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (id) {
      return api.delete("/services/" + id);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      toast.success("Service deleted successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to delete service");
    },
  });
}

// ============ CATEGORIES ============

export function useCategories(salonId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: serviceKeys.categories(salonId),
    queryFn: function () {
      return api.get("/salons/" + salonId + "/categories");
    },
    enabled: !!salonId,
    select: function (response) {
      return response.data?.categories || [];
    },
    ...options,
  });
}

export function useCategory(categoryId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: serviceKeys.categoryDetail(categoryId),
    queryFn: function () {
      return api.get("/categories/" + categoryId);
    },
    enabled: !!categoryId,
    select: function (response) {
      return response.data;
    },
    ...options,
  });
}

export function useCreateCategory() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (data) {
      return api.post("/categories", data);
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.categories(variables.salon_id),
      });
      toast.success("Category created successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to create category");
    },
  });
}

export function useUpdateCategory() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.put("/categories/" + params.id, params.data);
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.categoryDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      toast.success("Category updated successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to update category");
    },
  });
}

export function useDeleteCategory() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (id) {
      return api.delete("/categories/" + id);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      toast.success("Category deleted successfully");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to delete category");
    },
  });
}

export function useReorderCategories() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.post("/salons/" + params.salonId + "/categories/reorder", {
        order: params.order,
      });
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.categories(variables.salonId),
      });
    },
    onError: function (error) {
      toast.error(error.message || "Failed to reorder categories");
    },
  });
}

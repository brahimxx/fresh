import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api-client";

// Query keys
export const marketplaceKeys = {
  all: ["marketplace"],
  salons: (filters) => [...marketplaceKeys.all, "salons", filters],
  salon: (id) => [...marketplaceKeys.all, "salon", id],
};

// Fetch featured/searched salons
export function useMarketplaceSalons(filters = {}, options = {}) {
  return useQuery({
    queryKey: marketplaceKeys.salons(filters),
    queryFn: async () => {
      const response = await api.get("/marketplace/salons", filters);
      return response.data || [];
    },
    ...options,
  });
}

// Fetch single salon details (alias for marketplace conventions)
export function useSalonDetails(id, options = {}) {
  return useQuery({
    queryKey: [...marketplaceKeys.salon(id), "details"],
    queryFn: async () => {
      const response = await api.get(`/marketplace/salons/${id}`);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
}

// Fetch salon services
export function useSalonServices(id, options = {}) {
  return useQuery({
    queryKey: [...marketplaceKeys.salon(id), "services"],
    queryFn: async () => {
      const response = await api.get(`/marketplace/salons/${id}/services`);
      return response.data || [];
    },
    enabled: !!id,
    ...options,
  });
}

// Fetch salon staff
export function useSalonStaff(id, options = {}) {
  return useQuery({
    queryKey: [...marketplaceKeys.salon(id), "staff"],
    queryFn: async () => {
      const response = await api.get(`/marketplace/salons/${id}/staff`);
      return response.data || [];
    },
    enabled: !!id,
    ...options,
  });
}

// Fetch salon reviews
export function useSalonReviews(id, options = {}) {
  return useQuery({
    queryKey: [...marketplaceKeys.salon(id), "reviews"],
    queryFn: async () => {
      const response = await api.get(`/marketplace/salons/${id}/reviews`);
      return response.data?.reviews || [];
    },
    enabled: !!id,
    ...options,
  });
}

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

// Fetch single salon details
export function useMarketplaceSalon(id, options = {}) {
  return useQuery({
    queryKey: marketplaceKeys.salon(id),
    queryFn: async () => {
      const response = await api.get(`/marketplace/salons/${id}`);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
}

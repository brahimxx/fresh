import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { toast } from "sonner";

export var galleryKeys = {
  all: function (salonId) {
    return ["salon", salonId, "gallery"];
  },
};

// ============ GALLERY QUERY ============

export function useGallery(salonId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: galleryKeys.all(salonId),
    queryFn: function () {
      return api.get("/salons/" + salonId + "/gallery");
    },
    enabled: !!salonId,
    select: function (response) {
      return response.data?.images || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

// ============ ADD IMAGE ============

export function useAddGalleryImage() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.post("/salons/" + params.salonId + "/gallery", {
        image_url: params.imageUrl,
        display_order: params.displayOrder,
      });
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: galleryKeys.all(variables.salonId),
      });
      toast.success("Image added to gallery");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to add image");
    },
  });
}

// ============ REORDER (OPTIMISTIC) ============

export function useReorderGallery() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.put("/salons/" + params.salonId + "/gallery", {
        items: params.items,
      });
    },
    // Optimistic update — instantly reorder in cache to prevent UI jitter
    onMutate: async function (variables) {
      var queryKey = galleryKeys.all(variables.salonId);

      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKey });

      // Snapshot the previous cache value for rollback
      var previousData = queryClient.getQueryData(queryKey);

      // Optimistically update the cache with the new order
      queryClient.setQueryData(queryKey, function (old) {
        if (!old || !old.data?.images) return old;

        // Build a map of new display orders
        var orderMap = {};
        variables.items.forEach(function (item) {
          orderMap[item.id] = item.display_order;
        });

        // Apply new order and sort
        var updatedImages = old.data.images
          .map(function (img) {
            return {
              ...img,
              displayOrder:
                orderMap[img.id] !== undefined
                  ? orderMap[img.id]
                  : img.displayOrder,
            };
          })
          .sort(function (a, b) {
            return a.displayOrder - b.displayOrder;
          });

        return {
          ...old,
          data: { ...old.data, images: updatedImages },
        };
      });

      return { previousData: previousData };
    },
    onError: function (err, variables, context) {
      // Rollback to the snapshot on error
      if (context?.previousData) {
        queryClient.setQueryData(
          galleryKeys.all(variables.salonId),
          context.previousData
        );
      }
      toast.error(err.message || "Failed to reorder gallery");
    },
    onSettled: function (data, error, variables) {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: galleryKeys.all(variables.salonId),
      });
    },
  });
}

// ============ DELETE IMAGE ============

export function useDeleteGalleryImage() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params) {
      return api.delete(
        "/salons/" + params.salonId + "/gallery/" + params.imageId
      );
    },
    onSuccess: function (response, variables) {
      queryClient.invalidateQueries({
        queryKey: galleryKeys.all(variables.salonId),
      });
      toast.success("Image removed from gallery");
    },
    onError: function (error) {
      toast.error(error.message || "Failed to delete image");
    },
  });
}

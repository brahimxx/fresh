import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

var closureKeys = {
  all: ['salon-closures'],
  list: function (salonId) { return ['salon-closures', salonId]; },
};

// List closures for a salon
export function useSalonClosures(salonId, options) {
  if (!options) options = {};
  return useQuery({
    queryKey: closureKeys.list(salonId),
    queryFn: async function () {
      var url = '/api/salons/' + salonId + '/closures?includePast=' + (options.includePast ? 'true' : 'false');
      var res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch closures');
      var json = await res.json();
      return json.data?.closures || [];
    },
    enabled: !!salonId,
  });
}

// Create a closure
export function useCreateClosure() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: async function (params) {
      var res = await fetch('/api/salons/' + params.salonId + '/closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: params.date, reason: params.reason }),
      });
      var json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create closure');
      return json.data;
    },
    onSuccess: function (_, variables) {
      queryClient.invalidateQueries({ queryKey: closureKeys.list(variables.salonId) });
    },
  });
}

// Delete a closure
export function useDeleteClosure() {
  var queryClient = useQueryClient();
  return useMutation({
    mutationFn: async function (params) {
      var res = await fetch('/api/salons/' + params.salonId + '/closures/' + params.closureId, {
        method: 'DELETE',
      });
      var json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete closure');
      return json.data;
    },
    onSuccess: function (_, variables) {
      queryClient.invalidateQueries({ queryKey: closureKeys.list(variables.salonId) });
    },
  });
}
